import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";

export async function listUsers(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { role, search } = req.query as Record<string, string>;
    const data = await prisma.user.findMany({
      where: { ...(role && { role: role as any }), ...(search && { email: { contains: search, mode: "insensitive" } }) },
      select: { id: true, email: true, role: true, isActive: true, isEmailVerified: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function setUserActiveStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { isActive } = req.body;
    const data = await prisma.user.update({ where: { id: req.params.id }, data: { isActive } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function listCompanies(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as Record<string, string>;
    const data = await prisma.company.findMany({
      where: status ? { verificationStatus: status as any } : {},
      include: { _count: { select: { opportunities: true } } },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function verifyCompany(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body; // VERIFIED | REJECTED
    const data = await prisma.company.update({ where: { id: req.params.id }, data: { verificationStatus: status } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function listColleges(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as Record<string, string>;
    const data = await prisma.college.findMany({
      where: status ? { verificationStatus: status as any } : {},
      include: { _count: { select: { students: true } } },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function verifyCollege(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const data = await prisma.college.update({ where: { id: req.params.id }, data: { verificationStatus: status } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function platformAnalytics(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const [totalStudents, totalCompanies, totalColleges, totalOpportunities, totalApplications, hiredCount] = await Promise.all([
      prisma.student.count(),
      prisma.company.count(),
      prisma.college.count(),
      prisma.opportunity.count({ where: { isActive: true } }),
      prisma.application.count(),
      prisma.application.count({ where: { status: "HIRED" } }),
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCompanies,
        totalColleges,
        totalOpportunities,
        totalApplications,
        hiredCount,
        overallPlacementRate: totalStudents ? Math.round((hiredCount / totalStudents) * 1000) / 10 : 0,
      },
    });
  } catch (err) { next(err); }
}

export async function recentActivity(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const [recentUsers, recentApplications, recentOpportunities] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { email: true, role: true, createdAt: true } }),
      prisma.application.findMany({ orderBy: { appliedAt: "desc" }, take: 10, include: { student: true, opportunity: true } }),
      prisma.opportunity.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { company: true } }),
    ]);
    res.json({ success: true, data: { recentUsers, recentApplications, recentOpportunities } });
  } catch (err) { next(err); }
}
