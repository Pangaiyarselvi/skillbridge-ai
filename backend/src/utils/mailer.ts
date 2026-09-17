import nodemailer from "nodemailer";

export function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host || !user) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465 (SSL), false for 587/25 (STARTTLS)
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (process.env.NODE_ENV === "test") return { success: true, test: true };

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[Mailer] ⚠️ SMTP not configured. Real email to "${opts.to}" skipped.`);
    console.info(
      `[Mailer] 💡 To enable sending real emails to real inboxes, configure in backend/.env:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=465
  SMTP_USER=your_email@gmail.com
  SMTP_PASS=your_16_digit_app_password
  SMTP_FROM="SkillBridge AI <your_email@gmail.com>"`
    );
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  try {
    const from =
      process.env.SMTP_FROM ||
      `"SkillBridge AI" <${process.env.SMTP_USER || "no-reply@skillbridge.ai"}>`;

    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      html: opts.html,
    });

    console.log(`[Mailer] ✅ Real email successfully sent to ${opts.to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Mailer] ❌ Error sending real email to ${opts.to}:`, err?.message || err);
    return { success: false, error: err?.message };
  }
}

export interface OfferEmailParams {
  to: string;
  studentName: string;
  companyName: string;
  companyLogo?: string | null;
  jobRole: string;
  salaryPackage: string;
  location?: string | null;
  joiningDate?: string | Date | null;
  validUntil?: string | Date | null;
  offerId?: string;
}

export async function sendOfferLetterEmail(params: OfferEmailParams) {
  const appUrl = (process.env.APP_URL || "https://skillbridge-ai.vercel.app").replace(/\/+$/, "");
  const offerUrl = `${appUrl}/student/offers`;

  const joiningStr = params.joiningDate
    ? new Date(params.joiningDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Mutually agreed upon";

  const deadlineStr = params.validUntil
    ? new Date(params.validUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Within 7 business days";

  const subject = `🎉 Congratulations! Job Offer from ${params.companyName} for ${params.jobRole}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #1e293b; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 40px 15px; box-sizing: border-box; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
    .header-bar { height: 6px; background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%); }
    .brand-header { padding: 24px 32px; background: #ffffff; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .brand-title { font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
    .brand-title span { color: #4f46e5; }
    .content-body { padding: 36px 32px; }
    .badge { display: inline-block; padding: 6px 12px; background: #ecfdf5; color: #059669; font-size: 12px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
    .headline { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; line-height: 1.3; }
    .intro { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .offer-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; }
    .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .card-row:last-child { border-bottom: none; }
    .card-label { color: #64748b; font-weight: 500; }
    .card-value { color: #0f172a; font-weight: 700; text-align: right; }
    .cta-container { text-align: center; margin: 32px 0 20px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); text-align: center; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar"></div>
      
      <div class="brand-header">
        <div class="brand-title">SkillBridge <span>AI</span></div>
        <div style="font-size: 12px; font-weight: 600; color: #64748b;">OFFICIAL NOTICE</div>
      </div>

      <div class="content-body">
        <span class="badge">🎉 Offer Letter Issued</span>
        <h1 class="headline">Congratulations, ${params.studentName}!</h1>
        <p class="intro">
          We are pleased to notify you that <strong>${params.companyName}</strong> has officially extended an employment offer for the role of <strong>${params.jobRole}</strong> via SkillBridge AI.
        </p>

        <div class="offer-card">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Company</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${params.companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Role & Designation</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${params.jobRole}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Annual Compensation</td>
              <td style="padding: 10px 0; color: #059669; font-size: 15px; font-weight: 800; text-align: right;">${params.salaryPackage}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Location</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${params.location || "Hybrid / Mentioned in Letter"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Expected Joining</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${joiningStr}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 500;">Decision Deadline</td>
              <td style="padding: 10px 0; color: #dc2626; font-size: 14px; font-weight: 700; text-align: right;">${deadlineStr}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Please review the full official terms, compensation structure, and sign or respond to the offer through your secure SkillBridge AI Offer Center.
        </p>

        <div class="cta-container">
          <a href="${offerUrl}" class="cta-button">
            View & Accept Offer Letter &rarr;
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
          Direct link: <a href="${offerUrl}" style="color: #4f46e5;">${offerUrl}</a>
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 6px 0;">This email was sent to <strong>${params.to}</strong> as part of the SkillBridge AI Academia-Industry Talent Network.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} SkillBridge AI. Verified Corporate Communications.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: params.to,
    subject,
    html,
  });
}


