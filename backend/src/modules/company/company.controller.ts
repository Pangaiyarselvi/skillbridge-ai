import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";
import { sendOfferLetterEmail } from "../../utils/mailer";

async function getCompany(userId: string) {
  return prisma.company.findUniqueOrThrow({ where: { userId } });
}

export async function getProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.findUniqueOrThrow({ where: { userId: req.user!.userId } });
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    res.json({ success: true, data: await prisma.company.update({ where: { id: company.id }, data: req.body }) });
  } catch (err) { next(err); }
}

export async function listMyOpportunities(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const data = await prisma.opportunity.findMany({
      where: { companyId: company.id },
      include: { requiredSkills: { include: { skill: true } }, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const { skillIds, skillNames, ...rest } = req.body; // skillIds: [{ skillId, weight }] OR skillNames: string[]

    let skillCreates: { skillId: string; weight: number }[] = (skillIds ?? []).map((s: any) => ({
      skillId: s.skillId,
      weight: s.weight ?? 1,
    }));

    if (Array.isArray(skillNames) && skillNames.length > 0) {
      const resolved = await Promise.all(
        skillNames.map(async (name: string) => {
          const cleanName = name.trim();
          const existing = await prisma.skill.findFirst({
            where: { name: { equals: cleanName, mode: "insensitive" } },
          });
          if (existing) return existing;
          return prisma.skill.create({ data: { name: cleanName } });
        })
      );
      skillCreates = [...skillCreates, ...resolved.map((s) => ({ skillId: s.id, weight: 1 }))];
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        ...rest,
        companyId: company.id,
        requiredSkills: { create: skillCreates },
      },
    });

    const { indexOpportunity } = await import("../ai/vectorStore.service.js");
    indexOpportunity(opportunity as any).catch(() => {}); // fire-and-forget vector indexing

    res.status(201).json({ success: true, data: opportunity });
  } catch (err) { next(err); }
}

export async function updateOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const data = await prisma.opportunity.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.opportunity.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function listApplicants(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { rankCandidatesForOpportunity } = await import("../ai/matching.service.js");
    const ranked = await rankCandidatesForOpportunity(req.params.id);
    res.json({ success: true, data: ranked });
  } catch (err) { next(err); }
}

