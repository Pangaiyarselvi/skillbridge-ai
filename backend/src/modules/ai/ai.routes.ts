import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import * as ctrl from "./ai.controller";

const router = Router();

router.use(authenticate);

// Student-facing AI features
router.post("/resume/analyze", authorize("STUDENT"), ctrl.analyzeResumeHandler);
router.post("/skill-gap", authorize("STUDENT"), ctrl.skillGapHandler);
router.post("/career-roadmap", authorize("STUDENT"), ctrl.careerRoadmapHandler);
router.get("/readiness-score", authorize("STUDENT"), ctrl.readinessScoreHandler);
router.get("/recommendations", authorize("STUDENT"), ctrl.recommendationsHandler);
router.post("/chat", authorize("STUDENT"), ctrl.chatHandler);
router.post("/mock-interview/questions", authorize("STUDENT"), ctrl.mockInterviewHandler);
router.post("/mock-interview/evaluate", authorize("STUDENT"), ctrl.evaluateAnswerHandler);

// Company-facing AI features
router.get("/opportunities/:opportunityId/rank-candidates", authorize("COMPANY", "ADMIN"), ctrl.rankCandidatesHandler);

export default router;
