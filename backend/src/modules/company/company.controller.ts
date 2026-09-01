import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";

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
        skillNames.map((name: string) =>
          prisma.skill.upsert({ where: { name }, update: {}, create: { name } })
        )
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

    const { indexOpportunity } = await import("../ai/vectorStore.service");
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
    const { rankCandidatesForOpportunity } = await import("../ai/matching.service");
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
