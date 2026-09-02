import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";

async function getCompany(userId: string) {
  return prisma.company.findUniqueOrThrow({ where: { userId } });
}

export async function getProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.findUniqueOrThrow({ where: { userId: req.user!.userId } });
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const { name, logoUrl, website, industry, description, hqLocation } = req.body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (logoUrl !== undefined) dataToUpdate.logoUrl = logoUrl || null;
    if (website !== undefined) dataToUpdate.website = website || null;
    if (industry !== undefined) dataToUpdate.industry = industry || null;
    if (description !== undefined) dataToUpdate.description = description || null;
    if (hqLocation !== undefined) dataToUpdate.hqLocation = hqLocation || null;

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: dataToUpdate,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function listMyOpportunities(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const data = await prisma.opportunity.findMany({
      where: { companyId: company.id },
      include: {
        requiredSkills: { include: { skill: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const {
      title,
      type,
      description,
      location,
      isRemote,
      stipendOrSalary,
      duration,
      openings,
      minCgpa,
      eligibleBranches,
      deadline,
      skillIds,
      skillNames,
    } = req.body;

    if (!title || !description || !type) {
      throw new AppError("Title, description, and type are required", 400);
    }

    let skillCreates: { skillId: string; weight: number }[] = (skillIds ?? []).map((s: any) => ({
      skillId: s.skillId,
      weight: s.weight ?? 1,
    }));

    if (Array.isArray(skillNames) && skillNames.length > 0) {
      const resolved = await Promise.all(
        skillNames.map((name: string) =>
          prisma.skill.upsert({ where: { name: name.trim() }, update: {}, create: { name: name.trim() } })
        )
      );
      skillCreates = [...skillCreates, ...resolved.map((s) => ({ skillId: s.id, weight: 1 }))];
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        title: title.trim(),
        type,
        description,
        location: location || null,
        isRemote: Boolean(isRemote),
        stipendOrSalary: stipendOrSalary || null,
        duration: duration || null,
        openings: Number(openings) || 1,
        minCgpa: minCgpa ? Number(minCgpa) : null,
        eligibleBranches: Array.isArray(eligibleBranches) ? eligibleBranches : [],
        deadline: deadline ? new Date(deadline) : null,
        companyId: company.id,
        requiredSkills: { create: skillCreates },
      },
    });

    const { indexOpportunity } = await import("../ai/vectorStore.service");
    indexOpportunity(opportunity as any).catch(() => {}); // fire-and-forget vector indexing

    res.status(201).json({ success: true, data: opportunity });
  } catch (err) {
    next(err);
  }
}

export async function updateOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const existing = await prisma.opportunity.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) throw new AppError("Opportunity not found", 404);

    const {
      title,
      type,
      description,
      location,
      isRemote,
      stipendOrSalary,
      duration,
      openings,
      minCgpa,
      eligibleBranches,
      deadline,
      isActive,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (type !== undefined) data.type = type;
    if (description !== undefined) data.description = description;
    if (location !== undefined) data.location = location || null;
    if (isRemote !== undefined) data.isRemote = Boolean(isRemote);
    if (stipendOrSalary !== undefined) data.stipendOrSalary = stipendOrSalary || null;
    if (duration !== undefined) data.duration = duration || null;
    if (openings !== undefined) data.openings = Number(openings) || 1;
    if (minCgpa !== undefined) data.minCgpa = minCgpa ? Number(minCgpa) : null;
    if (eligibleBranches !== undefined) data.eligibleBranches = Array.isArray(eligibleBranches) ? eligibleBranches : [];
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.opportunity.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const existing = await prisma.opportunity.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) throw new AppError("Opportunity not found", 404);

    await prisma.opportunity.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listApplicants(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const opp = await prisma.opportunity.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!opp) throw new AppError("Opportunity not found", 404);

    const { rankCandidatesForOpportunity } = await import("../ai/matching.service");
    const ranked = await rankCandidatesForOpportunity(req.params.id);
    res.json({ success: true, data: ranked });
  } catch (err) {
    next(err);
  }
}

export async function updateApplicationStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const { status, note } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { opportunity: true },
    });

    if (!application || application.opportunity.companyId !== company.id) {
      throw new AppError("Application not found", 404);
    }

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: { status, statusHistory: { create: { status, note } } },
    });

    try {
      const student = await prisma.student.findUnique({ where: { id: application.studentId } });
      if (student) {
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: "APPLICATION_UPDATE",
            title: "Application status updated",
            body: `Your application status for "${application.opportunity.title}" changed to ${status}`,
          },
        });
      }
    } catch {
      // Non-blocking notification creation
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function listExpectations(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    res.json({ success: true, data: await prisma.industryExpectation.findMany({ where: { companyId: company.id } }) });
  } catch (err) {
    next(err);
  }
}

export async function createExpectation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const { title, requiredSkills, hiringRoadmap, interviewPattern, certificationRequirements, industryTrends } = req.body;
    if (!title) throw new AppError("Title is required", 400);

    const data = await prisma.industryExpectation.create({
      data: {
        title: title.trim(),
        requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
        hiringRoadmap: hiringRoadmap || null,
        interviewPattern: interviewPattern || null,
        certificationRequirements: Array.isArray(certificationRequirements) ? certificationRequirements : [],
        industryTrends: industryTrends || null,
        companyId: company.id,
      },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateExpectation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const existing = await prisma.industryExpectation.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) throw new AppError("Expectation not found", 404);

    const { title, requiredSkills, hiringRoadmap, interviewPattern, certificationRequirements, industryTrends } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (requiredSkills !== undefined) data.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : [];
    if (hiringRoadmap !== undefined) data.hiringRoadmap = hiringRoadmap || null;
    if (interviewPattern !== undefined) data.interviewPattern = interviewPattern || null;
    if (certificationRequirements !== undefined) data.certificationRequirements = Array.isArray(certificationRequirements) ? certificationRequirements : [];
    if (industryTrends !== undefined) data.industryTrends = industryTrends || null;

    const updated = await prisma.industryExpectation.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteExpectation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const company = await getCompany(req.user!.userId);
    const existing = await prisma.industryExpectation.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) throw new AppError("Expectation not found", 404);

    await prisma.industryExpectation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

