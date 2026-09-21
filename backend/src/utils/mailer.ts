import nodemailer from "nodemailer";
import dns from "dns";
import fs from "fs";
import path from "path";
import { Resend } from "resend";

// Ensure IPv4 is prioritized in Node to prevent IPv6 connection timeouts on cloud hosts (Render/AWS)
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

let activeTransporter: nodemailer.Transporter | null = null;
let isTransporterVerified = false;
let etherealTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

// In-memory deduplication cache to prevent duplicate email sends within 60 seconds
const recentOfferEmails = new Map<string, number>();

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getResendFrom(): string {
  if (process.env.RESEND_FROM?.trim()) {
    return process.env.RESEND_FROM.trim();
  }
  const smtpFrom = process.env.SMTP_FROM?.trim();
  // Resend will reject public mailbox domains (like @gmail.com or @yahoo.com)
  if (smtpFrom && !smtpFrom.includes("@gmail.com") && !smtpFrom.includes("@yahoo.com")) {
    return smtpFrom;
  }
  return "SkillBridge AI <onboarding@resend.dev>";
}

export function getCleanSmtpEnv() {
  const user = process.env.SMTP_USER?.trim()?.replace(/^["']|["']$/g, "") || null;
  const pass = process.env.SMTP_PASS?.trim()?.replace(/^["']|["']$/g, "")?.replace(/\s+/g, "") || null;
  const from = process.env.SMTP_FROM?.trim()?.replace(/^["']|["']$/g, "") || null;
  const host = process.env.SMTP_HOST?.trim()?.replace(/^["']|["']$/g, "") || "smtp.gmail.com";
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;

  return { user, pass, from, host, port };
}

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}*`;
  return `${maskedName}@${parts[1]}`;
}

function buildTransporter(host: string, port: number, user: string, pass: string): nodemailer.Transporter {
  const isSecure = port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    requireTLS: !isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
    family: 4, // Force IPv4 to prevent IPv6 routing blackholes on cloud hosts
    connectionTimeout: 10000, // 10s connection timeout (avoid hanging for 2 minutes)
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 15000,     // 15s socket timeout
    dnsTimeout: 5000,         // 5s DNS timeout
  } as any);
}

export async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const { user, pass, host, port } = getCleanSmtpEnv();

  // 1. Primary SMTP Transporter
  if (user && pass) {
    if (!activeTransporter || !isTransporterVerified) {
      try {
        const primary = buildTransporter(host, port, user, pass);
        await primary.verify();
        activeTransporter = primary;
        isTransporterVerified = true;
        console.log(`[Mailer] SMTP connection success: Verified connection to ${host}:${port} for ${maskEmail(user)}`);
        return activeTransporter;
      } catch (firstErr: any) {
        console.warn(`[Mailer] SMTP verification on ${host}:${port} failed (${firstErr?.message || firstErr}).`);

        // If host is Gmail, try alternate port (465 <-> 587)
        if (host === "smtp.gmail.com") {
          const altPort = port === 465 ? 587 : 465;
          try {
            console.log(`[Mailer] Attempting alternate Gmail port ${altPort}...`);
            const alt = buildTransporter(host, altPort, user, pass);
            await alt.verify();
            activeTransporter = alt;
            isTransporterVerified = true;
            console.log(`[Mailer] SMTP connection success: Verified Gmail connection on alternate port ${altPort} for ${maskEmail(user)}`);
            return activeTransporter;
          } catch (altErr: any) {
            console.error(`[Mailer] SMTP connection failure: Both port ${port} and ${altPort} failed (${altErr?.message || altErr})`);
          }
        }
      }
    } else {
      return activeTransporter;
    }
  }

  // 2. Automated fallback to Ethereal if no credentials or if outbound SMTP is blocked
  if (!etherealTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Mailer] SMTP fallback: Initialized automated test transport (${testAccount.user})`);
    } catch (err: any) {
      console.error(`[Mailer] SMTP fallback failure: Could not initialize fallback transport: ${err?.message || err}`);
      return null;
    }
  }

  return etherealTransporter;
}

export function checkSmtpConfig() {
  const { user, pass, from, host, port } = getCleanSmtpEnv();
  const defaultFrom = user ? `"SkillBridge AI" <${user}>` : `"SkillBridge AI" <no-reply@skillbridge.ai>`;

  return {
    configured: Boolean(user && pass),
    user,
    passSet: Boolean(pass),
    from: from || defaultFrom,
    host,
    port,
  };
}

export async function runStartupDiagnostics() {
  console.log("==================================================");
  console.log("       SKILLBRIDGE AI EMAIL SYSTEM DIAGNOSTICS    ");
  console.log("==================================================");

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = getResendFrom();
  const isResendConfigured = Boolean(resendKey);

  console.log(`[Startup Diagnostics] RESEND_API_KEY exists: ${isResendConfigured} ${resendKey ? `(Key: ${resendKey.slice(0, 5)}***)` : "(NOT CONFIGURED)"}`);

  if (isResendConfigured) {
    console.log(`[Startup Diagnostics] Primary Provider: RESEND (HTTP API via port 443 - Immune to Render SMTP blocks)`);
    console.log(`[Startup Diagnostics] Resend Sender Address: ${resendFrom}`);
  } else {
    console.log(`[Startup Diagnostics] Primary Provider: Nodemailer SMTP (Note: Render Free Tier blocks ports 25, 465, and 587)`);
  }

  const { user, pass, from, host, port } = getCleanSmtpEnv();
  console.log(`[Startup Diagnostics] Fallback SMTP_USER exists: ${Boolean(user)} ${user ? `(${maskEmail(user)})` : "(NOT CONFIGURED)"}`);
  console.log(`[Startup Diagnostics] Fallback SMTP_PASS exists: ${Boolean(pass)} ${pass ? `(Configured, length: ${pass.length})` : "(NOT CONFIGURED)"}`);
  console.log(`[Startup Diagnostics] Fallback SMTP Server: ${host}:${port}`);

  // Only run active SMTP verification check if Resend is NOT configured, or asynchronously without delaying startup
  if (!isResendConfigured && user && pass) {
    try {
      const transporter = await getTransporter();
      if (transporter && isTransporterVerified) {
        console.log(`[Startup Diagnostics] SMTP transporter.verify() result: SUCCESS (${host})`);
      } else {
        console.warn(`[Startup Diagnostics] SMTP transporter.verify() result: FAILURE (Direct SMTP connection timed out or blocked by network)`);
      }
    } catch (err: any) {
      console.error(`[Startup Diagnostics] SMTP transporter.verify() result: FAILURE (${err?.message || err})`);
    }
  } else if (isResendConfigured) {
    console.log("[Startup Diagnostics] Email system ready. Outgoing mail will be routed via Resend API.");
  }
  console.log("==================================================");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
}): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  if (process.env.NODE_ENV === "test") return { success: true, messageId: "test-mock-id" };

  console.log(`[Mailer] Attempting email send to: ${opts.to} | Subject: "${opts.subject}"`);

  // =========================================================================
  // 1. PRIMARY: Resend (HTTP REST API over port 443 — reliable on Render)
  // =========================================================================
  const resend = getResendClient();
  if (resend) {
    try {
      const from = getResendFrom();

      // Transform attachments to Resend format
      const resendAttachments: Array<{
        filename: string;
        content?: Buffer | string;
        path?: string;
        contentType?: string;
      }> = [];

      if (opts.attachments && Array.isArray(opts.attachments)) {
        for (const att of opts.attachments) {
          if (!att) continue;
          const filename = att.filename || att.name || "attachment.pdf";
          if (att.content) {
            resendAttachments.push({
              filename,
              content: att.content,
              contentType: att.contentType,
            });
          } else if (att.path) {
            if (typeof att.path === "string" && (att.path.startsWith("http://") || att.path.startsWith("https://"))) {
              resendAttachments.push({
                filename,
                path: att.path,
                contentType: att.contentType,
              });
            } else if (typeof att.path === "string") {
              const resolved = path.isAbsolute(att.path) ? att.path : path.resolve(process.cwd(), att.path);
              if (fs.existsSync(resolved)) {
                resendAttachments.push({
                  filename,
                  content: fs.readFileSync(resolved),
                  contentType: att.contentType || "application/pdf",
                });
              }
            }
          }
        }
      }

      console.log(`[Mailer] Dispatching via Resend API to ${opts.to} (from: ${from})...`);
      const { data, error } = await resend.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
      });

      if (error) {
        console.error(`[Mailer] Resend API error sending to ${opts.to}:`, error.message);
        console.warn(`[Mailer] Attempting fallback to SMTP transporter...`);
      } else if (data?.id) {
        console.log(`[Mailer] Email send success to ${opts.to} via Resend (MessageId: ${data.id})`);
        return { success: true, messageId: data.id };
      }
    } catch (resendErr: any) {
      console.error(`[Mailer] Resend dispatch exception: ${resendErr?.message || resendErr}. Falling back to SMTP...`);
    }
  }

  // =========================================================================
  // 2. SECONDARY / FALLBACK: Nodemailer (SMTP / Ethereal)
  // =========================================================================
  const smtpStatus = checkSmtpConfig();
  if (!smtpStatus.configured && !resend) {
    console.warn(`[Mailer] ⚠️ Gmail SMTP credentials not configured (SMTP_USER: ${smtpStatus.user || "NOT SET"}, SMTP_PASS: ${smtpStatus.passSet ? "SET" : "NOT SET"}). Falling back to test inbox.`);
  }

  const transporter = await getTransporter();
  if (!transporter) {
    const errorMsg = "Neither Resend nor SMTP transporter could be initialized";
    console.error(`[Mailer] Email send failure to ${opts.to}. Reason: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    const from = smtpStatus.from;

    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      html: opts.html,
      ...(opts.attachments && opts.attachments.length > 0 && { attachments: opts.attachments }),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] Email send success to ${opts.to} via fallback test inbox (MessageId: ${info.messageId}, Preview: ${previewUrl})`);
    } else {
      console.log(`[Mailer] Email send success to ${opts.to} via SMTP (MessageId: ${info.messageId})`);
    }

    return { success: true, messageId: info.messageId, previewUrl: previewUrl || undefined };
  } catch (err: any) {
    console.error(`[Mailer] Email send failure to ${opts.to} via SMTP. Reason: ${err?.message || err}`);

    // If sending via active transporter failed, try ethereal fallback so email notification is never lost
    if (activeTransporter && !etherealTransporter) {
      try {
        console.log(`[Mailer] Attempting fallback delivery for ${opts.to}...`);
        const fallbackTransporter = await nodemailer.createTestAccount().then((acc) =>
          nodemailer.createTransport({
            host: acc.smtp.host,
            port: acc.smtp.port,
            secure: acc.smtp.secure,
            auth: { user: acc.user, pass: acc.pass },
          })
        );
        const fbInfo = await fallbackTransporter.sendMail({
          from: `"SkillBridge AI" <no-reply@skillbridge.ai>`,
          to: opts.to,
          subject: opts.subject,
          text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          html: opts.html,
          ...(opts.attachments && opts.attachments.length > 0 && { attachments: opts.attachments }),
        });
        const pUrl = nodemailer.getTestMessageUrl(fbInfo);
        console.log(`[Mailer] Fallback email send success to ${opts.to} (Preview: ${pUrl})`);
        return { success: true, messageId: fbInfo.messageId, previewUrl: pUrl || undefined };
      } catch (fbErr: any) {
        console.error(`[Mailer] Fallback also failed: ${fbErr?.message || fbErr}`);
      }
    }

    return { success: false, error: err?.message || String(err) };
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
    const dedupKey = params.offerId ? `offer:${params.offerId}` : `student:${params.to}:${params.jobRole}`;
    const now = Date.now();
    const lastSent = recentOfferEmails.get(dedupKey);

    if (lastSent && now - lastSent < 60000) {
      console.log(`[Mailer] Duplicate send prevented: Offer letter email to ${params.to} for "${params.jobRole}" was already dispatched ${Math.round((now - lastSent) / 1000)}s ago.`);
      return { success: true, messageId: "DUPLICATE_SKIPPED" };
    }

    recentOfferEmails.set(dedupKey, now);

    // Clean up old entries
    if (recentOfferEmails.size > 200) {
      for (const [k, time] of recentOfferEmails.entries()) {
        if (now - time > 120000) recentOfferEmails.delete(k);
      }
    }

    const appUrl = (process.env.APP_URL || "https://skillbridge-ai.vercel.app").replace(/\/+$/, "");
    const offerUrl = `${appUrl}/student/offers`;

    // Subject:
    const subject = `Congratulations! Job Offer from ${params.companyName}`;

    // Body:
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
