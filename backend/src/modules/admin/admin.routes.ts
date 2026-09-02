import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import * as ctrl from "./admin.controller";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/users", ctrl.listUsers);
router.patch("/users/:id/status", ctrl.setUserActiveStatus);

router.get("/companies", ctrl.listCompanies);
router.patch("/companies/:id/verify", ctrl.verifyCompany);

router.get("/colleges", ctrl.listColleges);
router.patch("/colleges/:id/verify", ctrl.verifyCollege);

router.get("/analytics/platform", ctrl.platformAnalytics);
router.get("/monitoring/recent-activity", ctrl.recentActivity);

export default router;
