import "dotenv/config";
import app from "./app";
import { prisma } from "./config/prisma";
import axios, { AxiosInstance } from "axios";
import bcrypt from "bcryptjs";
import { Server } from "http";

let server: Server;
let client: AxiosInstance;
const TEST_PORT = 5098;

const results: { feature: string; module: string; working: boolean; notes: string }[] = [];

function record(module: string, feature: string, working: boolean, notes = "") {
  results.push({ module, feature, working, notes });
  console.log(`[${working ? "PASS" : "FAIL"}] [${module}] ${feature} ${notes ? `(${notes})` : ""}`);
}

async function runTests() {
  console.log("\n=================================================================");
  console.log("  SkillBridge AI — Communication & Offer Letter Verification E2E");
  console.log("=================================================================\n");

  server = app.listen(TEST_PORT);
  client = axios.create({
    baseURL: `http://localhost:${TEST_PORT}/api`,
    validateStatus: () => true,
  });

  const timestamp = Date.now();

  try {
    // 1. REGISTER COLLEGE
    const collegeEmail = `college_comm_${timestamp}@univ.edu`;
    const collegeSignup = await client.post("/auth/signup", {
      email: collegeEmail,
      password: "CollegePass123!",
      role: "COLLEGE",
      fullName: "National Institute of Technology",
    });
    const collegeToken = collegeSignup.data?.data?.accessToken;
    const collegeClient = axios.create({
      baseURL: `http://localhost:${TEST_PORT}/api`,
      headers: { Authorization: `Bearer ${collegeToken}` },
      validateStatus: () => true,
    });
    const collegeProfile = await collegeClient.get("/colleges/me");
    const collegeId = collegeProfile.data?.data?.id;
    record("College", "College Account Creation", Boolean(collegeId));

    // 2. REGISTER COMPANY
    const companyEmail = `company_comm_${timestamp}@techcorp.com`;
    const companySignup = await client.post("/auth/signup", {
      email: companyEmail,
      password: "CompanyPass123!",
      role: "COMPANY",
      fullName: "TechCorp Global Technologies",
    });
    const companyToken = companySignup.data?.data?.accessToken;
    const companyClient = axios.create({
      baseURL: `http://localhost:${TEST_PORT}/api`,
      headers: { Authorization: `Bearer ${companyToken}` },
      validateStatus: () => true,
    });
    const companyProfile = await companyClient.get("/companies/me");
    const companyId = companyProfile.data?.data?.id;
    record("Company", "Company Account Creation", Boolean(companyId));

    // Company posts opportunity
    const oppRes = await companyClient.post("/companies/opportunities", {
      title: "Senior AI Software Engineer",
      type: "JOB",
      description: "Build cutting edge LLM platforms with TypeScript and PostgreSQL.",
      location: "Bengaluru HQ / Hybrid",
      stipendOrSalary: "₹18,50,000 / annum",
      duration: "Full-Time",
      openings: 3,
      skillNames: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    });
    const opportunityId = oppRes.data?.data?.id;
    record("Company", "Opportunity Posting for Hiring", Boolean(opportunityId));

    // 3. REGISTER STUDENT
    const studentEmail = `student_comm_${timestamp}@univ.edu`;
    const studentSignup = await client.post("/auth/signup", {
      email: studentEmail,
      password: "StudentPass123!",
      role: "STUDENT",
      fullName: "Kavya Sundaram",
    });
    const studentToken = studentSignup.data?.data?.accessToken;
    const studentUserId = studentSignup.data?.data?.user?.id;
    const studentClient = axios.create({
      baseURL: `http://localhost:${TEST_PORT}/api`,
      headers: { Authorization: `Bearer ${studentToken}` },
      validateStatus: () => true,
    });

    const studentProfile = await studentClient.get("/students/me");
    const studentId = studentProfile.data?.data?.id;

    // Link College & Department
    await studentClient.put("/students/me", {
      fullName: "Kavya Sundaram",
      department: "Computer Science",
      degree: "B.Tech",
      branch: "Computer Science & Engineering",
      currentSemester: 8,
      cgpa: 9.1,
      graduationYear: 2026,
      collegeId: collegeId,
    });
    record("Student", "Student Enrolled & Linked to College", Boolean(studentId));

    // Student applies to opportunity
    const applyRes = await studentClient.post(`/students/opportunities/${opportunityId}/apply`, {
      coverNote: "Enthusiastic full-stack engineer with expertise in TypeScript and AI architectures.",
    });
    record("Student", "Application Submitted", applyRes.status === 201);

    // 4. TEST SIH INNOVATION: AI SMART COMMUNICATION ASSISTANT
    console.log("\n--- Testing AI Smart Communication Assistant ---");
    const aiTemplateRes = await companyClient.post("/communications/ai-suggest-template", {
      templateType: "INTERVIEW_INVITATION",
      tone: "PROFESSIONAL",
      context: {
        studentName: "Kavya Sundaram",
        companyName: "TechCorp Global Technologies",
        jobRole: "Senior AI Software Engineer",
        date: "Monday, Oct 20, 2026 at 11:00 AM IST",
        meetingLink: "https://meet.google.com/sb-techcorp-round1",
      },
    });
    const aiTemplate = aiTemplateRes.data?.data;
    record(
      "AI Assistant",
      "AI Smart Communication Template Synthesizer",
      aiTemplateRes.status === 200 && Boolean(aiTemplate?.subject) && Boolean(aiTemplate?.body)
    );

    // 5. TEST COMPANY DIRECT COMMUNICATION (INTERVIEW INVITATION)
    console.log("\n--- Testing Company Outbound Communication ---");
    const sendCommRes = await companyClient.post("/communications/send", {
      recipientUserIds: [studentUserId],
      category: "INTERVIEW_INVITATION",
      priority: "HIGH",
      subject: aiTemplate?.subject || "Interview Invitation: Senior AI Software Engineer",
      body: aiTemplate?.body || "Please join us for round 1 on Google Meet.",
      metadata: {
        meetingLink: "https://meet.google.com/sb-techcorp-round1",
        interviewDate: "2026-10-20T11:00:00.000Z",
      },
      attachments: [
        {
          name: "Interview_Preparation_Brief.pdf",
          url: "/documents/prep_guide.pdf",
          size: "210 KB",
          type: "application/pdf",
        },
      ],
    });
    record("Company", "Interview Invitation Dispatched", sendCommRes.status === 201);

    // Verify in Company Sent list
    const companySentRes = await companyClient.get("/communications/sent");
    record(
      "Company",
      "Sent Communications Tracking Log",
      companySentRes.status === 200 && companySentRes.data?.data?.length > 0
    );

    // 6. TEST STUDENT INBOX & READING PANE
    console.log("\n--- Testing Student Communication Center ---");
    const inboxRes = await studentClient.get("/communications/inbox");
    const receivedMsgs = inboxRes.data?.data?.messages || [];
    const interviewMsg = receivedMsgs.find((m: any) => m.category === "INTERVIEW_INVITATION");
    record(
      "Student Inbox",
      "Communication Delivery to Student Inbox",
      inboxRes.status === 200 && Boolean(interviewMsg)
    );

    // Read single message & verify auto-mark read
    const singleMsgRes = await studentClient.get(`/communications/inbox/${interviewMsg?.id}`);
    record(
      "Student Inbox",
      "View Detailed Communication & Attachments",
      singleMsgRes.status === 200 && singleMsgRes.data?.data?.isRead === true
    );

    // 7. TEST COMPANY ISSUING FORMAL OFFER LETTER
    console.log("\n--- Testing Corporate Offer Letter Lifecycle ---");
    const offerRes = await companyClient.post("/offers", {
      studentId: studentId,
      opportunityId: opportunityId,
      jobRole: "Senior AI Software Engineer",
      salaryPackage: "₹18,50,000 / annum",
      location: "Bengaluru HQ / Hybrid",
      joiningDate: "2026-07-01T09:00:00.000Z",
      validUntil: "2026-11-01T18:00:00.000Z",
      sendEmail: true,
    });
    const issuedOffer = offerRes.data?.data;
    record("Company", "Official Offer Letter Issued & Emailed", offerRes.status === 201 && Boolean(issuedOffer?.id));

    // Verify offer appears in Student Offer Center
    const studentOffersRes = await studentClient.get("/offers");
    const studentOffers = studentOffersRes.data?.data || [];
    const receivedOffer = studentOffers.find((o: any) => o.id === issuedOffer?.id);
    record(
      "Student Offer Center",
      "Offer Letter Received in Dedicated Center",
      studentOffersRes.status === 200 && Boolean(receivedOffer) && receivedOffer?.status === "PENDING"
    );

    // Student Views Detailed Offer Document
    const offerDetailRes = await studentClient.get(`/offers/${issuedOffer?.id}`);
    record(
      "Student Offer Center",
      "Formal Corporate Document Previewing",
      offerDetailRes.status === 200 && offerDetailRes.data?.data?.jobRole === "Senior AI Software Engineer"
    );

    // Student Accepts Offer Letter
    const acceptOfferRes = await studentClient.patch(`/offers/${issuedOffer?.id}/respond`, {
      action: "ACCEPTED",
    });
    record(
      "Student Offer Center",
      "Offer Accepted by Student & Status Updated",
      acceptOfferRes.status === 200 && acceptOfferRes.data?.data?.status === "ACCEPTED"
    );

    // Verify Application Status progressed to HIRED
    const appCheck = await prisma.application.findFirst({
      where: { studentId, opportunityId },
    });
    record(
      "Application Engine",
      "Automatic Progression to HIRED on Offer Acceptance",
      appCheck?.status === "HIRED"
    );

    // 8. TEST COLLEGE TARGETED PLACEMENT BROADCAST
    console.log("\n--- Testing College Targeted Broadcast Hub ---");
    const broadcastRes = await collegeClient.post("/communications/college/broadcast", {
      departments: ["Computer Science"],
      graduationYears: [2026],
      category: "PLACEMENT_DRIVE",
      priority: "HIGH",
      subject: "Annual Campus Placement Drive 2026: TechCorp Off-Campus Eligibility",
      body: "All Computer Science 2026 batch students are required to verify their SkillBridge readiness score.",
      attachments: [
        {
          name: "Placement_Drive_Guidelines_2026.pdf",
          url: "/documents/guidelines.pdf",
          size: "512 KB",
          type: "application/pdf",
        },
      ],
    });
    record(
      "College Broadcast",
      "Targeted Department & Graduation Year Broadcast",
      broadcastRes.status === 201 && broadcastRes.data?.data?.totalTargeted >= 1
    );

    // Verify student receives college broadcast in inbox
    const studentInboxAfterBroadcast = await studentClient.get("/communications/inbox?category=PLACEMENT_ANNOUNCEMENT");
    const broadcastMsgs = studentInboxAfterBroadcast.data?.data?.messages || [];
    record(
      "Student Inbox",
      "Targeted College Notice Received in Student Feed",
      broadcastMsgs.length > 0
    );

    // 9. TEST NOTIFICATIONS SYSTEM
    console.log("\n--- Testing Global Notification Engine ---");
    const notifsRes = await studentClient.get("/students/notifications");
    record(
      "Notifications",
      "Live Notification Generation & Delivery",
      notifsRes.status === 200 && notifsRes.data?.data?.length >= 2
    );

    const markAllNotifs = await studentClient.patch("/students/notifications/mark-all-read");
    record(
      "Notifications",
      "Mark All Notifications Read",
      markAllNotifs.status === 200
    );

  } catch (err: any) {
    console.error("Test error:", err?.message || err);
  } finally {
    server.close();
    await prisma.$disconnect();

    console.log("\n=================================================================");
    const passed = results.filter((r) => r.working).length;
    console.log(`  Communication Verification Summary: ${passed} / ${results.length} PASSED`);
    console.log("=================================================================\n");
  }
}

runTests();
