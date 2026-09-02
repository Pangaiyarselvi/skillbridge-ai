import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";

async function getCollege(userId: string) {
  return prisma.college.findUniqueOrThrow({ where: { userId } });
}

export async function getProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await prisma.college.findUniqueOrThrow({ where: { userId: req.user!.userId } }) });
  } catch (err) { next(err); }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    res.json({ success: true, data: await prisma.college.update({ where: { id: college.id }, data: req.body }) });
  } catch (err) { next(err); }
}

export async function listStudents(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const { department } = req.query as Record<string, string>;
    const data = await prisma.student.findMany({
      where: { collegeId: college.id, ...(department && { department }) },
      include: { skills: { include: { skill: true } } },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function placementAnalytics(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const students = await prisma.student.findMany({ where: { collegeId: college.id }, select: { id: true } });
    const studentIds = students.map((s) => s.id);

    const totalStudents = studentIds.length;
    const hired = await prisma.application.count({ where: { studentId: { in: studentIds }, status: "HIRED" } });
    const applied = await prisma.application.count({ where: { studentId: { in: studentIds } } });

    const byStatus = await prisma.application.groupBy({
      by: ["status"],
      where: { studentId: { in: studentIds } },
      _count: true,
    });

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
  } catch (err) { next(err); }
}

export async function internshipAnalytics(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const studentIds = (await prisma.student.findMany({ where: { collegeId: college.id }, select: { id: true } })).map((s) => s.id);

    const internshipApps = await prisma.application.findMany({
      where: { studentId: { in: studentIds }, opportunity: { type: "INTERNSHIP" } },
      include: { opportunity: true },
    });

    res.json({
      success: true,
      data: {
        totalInternshipApplications: internshipApps.length,
        activeInternships: internshipApps.filter((a) => a.status === "HIRED" || a.status === "OFFERED").length,
      },
    });
  } catch (err) { next(err); }
}

export async function skillGapAnalytics(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    const students = await prisma.student.findMany({
      where: { collegeId: college.id },
      include: { skills: { include: { skill: true } } },
    });

    // Aggregate most common missing skills across latest SkillGapReports
    const reports = await prisma.skillGapReport.findMany({
      where: { studentId: { in: students.map((s) => s.id) } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

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
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
}

export async function listPartnerships(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    res.json({ success: true, data: await prisma.industryPartnership.findMany({ where: { collegeId: college.id }, include: { company: true } }) });
  } catch (err) { next(err); }
}
export async function createPartnership(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const college = await getCollege(req.user!.userId);
    res.status(201).json({ success: true, data: await prisma.industryPartnership.create({ data: { ...req.body, collegeId: college.id } }) });
  } catch (err) { next(err); }
}
export async function updatePartnership(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await prisma.industryPartnership.update({ where: { id: req.params.id }, data: req.body }) });
  } catch (err) { next(err); }
}
export async function deletePartnership(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.industryPartnership.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
