import { PrismaClient } from "@prisma/client";
import { sendOfferLetterEmail, checkSmtpConfig } from "../src/utils/mailer.js";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("   AUDIT: SkillBridge AI Offer-Letter Workflow    ");
  console.log("==================================================");

  // 1. Check SMTP Configuration
  const smtpConfig = checkSmtpConfig();
  console.log("\n[1] SMTP Environment Audit:");
  console.log(`- SMTP_HOST: ${smtpConfig.host || "NOT CONFIGURED"}`);
  console.log(`- SMTP_PORT: ${smtpConfig.port}`);
  console.log(`- SMTP_USER: ${smtpConfig.user || "NOT CONFIGURED"}`);
  console.log(`- SMTP_PASS: ${smtpConfig.passSet ? "CONFIGURED (hidden)" : "NOT CONFIGURED"}`);
  console.log(`- SMTP_FROM: ${smtpConfig.from}`);
  console.log(`- Status: ${smtpConfig.configured ? "✅ Real SMTP configured" : "⚠️ Real SMTP NOT configured (fallback to test inbox)"}`);

  // 2. Find an existing application in DB or create a test scenario
  console.log("\n[2] Database & Application Audit:");
  let app = await prisma.application.findFirst({
    include: {
      student: { include: { user: true } },
      opportunity: { include: { company: true } },
    },
  });

  if (!app) {
    console.log("No application found in DB to test with.");
    return;
  }

  console.log(`- Found Application ID: ${app.id}`);
  console.log(`- Student: ${app.student.fullName} (${app.student.user.email})`);
  console.log(`- Company: ${app.opportunity.company.name}`);
  console.log(`- Opportunity: ${app.opportunity.title}`);
  console.log(`- Current Application Status: ${app.status}`);

  // 3. Simulate Event Execution Path
  console.log("\n[3] Simulating Status Transition -> OFFERED:");
  const updatedApp = await prisma.application.update({
    where: { id: app.id },
    data: { status: "OFFERED", statusHistory: { create: { status: "OFFERED", note: "Audit workflow test" } } },
  });
  console.log(`[Status Update] Offer status changed to ${updatedApp.status} for application: ${updatedApp.id}`);

  // 4. Offer Letter Creation / Retrieval
  let offer = await prisma.offerLetter.findFirst({
    where: { studentId: app.studentId, opportunityId: app.opportunityId },
  });

  if (!offer) {
    offer = await prisma.offerLetter.create({
      data: {
        companyId: app.opportunity.companyId,
        studentId: app.studentId,
        opportunityId: app.opportunityId,
        jobRole: app.opportunity.title,
        salaryPackage: "₹12,00,000 / annum",
        location: "Hybrid",
        status: "PENDING",
        letterContent: `OFFICIAL OFFER OF EMPLOYMENT\n\nDear ${app.student.fullName},\n\nWe are pleased to inform you that you have received an offer from ${app.opportunity.company.name}.`,
      },
    });
    console.log(`[Offer] Offer letter created: ${offer.id} for student: ${app.student.fullName} (${app.student.user.email})`);
  } else {
    console.log(`[Offer] Offer letter retrieved: ${offer.id} for student: ${app.student.fullName} (${app.student.user.email})`);
  }

  // 5. Test Email Sending to registered student email
  console.log("\n[4] Nodemailer Execution Test:");
  console.log(`[Mailer] Attempting email send to: ${app.student.user.email}`);

  const emailResult = await sendOfferLetterEmail({
    to: app.student.user.email,
    studentName: app.student.fullName,
    companyName: app.opportunity.company.name,
    jobRole: app.opportunity.title,
    salaryPackage: offer.salaryPackage || "₹12,00,000 / annum",
    location: offer.location || "Hybrid",
    offerId: offer.id,
  });

  if (emailResult.success) {
    console.log(`[Mailer] Email sent successfully to ${app.student.user.email} (MessageId: ${emailResult.messageId})`);
    if (emailResult.previewUrl) {
      console.log(`[Mailer] 🔗 Test Preview URL: ${emailResult.previewUrl}`);
    }
  } else {
    console.error(`[Mailer] Email failed for ${app.student.user.email}. Reason: ${emailResult.error}`);
  }

  console.log("\n==================================================");
  console.log("               AUDIT COMPLETED                    ");
  console.log("==================================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
