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
      include: {
        skills: { include: { skill: true } },
        projects: true,
        certificates: true,
        college: true,
      },
    });
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function listColleges(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, verificationStatus: true },
    });
    res.json({ success: true, data: colleges });
  } catch (err) {
    next(err);
  }
}

export async function updateCollege(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { collegeId } = req.body as { collegeId?: string | null };

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { collegeId: collegeId && collegeId.trim() !== "" ? collegeId : null },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const {
      fullName,
      phone,
      bio,
      department,
      degree,
      branch,
      currentSemester,
      cgpa,
      graduationYear,
      githubUrl,
      linkedinUrl,
      portfolioUrl,
      collegeId,
      dob,
    } = req.body;

    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (phone !== undefined) dataToUpdate.phone = phone || null;
    if (bio !== undefined) dataToUpdate.bio = bio || null;
    if (department !== undefined) dataToUpdate.department = department || null;
    if (degree !== undefined) dataToUpdate.degree = degree || null;
    if (branch !== undefined) dataToUpdate.branch = branch || null;
    if (currentSemester !== undefined) {
      dataToUpdate.currentSemester = currentSemester ? Number(currentSemester) : null;
    }
    if (cgpa !== undefined) {
      dataToUpdate.cgpa = cgpa ? Number(cgpa) : null;
    }
    if (graduationYear !== undefined) {
      dataToUpdate.graduationYear = graduationYear ? Number(graduationYear) : null;
    }
    if (githubUrl !== undefined) dataToUpdate.githubUrl = githubUrl || null;
    if (linkedinUrl !== undefined) dataToUpdate.linkedinUrl = linkedinUrl || null;
    if (portfolioUrl !== undefined) dataToUpdate.portfolioUrl = portfolioUrl || null;
    if (collegeId !== undefined) {
      dataToUpdate.collegeId = collegeId && collegeId.trim() !== "" ? collegeId : null;
    }
    if (dob !== undefined) {
      dataToUpdate.dob = dob ? new Date(dob) : null;
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: dataToUpdate,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function uploadResume(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);
    const student = await getStudent(req.user!.userId);
    const url = await uploadBuffer(req.file.buffer, "resumes", "raw");
    await prisma.student.update({ where: { id: student.id }, data: { resumeUrl: url } });
    res.json({ success: true, data: { resumeUrl: url } });
  } catch (err) {
    next(err);
  }
}

export async function uploadAvatar(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);
    const student = await getStudent(req.user!.userId);
    const url = await uploadBuffer(req.file.buffer, "avatars", "image");
    await prisma.student.update({ where: { id: student.id }, data: { avatarUrl: url } });
    res.json({ success: true, data: { avatarUrl: url } });
  } catch (err) {
    next(err);
  }
}

// ---- Skills ----
export async function listSkills(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const skills = await prisma.studentSkill.findMany({
      where: { studentId: student.id },
      include: { skill: true },
    });
    res.json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
}

export async function addSkill(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { name, proficiency } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError("Skill name is required", 400);
    }
    const skill = await prisma.skill.upsert({
      where: { name: name.trim() },
      update: {},
      create: { name: name.trim() },
    });
    const studentSkill = await prisma.studentSkill.upsert({
      where: { studentId_skillId: { studentId: student.id, skillId: skill.id } },
      update: { proficiency: proficiency || "BEGINNER" },
      create: { studentId: student.id, skillId: skill.id, proficiency: proficiency || "BEGINNER" },
    });
    res.status(201).json({ success: true, data: studentSkill });
  } catch (err) {
    next(err);
  }
}

