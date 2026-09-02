import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import * as ctrl from "./college.controller";

const router = Router();
router.use(authenticate, authorize("COLLEGE"));

router.get("/me", ctrl.getProfile);
router.put("/me", ctrl.updateProfile);

router.get("/students", ctrl.listStudents);
router.get("/analytics/placements", ctrl.placementAnalytics);
router.get("/analytics/internships", ctrl.internshipAnalytics);
router.get("/analytics/skill-gaps", ctrl.skillGapAnalytics);
router.get("/analytics/departments", ctrl.departmentPerformance);

router.get("/partnerships", ctrl.listPartnerships);
router.post("/partnerships", ctrl.createPartnership);
router.put("/partnerships/:id", ctrl.updatePartnership);
router.delete("/partnerships/:id", ctrl.deletePartnership);

export default router;
