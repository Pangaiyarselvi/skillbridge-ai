import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (process.env.NODE_ENV === "test") return; // skip in tests
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "SkillBridge AI <no-reply@skillbridge.ai>",
    ...opts,
  });
}
