import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";

export async function listOffers(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { role, userId } = req.user!;
    let offers: any[] = [];

    if (role === "STUDENT") {
      const student = await prisma.student.findUniqueOrThrow({ where: { userId } });
      offers = await prisma.offerLetter.findMany({
        where: { studentId: student.id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              hqLocation: true,
              website: true,
              verificationStatus: true,
            },
          },
          opportunity: {
            select: {
              id: true,
              title: true,
              type: true,
              location: true,
              isRemote: true,
            },
          },
          communication: {
            select: {
              id: true,
              createdAt: true,
              isRead: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "COMPANY") {
      const company = await prisma.company.findUniqueOrThrow({ where: { userId } });
      offers = await prisma.offerLetter.findMany({
        where: { companyId: company.id },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              department: true,
              branch: true,
              cgpa: true,
              graduationYear: true,
              user: { select: { email: true } },
            },
          },
          opportunity: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "ADMIN" || role === "COLLEGE") {
      offers = await prisma.offerLetter.findMany({
        include: {
          company: { select: { id: true, name: true, logoUrl: true } },
          student: { select: { id: true, fullName: true, department: true } },
          opportunity: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Auto-check expired offers
    const now = new Date();
    offers = offers.map((offer) => {
      if (offer.status === "PENDING" && offer.validUntil && new Date(offer.validUntil) < now) {
        return { ...offer, status: "EXPIRED" };
      }
      return offer;
    });

    res.json({ success: true, data: offers });
  } catch (err) {
    next(err);
  }
}

export async function getOffer(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { role, userId } = req.user!;

    const offer = await prisma.offerLetter.findUniqueOrThrow({
      where: { id },
      include: {
        company: true,
        opportunity: true,
        student: {
          include: {
            user: { select: { email: true } },
            college: true,
          },
        },
        communication: true,
      },
    });

    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (offer.studentId !== student?.id) {
        throw new AppError("You are not authorized to view this offer letter", 403);
      }
    } else if (role === "COMPANY") {
      const company = await prisma.company.findUnique({ where: { userId } });
      if (offer.companyId !== company?.id) {
        throw new AppError("You are not authorized to view this offer letter", 403);
      }
    }

    res.json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
}

export async function createOffer(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.findUniqueOrThrow({ where: { userId: req.user!.userId } });
    const {
      studentId,
      opportunityId,
      jobRole,
      salaryPackage,
      location,
      joiningDate,
      validUntil,
      letterContent,
      documentUrl,
      sendEmail = true,
      customSubject,
      customMessage,
    } = req.body;

    if (!studentId || !jobRole || !salaryPackage) {
      throw new AppError("Student, Job Role, and Salary Package are required", 400);
    }

    const student = await prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { user: true },
    });

    // Default formal offer letter content if not provided
    const content =
      letterContent ||
      `OFFICIAL OFFER OF EMPLOYMENT\n\nDear ${student.fullName},\n\nWe are pleased to extend an offer of employment for the position of ${jobRole} at ${company.name}.\n\n1. Compensation: ${salaryPackage}\n2. Location: ${location || "Hybrid / Bengaluru HQ"}\n3. Anticipated Joining Date: ${joiningDate ? new Date(joiningDate).toLocaleDateString() : "To be mutually agreed"}\n4. Acceptance Deadline: ${validUntil ? new Date(validUntil).toLocaleDateString() : "Within 7 business days"}\n\nWe were deeply impressed with your technical capabilities and portfolio demonstrated on SkillBridge AI. Welcome aboard!\n\nAuthorized Signatory,\nHuman Resources Division\n${company.name}`;

    const offer = await prisma.offerLetter.create({
      data: {
        companyId: company.id,
        studentId,
        opportunityId: opportunityId || null,
        jobRole,
        salaryPackage,
        location: location || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        status: "PENDING",
        letterContent: content,
        documentUrl: documentUrl || null,
      },
    });

    // If linked to an application, update application status to OFFERED
    if (opportunityId) {
      const appRecord = await prisma.application.findFirst({
        where: { studentId, opportunityId },
      });
      if (appRecord) {
        await prisma.application.update({
          where: { id: appRecord.id },
          data: {
            status: "OFFERED",
            statusHistory: {
              create: {
                status: "OFFERED",
                note: `Formal offer issued for ${jobRole} (${salaryPackage})`,
              },
            },
          },
        });
      }
    }

    // Automatically generate rich Communication and Notification
    if (sendEmail) {
      const subject = customSubject || `Congratulations! Official Job Offer: ${jobRole} at ${company.name}`;
      const body =
        customMessage ||
        `Dear ${student.fullName},\n\nWe are thrilled to present you with a formal offer of employment for the ${jobRole} role at ${company.name} with an annual package of ${salaryPackage}.\n\nPlease review your complete offer letter document in your Offer Center to accept or decline before the deadline.\n\nWarm regards,\n${company.name}`;

      const comm = await prisma.communication.create({
        data: {
          senderId: req.user!.userId,
          recipientId: student.userId,
          category: "OFFER_LETTER",
          priority: "URGENT",
          subject,
          body,
          offerLetterId: offer.id,
          attachments: [
            {
              name: `Offer_Letter_${company.name.replace(/\s+/g, "_")}_${jobRole.replace(/\s+/g, "_")}.pdf`,
              url: documentUrl || "/documents/sample_offer.pdf",
              size: "245 KB",
              type: "application/pdf",
            },
          ],
          metadata: {
            jobRole,
            salaryPackage,
            offerId: offer.id,
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: student.userId,
          type: "APPLICATION_UPDATE",
          title: `🏆 New Job Offer Received: ${company.name}`,
          body: `You have received an offer for ${jobRole} (${salaryPackage}). Click to review!`,
          link: "/student/offers",
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Offer letter issued and communicated successfully",
      data: offer,
    });
  } catch (err) {
    next(err);
  }
}

export async function respondToOffer(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.userId } });
    const { id } = req.params;
    const { action, declineReason } = req.body; // action: "ACCEPTED" | "DECLINED"

    if (action !== "ACCEPTED" && action !== "DECLINED") {
      throw new AppError("Invalid offer response action. Must be ACCEPTED or DECLINED", 400);
    }

    const offer = await prisma.offerLetter.findUniqueOrThrow({
      where: { id },
      include: { company: true },
    });

    if (offer.studentId !== student.id) {
      throw new AppError("You are not authorized to respond to this offer", 403);
    }

    if (offer.status !== "PENDING") {
      throw new AppError(`Offer has already been ${offer.status.toLowerCase()}`, 400);
    }

    const updated = await prisma.offerLetter.update({
      where: { id },
      data: {
        status: action,
        declineReason: action === "DECLINED" ? declineReason || "Candidate declined offer" : null,
        acceptedAt: action === "ACCEPTED" ? new Date() : null,
        declinedAt: action === "DECLINED" ? new Date() : null,
      },
    });

    // Update application if associated
    if (offer.opportunityId) {
      const appRecord = await prisma.application.findFirst({
        where: { studentId: student.id, opportunityId: offer.opportunityId },
      });
      if (appRecord) {
        await prisma.application.update({
          where: { id: appRecord.id },
          data: {
            status: action === "ACCEPTED" ? "HIRED" : "REJECTED",
            statusHistory: {
              create: {
                status: action === "ACCEPTED" ? "HIRED" : "REJECTED",
                note: `Candidate ${action.toLowerCase()} the formal offer letter.`,
              },
            },
          },
        });
      }
    }

    // Notify company
    await prisma.notification.create({
      data: {
        userId: offer.company.userId,
        type: "APPLICATION_UPDATE",
        title: action === "ACCEPTED" ? "🎉 Offer Accepted!" : "Offer Declined",
        body: `${student.fullName} has ${action.toLowerCase()} the offer for ${offer.jobRole}.`,
        link: "/company/communications",
      },
    });

    res.json({
      success: true,
      message: `Offer successfully ${action.toLowerCase()}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
