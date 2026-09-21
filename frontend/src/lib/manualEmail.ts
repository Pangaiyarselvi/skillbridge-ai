/**
 * SkillBridge AI - Manual Email System for Company Portal
 * Allows companies to dispatch offer letters directly through their default mail client or Gmail.
 */

export interface OfferEmailData {
  studentName: string;
  studentEmail?: string | null;
  companyName: string;
  jobRole: string;
}

export function generateOfferEmailTemplate(data: OfferEmailData): { subject: string; body: string } {
  const studentName = data.studentName?.trim() || "Candidate";
  const companyName = data.companyName?.trim() || "SkillBridge Partner";
  const jobRole = data.jobRole?.trim() || "Selected Position";

  const subject = "Congratulations! Offer Letter from SkillBridge AI";

  const body = `Dear ${studentName},

Congratulations!

We are pleased to inform you that you have been selected for the position of ${jobRole}.

Company: ${companyName}
Role: ${jobRole}

Please log in to SkillBridge AI to view your offer details.

Best Regards,
SkillBridge AI Team
skillbridge.ai.offl@gmail.com`;

  return { subject, body };
}

/**
 * Opens the user's default email client (or registered webmail handler like Gmail)
 * using a mailto URL with pre-filled student email, subject, and message.
 */
export function openOfferMailClient(data: OfferEmailData): { success: boolean; error?: string } {
  if (!data.studentEmail || !data.studentEmail.trim()) {
    return {
      success: false,
      error: "Student email address not found. Please ensure the student has a registered email.",
    };
  }

  try {
    const { subject, body } = generateOfferEmailTemplate(data);
    const recipient = data.studentEmail.trim();

    // Construct standard RFC-compliant mailto URI
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Create temporary link element and click to invoke mailto without disrupting the application state
    const link = document.createElement("a");
    link.href = mailtoUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Optionally copy body to clipboard in case the user opens webmail manually
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(body).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to open email client.",
    };
  }
}

/**
 * Returns a direct URL to Gmail web composer with all fields pre-filled.
 */
export function getGmailWebComposeUrl(data: OfferEmailData): string {
  const { subject, body } = generateOfferEmailTemplate(data);
  const to = data.studentEmail?.trim() || "";
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