export async function updateApplicationStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body;
    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status, statusHistory: { create: { status, note } } },
    });

    await prisma.notification.create({
      data: {
        userId: (await prisma.student.findUniqueOrThrow({ where: { id: application.studentId } })).userId,
        type: "APPLICATION_UPDATE",
        title: "Application status updated",
        body: `Your application status changed to ${status}`,
      },
    });

    // If status changed to OFFERED: trigger event-driven offer generation, student notification, and automated email delivery
    if (status === "OFFERED") {
      const fullApp = await prisma.application.findUnique({
        where: { id: application.id },
        include: {
          student: { include: { user: true } },
          opportunity: { include: { company: true } },
        },
      });

      if (fullApp && fullApp.student?.user?.email) {
        const salary = req.body.salaryPackage || fullApp.opportunity.stipendOrSalary || "Competitive Package";
        const loc = req.body.location || fullApp.opportunity.location || (fullApp.opportunity.isRemote ? "Remote" : "Hybrid");

        // 1. Automatically generate or retrieve the offer letter in database
        let offer = await prisma.offerLetter.findFirst({
          where: { studentId: fullApp.studentId, opportunityId: fullApp.opportunityId },
        });

        if (!offer) {
          offer = await prisma.offerLetter.create({
            data: {
              companyId: fullApp.opportunity.companyId,
              studentId: fullApp.studentId,
              opportunityId: fullApp.opportunityId,
              jobRole: fullApp.opportunity.title,
              salaryPackage: salary,
              location: loc,
              documentUrl: req.body.documentUrl || null,
              status: "PENDING",
              letterContent: `OFFICIAL OFFER OF EMPLOYMENT\n\nDear ${fullApp.student.fullName},\n\nWe are pleased to inform you that you have received an offer from ${fullApp.opportunity.company.name} for the position of ${fullApp.opportunity.title}.\n\nPackage: ${salary}\nLocation: ${loc}\n\nPlease log in to SkillBridge AI to view and download your offer letter.\n\nBest Regards,\nSkillBridge AI Team`,
            },
          });
          console.log(`[Event:OFFERED] Created new offer letter record: ${offer.id}`);
        } else {
          console.log(`[Event:OFFERED] Retrieved existing offer letter record: ${offer.id}`);
        }

        // 2. Automatically generate Communication record in Student Portal Inbox
        const existingComm = await prisma.communication.findFirst({
          where: { offerLetterId: offer.id },
        });
        if (!existingComm) {
          await prisma.communication.create({
            data: {
              senderId: fullApp.opportunity.company.userId,
              recipientId: fullApp.student.userId,
              category: "OFFER_LETTER",
              priority: "URGENT",
              subject: `Congratulations! Official Job Offer: ${fullApp.opportunity.title} at ${fullApp.opportunity.company.name}`,
              body: `Dear ${fullApp.student.fullName},\n\nWe are pleased to inform you that you have received an offer from ${fullApp.opportunity.company.name} for the position of ${fullApp.opportunity.title} with a package of ${salary}.\n\nPlease review your complete offer letter in your Offer Center to accept or decline.\n\nBest Regards,\nSkillBridge AI Team`,
              offerLetterId: offer.id,
              metadata: {
                jobRole: fullApp.opportunity.title,
                salaryPackage: salary,
                offerId: offer.id,
              },
            },
          });
        }

        // 3. Automatically Notify Student with direct link to Student Portal Offer Center
        await prisma.notification.create({
          data: {
            userId: fullApp.student.userId,
            type: "APPLICATION_UPDATE",
            title: `🏆 New Job Offer Received: ${fullApp.opportunity.company.name}`,
            body: `You have received an offer for ${fullApp.opportunity.title} (${salary}). Click to view and download!`,
            link: "/student/offers",
          },
        });

        // 4. Automatically send email to student's registered email address with PDF attachment if available
        sendOfferLetterEmail({
          to: fullApp.student.user.email,
          studentName: fullApp.student.fullName,
          companyName: fullApp.opportunity.company.name,
          companyLogo: fullApp.opportunity.company.logoUrl,
          jobRole: fullApp.opportunity.title,
          salaryPackage: salary,
          location: loc,
          documentUrl: req.body.documentUrl || offer.documentUrl,
          offerId: offer.id,
        })
          .then((res) => {
            if (res.success) {
              console.log(`[Event:OFFERED] ✅ Offer letter email successfully delivered to ${fullApp.student.user.email} (MessageId: ${res.messageId})`);
            } else {
              console.warn(`[Event:OFFERED] ⚠️ Offer letter email failed for ${fullApp.student.user.email}: ${res.reason || res.error}`);
            }
          })
          .catch((err) => {
            console.error(`[Event:OFFERED] ❌ Error dispatching offer email to ${fullApp.student.user.email}:`, err?.message || err);
          });
      }
    }

    res.json({ success: true, data: application });
  } catch (err) { next(err); }
}

export async function listExpectations(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    res.json({ success: true, data: await prisma.industryExpectation.findMany({ where: { companyId: company.id } }) });
  } catch (err) { next(err); }
}
export async function createExpectation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    res.status(201).json({ success: true, data: await prisma.industryExpectation.create({ data: { ...req.body, companyId: company.id } }) });
  } catch (err) { next(err); }
}
export async function updateExpectation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await prisma.industryExpectation.update({ where: { id: req.params.id }, data: req.body }) });
  } catch (err) { next(err); }
}
export async function deleteExpectation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.industryExpectation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function listAllApplicants(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const { opportunityId, status } = req.query as Record<string, string>;

    const applicants = await prisma.application.findMany({
      where: {
        opportunity: { companyId: company.id },
        ...(opportunityId && { opportunityId }),
        ...(status && { status: status as any }),
      },
      include: {
        opportunity: { select: { id: true, title: true, type: true } },
        student: {
          select: {
            id: true,
            fullName: true,
            department: true,
            branch: true,
            cgpa: true,
            currentSemester: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    res.json({ success: true, data: applicants });
  } catch (err) {
    next(err);
  }
}
