import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { AppError } from "../../middlewares/errorHandler";
import { sendEmail } from "../../utils/mailer";

export async function signup(input: {
  email: string;
  password: string;
  role: "STUDENT" | "COMPANY" | "COLLEGE";
  fullName: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(input.password, 12);
  const emailVerifyToken = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: input.role,
      isEmailVerified: true,
      emailVerifyToken,
      ...(input.role === "STUDENT" && { student: { create: { fullName: input.fullName } } }),
      ...(input.role === "COMPANY" && { company: { create: { name: input.fullName } } }),
      ...(input.role === "COLLEGE" && { college: { create: { name: input.fullName } } }),
    },
  });

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, fullName: input.fullName },
  };
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { student: true, company: true, college: true, admin: true },
  });
  if (!user || !user.isActive) throw new AppError("Invalid credentials", 401);
  if (!user.isEmailVerified) throw new AppError("Please verify your email before logging in", 403);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const name =
    user.student?.fullName ??
    user.company?.name ??
    user.college?.name ??
    user.admin?.fullName ??
    user.email;

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, fullName: name },
  };
}

export async function refresh(token?: string) {
  if (!token) throw new AppError("Refresh token missing", 401);

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new AppError("Invalid refresh token", 401);
  }

  try {
    const payload = verifyRefreshToken(token);
    const accessToken = signAccessToken(payload);
    return { accessToken };
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }
}

export async function logout(token?: string) {
  if (!token) return;
  await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
}

export async function forgotPassword(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return; // silent to prevent user enumeration

  const resetToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  await sendEmail({
    to: user.email,
    subject: "Reset your SkillBridge AI password",
    html: `<p>Click to reset your password: <a href="${appUrl}/reset-password?token=${resetToken}">${appUrl}/reset-password?token=${resetToken}</a></p>`,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) throw new AppError("Invalid or expired reset token", 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw new AppError("Invalid verification token", 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyToken: null },
  });
}

