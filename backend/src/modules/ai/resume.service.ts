import { prisma } from "../../config/prisma";
import { groqJSON } from "../../config/groq";
import pdfParse from "pdf-parse";
import axios from "axios";

interface ResumeAnalysisResult {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  extractedSkills: string[];
}

/** Downloads the resume from Cloudinary and extracts raw text. */
async function extractResumeText(resumeUrl: string): Promise<string> {
  const { data } = await axios.get(resumeUrl, { responseType: "arraybuffer" });
  const parsed = await pdfParse(data);
  return parsed.text;
}

export async function analyzeResume(studentId: string, resumeUrl: string) {
  const text = await extractResumeText(resumeUrl);

  const system = `You are an expert ATS (Applicant Tracking System) and technical recruiter.
Analyze the resume text and return STRICT JSON with keys:
atsScore (0-100 integer), strengths (string[]), weaknesses (string[]),
suggestions (string[], actionable), extractedSkills (string[], normalized skill names).
Be critical and specific — avoid generic feedback.`;

  const result = await groqJSON<ResumeAnalysisResult>(system, text.slice(0, 12000));

  const saved = await prisma.resumeAnalysis.create({
    data: {
      studentId,
      resumeUrl,
      atsScore: result.atsScore,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      suggestions: result.suggestions,
      extractedSkills: result.extractedSkills,
      rawModelOutput: result as any,
    },
  });

  await prisma.student.update({
    where: { id: studentId },
    data: { atsScore: result.atsScore, resumeUrl },
  });

  // Auto-populate/refresh StudentSkill rows from extracted skills (self-declared tier)
  for (const skillName of result.extractedSkills) {
    const skill = await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName },
    });
    await prisma.studentSkill.upsert({
      where: { studentId_skillId: { studentId, skillId: skill.id } },
      update: {},
      create: { studentId, skillId: skill.id, proficiency: "BEGINNER", verifiedBy: "resume" },
    });
  }

  return saved;
}

export async function generateSkillGapReport(studentId: string, targetRole: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { skills: { include: { skill: true } } },
  });

  const currentSkills = student.skills.map((s) => s.skill.name);

  const system = `You are a career/skills advisor with knowledge of current industry hiring requirements.
Given a target job role and the candidate's current skills, return STRICT JSON:
{ "requiredSkills": string[], "missingSkills": string[], "matchingSkills": string[],
  "gapScore": number (0-100, where 100 = fully ready),
  "recommendations": [{ "skill": string, "resource": string, "estWeeks": number }] }`;

  const user = `Target role: ${targetRole}\nCurrent skills: ${currentSkills.join(", ") || "none listed"}`;

  const result = await groqJSON<{
    missingSkills: string[];
    matchingSkills: string[];
    gapScore: number;
    recommendations: any;
  }>(system, user);

  return prisma.skillGapReport.create({
    data: {
      studentId,
      targetRole,
      missingSkills: result.missingSkills,
      matchingSkills: result.matchingSkills,
      gapScore: result.gapScore,
      recommendations: result.recommendations,
    },
  });
}

export async function generateCareerRoadmap(studentId: string, targetRole: string) {
  const system = `You are a career coach. Build a step-by-step 6-12 month roadmap to help a student
reach the target role. Return STRICT JSON:
{ "milestones": [{ "title": string, "description": string, "resources": string[], "durationWeeks": number }] }
Order milestones from foundational to advanced. Keep it realistic and specific.`;

  const result = await groqJSON<{ milestones: any[] }>(system, `Target role: ${targetRole}`);

  return prisma.careerRoadmap.create({
    data: { studentId, targetRole, milestones: result.milestones },
  });
}

export async function computePlacementReadinessScore(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { skills: true, assessments: true, projects: true, certificates: true },
  });

  const skillScore = Math.min(100, student.skills.length * 8);
  const assessmentScore =
    student.assessments.length > 0
      ? student.assessments.reduce((s, a) => s + (a.score / a.totalMarks) * 100, 0) / student.assessments.length
      : 0;
  const portfolioScore = Math.min(100, student.projects.length * 20 + student.certificates.length * 10);
  const atsScore = student.atsScore ?? 0;

  const readiness = skillScore * 0.3 + assessmentScore * 0.3 + portfolioScore * 0.2 + atsScore * 0.2;
  const rounded = Math.round(readiness * 10) / 10;

  await prisma.student.update({ where: { id: studentId }, data: { placementReadinessScore: rounded } });
  return rounded;
}