export async function removeSkill(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    await prisma.studentSkill.deleteMany({
      where: { studentId: student.id, skillId: req.params.skillId },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ---- Projects ----
export async function listProjects(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.json({ success: true, data: await prisma.project.findMany({ where: { studentId: student.id } }) });
  } catch (err) {
    next(err);
  }
}

export async function addProject(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { title, description, techStack, repoUrl, liveUrl } = req.body;
    if (!title || !title.trim()) throw new AppError("Project title is required", 400);

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description || null,
        techStack: Array.isArray(techStack) ? techStack : [],
        repoUrl: repoUrl || null,
        liveUrl: liveUrl || null,
        studentId: student.id,
      },
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { title, description, techStack, repoUrl, liveUrl } = req.body;
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, studentId: student.id },
    });
    if (!existing) throw new AppError("Project not found", 404);

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(techStack !== undefined && { techStack: Array.isArray(techStack) ? techStack : [] }),
        ...(repoUrl !== undefined && { repoUrl: repoUrl || null }),
        ...(liveUrl !== undefined && { liveUrl: liveUrl || null }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, studentId: student.id },
    });
    if (!existing) throw new AppError("Project not found", 404);

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ---- Certificates ----
export async function listCertificates(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.json({ success: true, data: await prisma.certificate.findMany({ where: { studentId: student.id } }) });
  } catch (err) {
    next(err);
  }
}

export async function addCertificate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { title, issuer, issueDate, expiryDate } = req.body;
    if (!title || !title.trim()) throw new AppError("Certificate title is required", 400);

    const fileUrl = req.file ? await uploadBuffer(req.file.buffer, "certificates", "raw") : undefined;

    const cert = await prisma.certificate.create({
      data: {
        title: title.trim(),
        issuer: issuer || null,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        fileUrl: fileUrl || null,
        studentId: student.id,
      },
    });
    res.status(201).json({ success: true, data: cert });
  } catch (err) {
    next(err);
  }
}

export async function deleteCertificate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const existing = await prisma.certificate.findFirst({
      where: { id: req.params.id, studentId: student.id },
    });
    if (!existing) throw new AppError("Certificate not found", 404);

    await prisma.certificate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ---- Assessments ----
export async function listAssessments(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    res.json({ success: true, data: await prisma.assessment.findMany({ where: { studentId: student.id } }) });
  } catch (err) {
    next(err);
  }
}

export async function submitAssessment(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const { skillArea, score, totalMarks, type, metadata } = req.body;
    if (!skillArea) throw new AppError("Skill area is required", 400);

    const assessment = await prisma.assessment.create({
      data: {
        skillArea,
        score: Number(score) || 0,
        totalMarks: Number(totalMarks) || 100,
        type: type || "SKILL_TEST",
        metadata: metadata || null,
        studentId: student.id,
      },
    });
    res.status(201).json({ success: true, data: assessment });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
}

export async function getOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const opp = await prisma.opportunity.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { company: true, requiredSkills: { include: { skill: true } } },
    });
    res.json({ success: true, data: opp });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
}

export async function applyToOpportunity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: { studentId_opportunityId: { studentId: student.id, opportunityId: req.params.id } },
    });
    if (existing) {
      throw new AppError("You have already applied to this opportunity", 400);
    }

    let matchScore = 50;
    try {
      const { computeMatchScore } = await import("../ai/matching.service.js");
      const match = await computeMatchScore(student.id, req.params.id);
      matchScore = match.score;
    } catch {
      // Fallback to neutral match score if AI calculation encounters error
    }

    const application = await prisma.application.create({
      data: {
        studentId: student.id,
        opportunityId: req.params.id,
        matchScore,
        coverNote: req.body.coverNote || null,
        resumeSnapshotUrl: student.resumeUrl || null,
        statusHistory: { create: { status: "APPLIED" } },
      },
    });
    res.status(201).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
}

export async function withdrawApplication(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const student = await getStudent(req.user!.userId);
    const app = await prisma.application.findFirst({
      where: { id: req.params.id, studentId: student.id },
    });
    if (!app) throw new AppError("Application not found", 404);

    await prisma.application.update({
      where: { id: req.params.id },
      data: { status: "WITHDRAWN", statusHistory: { create: { status: "WITHDRAWN" } } },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listIndustryExpectations(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const data = await prisma.industryExpectation.findMany({
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listNotifications(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const data = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
}

