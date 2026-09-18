import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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
  salaryPackage?: string;
  location?: string | null;
  joiningDate?: string | Date | null;
  validUntil?: string | Date | null;
  documentUrl?: string | null;
  offerId?: string;
  attachments?: any[];
}

export async function sendOfferLetterEmail(params: OfferEmailParams) {
  try {
    const appUrl = (process.env.APP_URL || "https://skillbridge-ai.vercel.app").replace(/\/+$/, "");
    const offerUrl = `${appUrl}/student/offers`;

    // Subject as strictly requested:
    // Congratulations! Job Offer from [Company Name]
    const subject = `Congratulations! Job Offer from ${params.companyName}`;

    // Body as strictly requested:
    // Dear [Student Name],
    //
    // Congratulations!
    //
    // We are pleased to inform you that you have received an offer from [Company Name] for the position of [Role].
    //
    // Please log in to SkillBridge AI to view and download your offer letter.
    //
    // Best Regards,
    // SkillBridge AI Team
    const text = `Dear ${params.studentName},

Congratulations!

We are pleased to inform you that you have received an offer from ${params.companyName} for the position of ${params.jobRole}.

Please log in to SkillBridge AI to view and download your offer letter.

Best Regards,
SkillBridge AI Team`;

    const logoHtml = params.companyLogo
      ? `<img src="${params.companyLogo}" alt="${params.companyName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 20px;" />`
      : `<div style="display: inline-block; padding: 8px 16px; background: #4f46e5; color: #ffffff; font-weight: bold; font-size: 16px; border-radius: 6px; margin-bottom: 20px;">${params.companyName}</div>`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%);"></td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              ${logoHtml}

              <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">Dear <strong>${params.studentName}</strong>,</p>

              <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">Congratulations!</h2>

              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
                We are pleased to inform you that you have received an offer from <strong>${params.companyName}</strong> for the position of <strong>${params.jobRole}</strong>.
              </p>

              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
                Please log in to SkillBridge AI to view and download your offer letter.
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${offerUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px;" target="_blank" rel="noopener noreferrer">
                  View Offer Letter &rarr;
                </a>
              </div>

              <div style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                Best Regards,<br />
                <strong>SkillBridge AI Team</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">SkillBridge AI &bull; Sent to ${params.to}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Process PDF attachment if available
    const emailAttachments: any[] = [];
    const cleanCompanyName = params.companyName.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (params.attachments && Array.isArray(params.attachments)) {
      for (const att of params.attachments) {
        if (att.content) {
          emailAttachments.push(att);
        } else if (att.path) {
          if (att.path.startsWith("http://") || att.path.startsWith("https://")) {
            emailAttachments.push(att);
          } else if (att.path.startsWith("data:")) {
            const match = att.path.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (match) {
              emailAttachments.push({
                filename: att.filename || att.name || `Offer_Letter_${cleanCompanyName}.pdf`,
                content: Buffer.from(match[2], "base64"),
                contentType: match[1] || "application/pdf",
              });
            }
          } else {
            const resolved = path.isAbsolute(att.path) ? att.path : path.resolve(process.cwd(), att.path);
            if (fs.existsSync(resolved)) {
              emailAttachments.push({
                filename: att.filename || att.name || `Offer_Letter_${cleanCompanyName}.pdf`,
                path: resolved,
              });
            }
          }
        }
      }
    } else if (params.documentUrl) {
      const docUrl = params.documentUrl.trim();
      if (docUrl.startsWith("data:")) {
        const match = docUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (match) {
          emailAttachments.push({
            filename: `Offer_Letter_${cleanCompanyName}.pdf`,
            content: Buffer.from(match[2], "base64"),
            contentType: match[1] || "application/pdf",
          });
        }
      } else if (docUrl.startsWith("http://") || docUrl.startsWith("https://")) {
        emailAttachments.push({
          filename: `Offer_Letter_${cleanCompanyName}.pdf`,
          path: docUrl,
        });
      } else {
        const resolved = path.isAbsolute(docUrl) ? docUrl : path.resolve(process.cwd(), docUrl);
        if (fs.existsSync(resolved)) {
          emailAttachments.push({
            filename: `Offer_Letter_${cleanCompanyName}.pdf`,
            path: resolved,
          });
        }
      }
    }

    return await sendEmail({
      to: params.to,
      subject,
      text,
      html,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });
  } catch (err: any) {
    console.error("[Mailer] Unexpected error in sendOfferLetterEmail:", err?.message || err);
    return { success: false, error: err?.message };
  }
}




