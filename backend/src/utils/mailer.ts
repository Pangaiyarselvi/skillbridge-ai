import nodemailer from "nodemailer";

const isSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (process.env.NODE_ENV === "test") return; // skip in tests
  if (!transporter) {
    console.warn(`[Mailer] SMTP not configured. Email to "${opts.to}" skipped. Subject: "${opts.subject}"`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "SkillBridge AI <no-reply@skillbridge.ai>",
      ...opts,
    });
  } catch (err: any) {
    console.error(`[Mailer] Failed to send email to ${opts.to}:`, err?.message || err);
  }
}

