import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../../middlewares/auth";
import * as ctrl from "./student.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.use(authenticate, authorize("STUDENT"));

// Profile
router.get("/me", ctrl.getProfile);
router.put("/me", ctrl.updateProfile);
router.post("/me/resume", upload.single("resume"), ctrl.uploadResume);
router.post("/me/avatar", upload.single("avatar"), ctrl.uploadAvatar);

// Skills / Projects / Certificates
router.get("/me/skills", ctrl.listSkills);
router.post("/me/skills", ctrl.addSkill);
router.delete("/me/skills/:skillId", ctrl.removeSkill);

router.get("/me/projects", ctrl.listProjects);
router.post("/me/projects", ctrl.addProject);
router.put("/me/projects/:id", ctrl.updateProject);
router.delete("/me/projects/:id", ctrl.deleteProject);

router.get("/me/certificates", ctrl.listCertificates);
router.post("/me/certificates", upload.single("file"), ctrl.addCertificate);
router.delete("/me/certificates/:id", ctrl.deleteCertificate);

// Assessments
router.get("/me/assessments", ctrl.listAssessments);
router.post("/me/assessments", ctrl.submitAssessment);

// Opportunities & Applications
router.get("/opportunities", ctrl.browseOpportunities); // supports ?type=INTERNSHIP&search=&location=
router.get("/opportunities/:id", ctrl.getOpportunity);
router.post("/opportunities/:id/save", ctrl.saveOpportunity);
router.post("/opportunities/:id/apply", ctrl.applyToOpportunity);
router.get("/applications", ctrl.listMyApplications);
router.delete("/applications/:id", ctrl.withdrawApplication);

// Industry expectations (read-only view for students)
router.get("/industry-expectations", ctrl.listIndustryExpectations);

// Notifications
router.get("/notifications", ctrl.listNotifications);
router.patch("/notifications/:id/read", ctrl.markNotificationRead);

export default router;
