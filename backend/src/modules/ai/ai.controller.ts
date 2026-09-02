import { Response, NextFunction } from "express";
import { AuthedRequest } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";
import * as matching from "./matching.service";
import * as resumeAI from "./resume.service";
import * as chatbot from "./chatbot.service";

async function studentIdFromUser(userId: string) {
  const student = await prisma.student.findUniqueOrThrow({ where: { userId } });
  return student.id;
}

export async function analyzeResumeHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const studentId = await studentIdFromUser(req.user!.userId);
    const { resumeUrl } = req.body;
    const result = await resumeAI.analyzeResume(studentId, resumeUrl);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function skillGapHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const studentId = await studentIdFromUser(req.user!.userId);
    const { targetRole } = req.body;
    const result = await resumeAI.generateSkillGapReport(studentId, targetRole);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function careerRoadmapHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const studentId = await studentIdFromUser(req.user!.userId);
    const { targetRole } = req.body;
    const result = await resumeAI.generateCareerRoadmap(studentId, targetRole);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function readinessScoreHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const studentId = await studentIdFromUser(req.user!.userId);
    const score = await resumeAI.computePlacementReadinessScore(studentId);
    res.json({ success: true, data: { placementReadinessScore: score } });
  } catch (err) {
    next(err);
  }
}

export async function recommendationsHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const studentId = await studentIdFromUser(req.user!.userId);
    const result = await matching.generateRecommendationsForStudent(studentId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function rankCandidatesHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { opportunityId } = req.params;
    const result = await matching.rankCandidatesForOpportunity(opportunityId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function chatHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const studentId = await studentIdFromUser(req.user!.userId);
    const { sessionId, message } = req.body;
    const result = await chatbot.chatWithMentor(studentId, sessionId ?? null, message);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function mockInterviewHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { targetRole } = req.body;
    const result = await chatbot.generateMockInterviewQuestions(targetRole);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function evaluateAnswerHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { question, answer } = req.body;
    const result = await chatbot.evaluateInterviewAnswer(question, answer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
