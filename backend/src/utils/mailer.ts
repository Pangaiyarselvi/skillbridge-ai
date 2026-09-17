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
  attachments?: any[];
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
      ...(opts.attachments && opts.attachments.length > 0 && { attachments: opts.attachments }),
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
  documentUrl?: string | null;
  offerId?: string;
  attachments?: any[];
}

export async function sendOfferLetterEmail(params: OfferEmailParams) {
  const appUrl = (process.env.APP_URL || "https://skillbridge-ai.vercel.app").replace(/\/+$/, "");
  const offerUrl = `${appUrl}/student/offers`;
  const locationStr = params.location || "As per offer terms";

  // Subject as strictly requested
  const subject = `Congratulations! Job Offer from ${params.companyName}`;

  // Plain-text as strictly requested
  const text = `Dear ${params.studentName},

Congratulations!

We are pleased to inform you that you have received an offer from ${params.companyName} for the position of ${params.jobRole}.

Package: ${params.salaryPackage}
Location: ${locationStr}

Please log in to SkillBridge AI to view and download your offer letter: ${offerUrl}

Best Regards,
SkillBridge AI Team`;

  // Professional responsive HTML email template
  const logoHtml = params.companyLogo
    ? `<img src="${params.companyLogo}" alt="${params.companyName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 16px;" />`
    : `<div style="display: inline-block; padding: 10px 18px; background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); color: #ffffff; font-weight: bold; font-size: 18px; border-radius: 8px; margin-bottom: 16px;">${params.companyName}</div>`;

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
    .content-body { padding: 36px 32px; }
    .headline { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; }
    .paragraph { font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0; }
    .offer-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .val { color: #0f172a; font-weight: 700; text-align: right; }
    .cta-container { text-align: center; margin: 32px 0 24px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); text-align: center; }
    .signoff { font-size: 15px; color: #334155; line-height: 1.6; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar"></div>
      <div class="content-body">
        ${logoHtml}

        <p class="paragraph" style="font-size: 16px;">Dear <strong>${params.studentName}</strong>,</p>

        <h1 class="headline">Congratulations!</h1>

        <p class="paragraph">
          We are pleased to inform you that you have received an offer from <strong>${params.companyName}</strong> for the position of <strong>${params.jobRole}</strong>.
        </p>

        <div class="offer-card">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Position:</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${params.jobRole}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Package:</td>
              <td style="padding: 8px 0; color: #059669; font-size: 15px; font-weight: 800; text-align: right;">${params.salaryPackage}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Location:</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${locationStr}</td>
            </tr>
          </table>
        </div>

        <p class="paragraph">
          Please log in to SkillBridge AI to view and download your offer letter.
        </p>

        <div class="cta-container">
          <a href="${offerUrl}" class="cta-button">
            Download Offer Letter &rarr;
          </a>
        </div>

        <div class="signoff">
          Best Regards,<br />
          <strong>SkillBridge AI Team</strong>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 4px 0;">Official Offer Notification &bull; SkillBridge AI Academia-Industry Bridge</p>
        <p style="margin: 0;">Sent to ${params.to}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Attach PDF if available
  const emailAttachments: any[] = [];
  if (params.attachments && Array.isArray(params.attachments)) {
    emailAttachments.push(...params.attachments);
  } else if (params.documentUrl) {
    emailAttachments.push({
      filename: `Offer_Letter_${params.companyName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      path: params.documentUrl,
    });
  }

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
    attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
  });
}



