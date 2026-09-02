import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";

async function getCollege(userId: string) {
  return prisma.college.findUniqueOrThrow({ where: { userId } });
}

export async function getProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json({
      success: true,
      data: await prisma.college.findUniqueOrThrow({ where: { userId: req.user!.userId } }),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const { name, code, logoUrl, address, affiliatedUniversity } = req.body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (code !== undefined) dataToUpdate.code = code || null;
    if (logoUrl !== undefined) dataToUpdate.logoUrl = logoUrl || null;
    if (address !== undefined) dataToUpdate.address = address || null;
    if (affiliatedUniversity !== undefined) dataToUpdate.affiliatedUniversity = affiliatedUniversity || null;

    const updated = await prisma.college.update({
      where: { id: college.id },
      data: dataToUpdate,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function listStudents(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const { department } = req.query as Record<string, string>;
    const data = await prisma.student.findMany({
      where: { collegeId: college.id, ...(department && { department }) },
      include: { skills: { include: { skill: true } } },
      orderBy: { fullName: "asc" },
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function placementAnalytics(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const students = await prisma.student.findMany({ where: { collegeId: college.id }, select: { id: true } });
    const studentIds = students.map((s) => s.id);

    const totalStudents = studentIds.length;
    const hired = totalStudents > 0
      ? await prisma.application.count({ where: { studentId: { in: studentIds }, status: "HIRED" } })
      : 0;
    const applied = totalStudents > 0
      ? await prisma.application.count({ where: { studentId: { in: studentIds } } })
      : 0;

    const byStatus = totalStudents > 0
      ? await prisma.application.groupBy({
          by: ["status"],
          where: { studentId: { in: studentIds } },
          _count: true,
        })
      : [];

    res.json({
      success: true,
      data: {
        totalStudents,
        studentsHired: hired,
        placementRate: totalStudents ? Math.round((hired / totalStudents) * 1000) / 10 : 0,
        totalApplications: applied,
        statusBreakdown: byStatus,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function internshipAnalytics(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const studentIds = (await prisma.student.findMany({ where: { collegeId: college.id }, select: { id: true } })).map((s) => s.id);

    const internshipApps = studentIds.length > 0
      ? await prisma.application.findMany({
          where: { studentId: { in: studentIds }, opportunity: { type: "INTERNSHIP" } },
          include: { opportunity: true },
        })
      : [];

    res.json({
      success: true,
      data: {
        totalInternshipApplications: internshipApps.length,
        activeInternships: internshipApps.filter((a) => a.status === "HIRED" || a.status === "OFFERED").length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function skillGapAnalytics(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const students = await prisma.student.findMany({
      where: { collegeId: college.id },
      include: { skills: { include: { skill: true } } },
    });

    const studentIds = students.map((s) => s.id);

    // Aggregate most common missing skills across latest SkillGapReports
    const reports = studentIds.length > 0
      ? await prisma.skillGapReport.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [];

    const missingSkillFreq: Record<string, number> = {};
    for (const report of reports) {
      for (const skill of report.missingSkills) {
        missingSkillFreq[skill] = (missingSkillFreq[skill] ?? 0) + 1;
      }
    }

    const topMissingSkills = Object.entries(missingSkillFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    res.json({ success: true, data: { topMissingSkills, studentsAnalyzed: reports.length } });
  } catch (err) {
    next(err);
  }
}

export async function departmentPerformance(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const grouped = await prisma.student.groupBy({
      by: ["department"],
      where: { collegeId: college.id },
      _avg: { placementReadinessScore: true, cgpa: true },
      _count: true,
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
}

export async function listPartnerships(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    res.json({
      success: true,
      data: await prisma.industryPartnership.findMany({
        where: { collegeId: college.id },
        include: { company: true },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function createPartnership(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const { title, type, description, startDate, endDate, companyId } = req.body;
    if (!title || !type) throw new AppError("Title and type are required", 400);

    const data = await prisma.industryPartnership.create({
      data: {
        title: title.trim(),
        type,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        companyId: companyId || null,
        collegeId: college.id,
      },
      include: { company: true },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePartnership(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const existing = await prisma.industryPartnership.findFirst({
      where: { id: req.params.id, collegeId: college.id },
    });
    if (!existing) throw new AppError("Partnership not found", 404);

    const { title, type, description, startDate, endDate, companyId } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (type !== undefined) data.type = type;
    if (description !== undefined) data.description = description || null;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (companyId !== undefined) data.companyId = companyId || null;

    const updated = await prisma.industryPartnership.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deletePartnership(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const existing = await prisma.industryPartnership.findFirst({
      where: { id: req.params.id, collegeId: college.id },
    });
    if (!existing) throw new AppError("Partnership not found", 404);

    await prisma.industryPartnership.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

