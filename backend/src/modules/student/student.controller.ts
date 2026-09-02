import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";
import { uploadBuffer } from "../../config/cloudinary";
import { AppError } from "../../middlewares/errorHandler";

async function getStudent(userId: string) {
  return prisma.student.findUniqueOrThrow({ where: { userId } });
}

export async function getProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.findUniqueOrThrow({
      where: { userId: req.user!.userId },
      include: { skills: { include: { skill: true } }, projects: true, certificates: true, college: true },
    });
    res.json({ success: true, data: student });
  } catch (err) { next(err); }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const updated = await prisma.student.update({ where: { id: student.id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function uploadResume(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);
    const student = await getStudent(req.user!.userId);
    const url = await uploadBuffer(req.file.buffer, "resumes", "raw");
    await prisma.student.update({ where: { id: student.id }, data: { resumeUrl: url } });
    res.json({ success: true, data: { resumeUrl: url } });
  } catch (err) { next(err); }
}

export async function uploadAvatar(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);
    const student = await getStudent(req.user!.userId);
    const url = await uploadBuffer(req.file.buffer, "avatars", "image");
    await prisma.student.update({ where: { id: student.id }, data: { avatarUrl: url } });
    res.json({ success: true, data: { avatarUrl: url } });
  } catch (err) { next(err); }
}

// ---- Skills ----
export async function listSkills(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const skills = await prisma.studentSkill.findMany({ where: { studentId: student.id }, include: { skill: true } });
    res.json({ success: true, data: skills });
  } catch (err) { next(err); }
}

export async function addSkill(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { name, proficiency } = req.body;
    const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
    const studentSkill = await prisma.studentSkill.upsert({
      where: { studentId_skillId: { studentId: student.id, skillId: skill.id } },
      update: { proficiency },
      create: { studentId: student.id, skillId: skill.id, proficiency },
    });
    res.status(201).json({ success: true, data: studentSkill });
  } catch (err) { next(err); }
}

export async function removeSkill(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    await prisma.studentSkill.delete({ where: { studentId_skillId: { studentId: student.id, skillId: req.params.skillId } } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ---- Projects ----
export async function listProjects(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.json({ success: true, data: await prisma.project.findMany({ where: { studentId: student.id } }) });
  } catch (err) { next(err); }
}
export async function addProject(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.status(201).json({ success: true, data: await prisma.project.create({ data: { ...req.body, studentId: student.id } }) });
  } catch (err) { next(err); }
}
export async function updateProject(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await prisma.project.update({ where: { id: req.params.id }, data: req.body }) });
  } catch (err) { next(err); }
}
export async function deleteProject(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ---- Certificates ----
export async function listCertificates(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.json({ success: true, data: await prisma.certificate.findMany({ where: { studentId: student.id } }) });
  } catch (err) { next(err); }
}
export async function addCertificate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const fileUrl = req.file ? await uploadBuffer(req.file.buffer, "certificates", "raw") : undefined;
    res.status(201).json({ success: true, data: await prisma.certificate.create({ data: { ...req.body, fileUrl, studentId: student.id } }) });
  } catch (err) { next(err); }
}
export async function deleteCertificate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.certificate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ---- Assessments ----
export async function listAssessments(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.json({ success: true, data: await prisma.assessment.findMany({ where: { studentId: student.id } }) });
  } catch (err) { next(err); }
}
export async function submitAssessment(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.status(201).json({ success: true, data: await prisma.assessment.create({ data: { ...req.body, studentId: student.id } }) });
  } catch (err) { next(err); }
}

// ---- Opportunities & Applications ----
export async function browseOpportunities(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { type, search, location } = req.query as Record<string, string>;
    const opportunities = await prisma.opportunity.findMany({
      where: {
        isActive: true,
        ...(type && { type: type as any }),
        ...(location && { location: { contains: location, mode: "insensitive" } }),
        ...(search && { title: { contains: search, mode: "insensitive" } }),
      },
      include: { company: true, requiredSkills: { include: { skill: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: opportunities });
  } catch (err) { next(err); }
}

export async function getOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const opp = await prisma.opportunity.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { company: true, requiredSkills: { include: { skill: true } } },
    });
    res.json({ success: true, data: opp });
  } catch (err) { next(err); }
}

export async function saveOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const saved = await prisma.savedOpportunity.upsert({
      where: { studentId_opportunityId: { studentId: student.id, opportunityId: req.params.id } },
      update: {},
      create: { studentId: student.id, opportunityId: req.params.id },
    });
    res.status(201).json({ success: true, data: saved });
  } catch (err) { next(err); }
}

export async function applyToOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { computeMatchScore } = await import("../ai/matching.service");
    const match = await computeMatchScore(student.id, req.params.id);
    const application = await prisma.application.create({
      data: {
        studentId: student.id,
        opportunityId: req.params.id,
        matchScore: match.score,
        coverNote: req.body.coverNote,
        resumeSnapshotUrl: student.resumeUrl,
        statusHistory: { create: { status: "APPLIED" } },
      },
    });
    res.status(201).json({ success: true, data: application });
  } catch (err) { next(err); }
}

export async function listMyApplications(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: { opportunity: { include: { company: true } } },
      orderBy: { appliedAt: "desc" },
    });
    res.json({ success: true, data: applications });
  } catch (err) { next(err); }
}

export async function withdrawApplication(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.application.update({
      where: { id: req.params.id },
      data: { status: "WITHDRAWN", statusHistory: { create: { status: "WITHDRAWN" } } },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function listIndustryExpectations(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const data = await prisma.industryExpectation.findMany({ include: { company: true }, orderBy: { createdAt: "desc" } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function listNotifications(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const data = await prisma.notification.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: "desc" } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
export async function markNotificationRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
