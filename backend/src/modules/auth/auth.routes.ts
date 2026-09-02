import { Router } from "express";
import * as ctrl from "./auth.controller";

const router = Router();

router.post("/signup", ctrl.signupHandler);
router.post("/login", ctrl.loginHandler);
router.post("/refresh", ctrl.refreshHandler);
router.post("/logout", ctrl.logoutHandler);
router.post("/forgot-password", ctrl.forgotPasswordHandler);
router.post("/reset-password", ctrl.resetPasswordHandler);
router.post("/verify-email", ctrl.verifyEmailHandler);

export default router;
