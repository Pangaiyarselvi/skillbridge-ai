import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";

export async function signupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = signupSchema.parse(req.body);
    const result = await authService.signup(data);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res
      .cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken ?? req.body.refreshToken;
    const result = await authService.refresh(token);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken ?? req.body.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie("refreshToken").json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(data.email);
    res.json({ success: true, message: "If the account exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(data.token, data.newPassword);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = verifyEmailSchema.parse(req.body);
    await authService.verifyEmail(data.token);
    res.json({ success: true, message: "Email verified" });
  } catch (err) {
    next(err);
  }
}
