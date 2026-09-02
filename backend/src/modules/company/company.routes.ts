import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import * as ctrl from "./company.controller";

const router = Router();
router.use(authenticate, authorize("COMPANY"));

router.get("/me", ctrl.getProfile);
router.put("/me", ctrl.updateProfile);

// Job & Internship postings
router.get("/opportunities", ctrl.listMyOpportunities);
router.post("/opportunities", ctrl.createOpportunity);
router.put("/opportunities/:id", ctrl.updateOpportunity);
router.delete("/opportunities/:id", ctrl.deleteOpportunity);

// Applicant management + AI ranking
router.get("/opportunities/:id/applicants", ctrl.listApplicants);
router.patch("/applications/:id/status", ctrl.updateApplicationStatus);

// Industry expectations publishing
router.get("/industry-expectations", ctrl.listExpectations);
router.post("/industry-expectations", ctrl.createExpectation);
router.put("/industry-expectations/:id", ctrl.updateExpectation);
router.delete("/industry-expectations/:id", ctrl.deleteExpectation);

export default router;
