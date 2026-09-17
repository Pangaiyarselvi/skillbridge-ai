import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import * as commCtrl from "./communication.controller";

const router = Router();

// All communication endpoints require authentication
router.use(authenticate);

// Student & User Inbox
router.get("/inbox", commCtrl.listInbox);
router.get("/inbox/:id", commCtrl.getCommunication);
router.patch("/inbox/:id/read", commCtrl.markAsRead);
router.patch("/inbox/mark-all-read", commCtrl.markAllAsRead);
router.patch("/inbox/:id/archive", commCtrl.toggleArchive);

// Company & College Outbound Dispatch
router.post("/send", authorize("COMPANY", "COLLEGE", "ADMIN"), commCtrl.sendMessage);
router.get("/sent", authorize("COMPANY", "COLLEGE", "ADMIN"), commCtrl.listSent);

// College Targeted Broadcasts
router.post("/college/broadcast", authorize("COLLEGE", "ADMIN"), commCtrl.collegeBroadcast);

// AI Smart Communication Assistant
router.post("/ai-suggest-template", authorize("COMPANY", "COLLEGE", "ADMIN"), commCtrl.aiSuggestTemplate);

export default router;
