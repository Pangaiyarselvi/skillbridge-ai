import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["STUDENT", "COMPANY", "COLLEGE"]), // ADMIN created via seed/internal only
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  collegeId: z.string().optional().nullable().or(z.literal("")),
  branch: z.string().max(100).optional().nullable().or(z.literal("")),
  phone: z.string().max(25).optional().nullable().or(z.literal("")),
  cgpa: z.number().min(0, "CGPA cannot be negative").max(10, "CGPA cannot exceed 10").optional().nullable(),
  graduationYear: z.number().int().min(2000, "Graduation year must be at least 2000").max(2040, "Graduation year cannot exceed 2040").optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});
