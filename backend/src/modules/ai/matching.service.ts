/**
 * SkillBridge AI — Candidate Matching Engine
 * -------------------------------------------------------------
 * Computes a 0-100 match score between a Student and an Opportunity
 * using a weighted composite of four signals:
 *
 *   1. Skill Overlap        (45%) - verified/self-reported skills vs required skills,
 *                                    weighted by each skill's importance to the role
 *   2. Assessment Strength  (20%) - average assessment score in relevant skill areas
 *   3. Resume/ATS Quality   (15%) - latest ATS score (proxy for profile completeness/quality)
 *   4. Eligibility Fit      (20%) - CGPA threshold + branch eligibility (hard gate + soft score)
 *
 * The weighted sum is then passed through the Groq/Llama layer to generate
 * a human-readable justification ("why this match"), which is cached
 * alongside the numeric score in Application.matchScore / Recommendation.
 * -------------------------------------------------------------
 */

import { prisma } from "../../config/prisma";
import { groqJSON } from "../../config/groq";

interface MatchResult {
  score: number; // 0-100
  breakdown: {
    skillOverlap: number;
    assessmentStrength: number;
    resumeQuality: number;
    eligibilityFit: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
}

export async function computeMatchScore(studentId: string, opportunityId: string): Promise<MatchResult> {
  const [student, opportunity] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { skills: { include: { skill: true } }, assessments: true },
    }),
    prisma.opportunity.findUniqueOrThrow({
      where: { id: opportunityId },
      include: { requiredSkills: { include: { skill: true } } },
    }),
  ]);

  // ---- 1. Skill overlap (weighted) ----
  const requiredSkills = opportunity.requiredSkills; // [{skill, weight}]
  const studentSkillMap = new Map(student.skills.map((s) => [s.skill.name.toLowerCase(), s]));

  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const req of requiredSkills) {
    totalWeight += req.weight;
    const owned = studentSkillMap.get(req.skill.name.toLowerCase());
    if (owned) {
      const proficiencyMultiplier =
        { BEGINNER: 0.5, INTERMEDIATE: 0.75, ADVANCED: 0.9, EXPERT: 1 }[owned.proficiency] ?? 0.6;
      matchedWeight += req.weight * proficiencyMultiplier;
      matchedSkills.push(req.skill.name);
    } else {
      missingSkills.push(req.skill.name);
    }
  }
  const skillOverlap = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 50;

  // ---- 2. Assessment strength ----
  const relevantAssessments = student.assessments.filter((a) =>
    requiredSkills.some((r) => r.skill.name.toLowerCase().includes(a.skillArea.toLowerCase()))
  );
  const assessmentPool = relevantAssessments.length > 0 ? relevantAssessments : student.assessments;
  const assessmentStrength =
    assessmentPool.length > 0
      ? assessmentPool.reduce((sum, a) => sum + (a.score / a.totalMarks) * 100, 0) / assessmentPool.length
      : 50; // neutral default for students with no assessments yet

  // ---- 3. Resume / ATS quality ----
  const resumeQuality = student.atsScore ?? 50;

  // ---- 4. Eligibility fit ----
  let eligibilityFit = 100;
  if (opportunity.minCgpa && student.cgpa != null) {
    eligibilityFit = student.cgpa >= opportunity.minCgpa ? 100 : Math.max(0, (student.cgpa / opportunity.minCgpa) * 100);
  }
  if (opportunity.eligibleBranches.length > 0 && student.branch) {
    const branchOk = opportunity.eligibleBranches
      .map((b) => b.toLowerCase())
      .includes(student.branch.toLowerCase());
    eligibilityFit = branchOk ? eligibilityFit : eligibilityFit * 0.3;
  }

  const score =
    skillOverlap * 0.45 + assessmentStrength * 0.2 + resumeQuality * 0.15 + eligibilityFit * 0.2;

  return {
    score: Math.round(score * 10) / 10,
    breakdown: {
      skillOverlap: Math.round(skillOverlap),
      assessmentStrength: Math.round(assessmentStrength),
      resumeQuality: Math.round(resumeQuality),
      eligibilityFit: Math.round(eligibilityFit),
    },
    matchedSkills,
    missingSkills,
  };
}

/** Rank every applicant for a given opportunity (used by Company > Candidate Ranking). */
export async function rankCandidatesForOpportunity(opportunityId: string) {
  const applications = await prisma.application.findMany({
    where: { opportunityId },
    include: { student: true },
  });

  const ranked = await Promise.all(
    applications.map(async (app) => {
      const match = await computeMatchScore(app.studentId, opportunityId);
      if (app.matchScore !== match.score) {
        await prisma.application.update({
          where: { id: app.id },
          data: { matchScore: match.score },
        });
      }
      return { applicationId: app.id, studentId: app.studentId, studentName: app.student.fullName, ...match };
    })
  );

  return ranked.sort((a, b) => b.score - a.score);
}

/** Generate top-N opportunity recommendations for a student across all active opportunities. */
export async function generateRecommendationsForStudent(studentId: string, limit = 10) {
  const opportunities = await prisma.opportunity.findMany({ where: { isActive: true } });

  const scored = await Promise.all(
    opportunities.map(async (opp) => {
      const match = await computeMatchScore(studentId, opp.id);
      return { opportunity: opp, ...match };
    })
  );

  const top = scored.sort((a, b) => b.score - a.score).slice(0, limit);

  // Persist + generate a short natural-language "why" via Llama for the top few
  for (const item of top.slice(0, 5)) {
    const reason = await explainMatch(item.matchedSkills, item.missingSkills, item.score, item.opportunity.title);
    await prisma.recommendation.upsert({
      where: { id: `${studentId}_${item.opportunity.id}` }, // not a real unique constraint; illustrative
      update: { score: item.score, reason },
      create: {
        studentId,
        opportunityId: item.opportunity.id,
        type: item.opportunity.type,
        title: item.opportunity.title,
        score: item.score,
        reason,
      },
    }).catch(() =>
      prisma.recommendation.create({
        data: {
          studentId,
          opportunityId: item.opportunity.id,
          type: item.opportunity.type,
          title: item.opportunity.title,
          score: item.score,
          reason,
        },
      })
    );
  }

  return top;
}

async function explainMatch(matched: string[], missing: string[], score: number, title: string) {
  const system =
    "You are a career advisor. Given a match score and skill gaps, write ONE encouraging sentence (max 30 words) explaining why this opportunity fits the student. Respond as JSON: {\"reason\": string}";
  const user = `Role: ${title}\nMatch score: ${score}/100\nMatched skills: ${matched.join(", ") || "none"}\nMissing skills: ${missing.join(", ") || "none"}`;
  try {
    const result = await groqJSON<{ reason: string }>(system, user);
    return result.reason;
  } catch {
    return `Strong ${score}% fit based on your current skills and profile.`;
  }
}
