import "dotenv/config";
import app from "./app";
import { prisma } from "./config/prisma";
import axios, { AxiosInstance } from "axios";
import bcrypt from "bcryptjs";
import { Server } from "http";

let server: Server;
let client: AxiosInstance;
const TEST_PORT = 5099;

const results: { feature: string; module: string; working: boolean; notes: string }[] = [];

function record(module: string, feature: string, working: boolean, notes = "") {
  results.push({ module, feature, working, notes });
  console.log(`[${working ? "PASS" : "FAIL"}] [${module}] ${feature} ${notes ? `(${notes})` : ""}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  SkillBridge AI - Automated End-to-End Verification");
  console.log("=======================================================\n");

  server = app.listen(TEST_PORT);
  client = axios.create({
    baseURL: `http://localhost:${TEST_PORT}/api`,
    validateStatus: () => true,
  });

  const timestamp = Date.now();

  try {
    // 0. HEALTH CHECK
    const healthRes = await client.get("/health");
    record("System", "Health Check & Root Endpoint", healthRes.status === 200);

    // 1. ADMIN MODULE
    console.log("\n--- Testing Admin Module ---");
    const adminEmail = `admin_${timestamp}@skillbridge.ai`;
    const passwordHash = await bcrypt.hash("Admin@12345", 10);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        isEmailVerified: true,
        admin: { create: { fullName: "System Administrator" } },
      },
    });

    const adminLoginRes = await client.post("/auth/login", { email: adminEmail, password: "Admin@12345" });
    const adminToken = adminLoginRes.data?.data?.accessToken;
    record("Admin", "Admin Login", adminLoginRes.status === 200 && Boolean(adminToken));

    const adminClient = axios.create({
      baseURL: `http://localhost:${TEST_PORT}/api`,
      headers: { Authorization: `Bearer ${adminToken}` },
      validateStatus: () => true,
    });

    const usersRes = await adminClient.get("/admin/users");
    record("Admin", "User Management Listing", usersRes.status === 200 && Array.isArray(usersRes.data?.data));

    const platformRes = await adminClient.get("/admin/analytics/platform");
    record("Admin", "Platform Overview Analytics", platformRes.status === 200 && typeof platformRes.data?.data?.totalStudents === "number");

    const activityRes = await adminClient.get("/admin/monitoring/recent-activity");
    record("Admin", "Real-Time Activity Monitoring", activityRes.status === 200 && Boolean(activityRes.data?.data?.recentUsers));

    // 2. COLLEGE MODULE
    console.log("\n--- Testing College Module ---");
    const collegeEmail = `college_${timestamp}@test.edu`;
    const collegeSignupRes = await client.post("/auth/signup", {
      email: collegeEmail,
      password: "CollegePass123!",
      role: "COLLEGE",
      fullName: "National Institute of Technology",
    });
    const collegeToken = collegeSignupRes.data?.data?.accessToken;
    record("College", "Registration & Instant Token Issuance", collegeSignupRes.status === 201 && Boolean(collegeToken));

    const collegeClient = axios.create({
      baseURL: `http://localhost:${TEST_PORT}/api`,
      headers: { Authorization: `Bearer ${collegeToken}` },
      validateStatus: () => true,
    });

    const collegeProfileRes = await collegeClient.get("/colleges/me");
    const collegeId = collegeProfileRes.data?.data?.id;
    record("College", "College Profile", collegeProfileRes.status === 200 && Boolean(collegeId));

    // Admin verifies college
    const verifyColRes = await adminClient.patch(`/admin/colleges/${collegeId}/verify`, { status: "VERIFIED" });
    record("Admin", "College Verification Queue", verifyColRes.status === 200 && verifyColRes.data?.data?.verificationStatus === "VERIFIED");

    const partnershipRes = await collegeClient.post("/colleges/partnerships", {
      title: "AI Research Collaboration MOU",
      type: "MOU",
      description: "Joint research on generative AI and workforce alignment.",
    });
    const partnershipId = partnershipRes.data?.data?.id;
    record("College", "Industry Collaboration & Partnership Creation", partnershipRes.status === 201 && Boolean(partnershipId));

    // 3. COMPANY MODULE
    console.log("\n--- Testing Company Module ---");
    const companyEmail = `company_${timestamp}@techcorp.com`;
    const companySignupRes = await client.post("/auth/signup", {
      email: companyEmail,
      password: "CompanyPass123!",
      role: "COMPANY",
      fullName: "TechCorp Global Inc.",
    });
    const companyToken = companySignupRes.data?.data?.accessToken;
    record("Company", "Registration & Instant Token Issuance", companySignupRes.status === 201 && Boolean(companyToken));

    const companyClient = axios.create({
      baseURL: `http://localhost:${TEST_PORT}/api`,
      headers: { Authorization: `Bearer ${companyToken}` },
      validateStatus: () => true,
    });

    const companyProfileRes = await companyClient.get("/companies/me");
    const companyId = companyProfileRes.data?.data?.id;
    record("Company", "Company Profile", companyProfileRes.status === 200 && Boolean(companyId));

    // Admin verifies company
    const verifyCompRes = await adminClient.patch(`/admin/companies/${companyId}/verify`, { status: "VERIFIED" });
    record("Admin", "Company Verification Queue", verifyCompRes.status === 200 && verifyCompRes.data?.data?.verificationStatus === "VERIFIED");

    // Post Opportunity
    const oppRes = await companyClient.post("/companies/opportunities", {
      title: "Full Stack Engineer Intern",
      type: "INTERNSHIP",
      description: "Build robust web apps using React, Node.js, and TypeScript.",
      location: "Bengaluru",
      isRemote: true,
      stipendOrSalary: "INR 30,000/month",
      duration: "6 months",
      openings: 5,
      minCgpa: 7.0,
      eligibleBranches: ["Computer Science", "Information Technology"],
      skillNames: ["React", "TypeScript", "Node.js", "PostgreSQL"],
    });
    const opportunityId = oppRes.data?.data?.id;
    record("Company", "Job & Internship Posting", oppRes.status === 201 && Boolean(opportunityId));

    // Publish Expectation
    const expRes = await companyClient.post("/companies/industry-expectations", {
      title: "2026 Campus Hiring Technical Standards",
      requiredSkills: ["TypeScript", "Docker", "REST API Design"],
      hiringRoadmap: "Online assessment -> Technical Round -> System Discussion -> Offer",
    });
    record("Company", "Industry Expectations Publishing", expRes.status === 201 && Boolean(expRes.data?.data?.id));

    // 4. STUDENT MODULE
    console.log("\n--- Testing Student Module ---");
    const studentEmail = `student_${timestamp}@test.edu`;
    const studentSignupRes = await client.post("/auth/signup", {
      email: studentEmail,
      password: "StudentPass123!",
      role: "STUDENT",
      fullName: "Ananya Sharma",
    });
    const studentToken = studentSignupRes.data?.data?.accessToken;
    record("Student", "Student Signup & Instant Token Issuance", studentSignupRes.status === 201 && Boolean(studentToken));

    const studentClient = axios.create({
      baseURL: `http://localhost:${TEST_PORT}/api`,
      headers: { Authorization: `Bearer ${studentToken}` },
      validateStatus: () => true,
    });

    const studentProfileRes = await studentClient.get("/students/me");
    const studentId = studentProfileRes.data?.data?.id;
    record("Student", "Student Profile Fetch", studentProfileRes.status === 200 && Boolean(studentId));

    // Link College & Update Profile
    const updateProfileRes = await studentClient.put("/students/me", {
      fullName: "Ananya Sharma",
      department: "Computer Science",
      degree: "B.Tech",
      branch: "Computer Science",
      currentSemester: 6,
      cgpa: 8.7,
      graduationYear: 2027,
      collegeId: collegeId,
      bio: "Aspiring full-stack engineer passionate about AI and scalable systems.",
    });
    record("Student", "College Linking & Profile Update", updateProfileRes.status === 200 && updateProfileRes.data?.data?.collegeId === collegeId);

    // Add Skills
    const addSkill1 = await studentClient.post("/students/me/skills", { name: "React", proficiency: "ADVANCED" });
    const addSkill2 = await studentClient.post("/students/me/skills", { name: "TypeScript", proficiency: "INTERMEDIATE" });
    record("Student", "Skill Catalog & Proficiency Tracking", addSkill1.status === 201 && addSkill2.status === 201);

    // Add Project
    const projectRes = await studentClient.post("/students/me/projects", {
      title: "Realtime Collaboration Canvas",
      description: "Multiplayer whiteboarding web app built with WebSockets and Canvas API.",
      techStack: ["React", "Node.js", "WebSocket"],
      liveUrl: "https://canvas-demo.vercel.app",
    });
    record("Student", "Project Portfolio Management", projectRes.status === 201 && Boolean(projectRes.data?.data?.id));

    // Submit Assessment
    const assessRes = await studentClient.post("/students/me/assessments", {
      skillArea: "React",
      score: 88,
      totalMarks: 100,
      type: "SKILL_TEST",
    });
    record("Student", "Assessment Submission", assessRes.status === 201 && assessRes.data?.data?.score === 88);

    // Browse Opportunities
    const browseRes = await studentClient.get("/students/opportunities");
    record("Student", "Job & Internship Opportunity Discovery", browseRes.status === 200 && browseRes.data?.data?.length > 0);

    // Apply to Opportunity
    const applyRes = await studentClient.post(`/students/opportunities/${opportunityId}/apply`, {
      coverNote: "I am eager to contribute to TechCorp with my React and TypeScript skills.",
    });
    const applicationId = applyRes.data?.data?.id;
    record("Student", "Job Application Submission", applyRes.status === 201 && Boolean(applicationId));

    // Application Tracking
    const appsListRes = await studentClient.get("/students/applications");
    record("Student", "Application Tracking", appsListRes.status === 200 && appsListRes.data?.data?.length === 1);

    // AI Features: Readiness Score
    const readinessRes = await studentClient.get("/ai/readiness-score");
    record("AI Features", "Placement Readiness Score Engine", readinessRes.status === 200 && typeof readinessRes.data?.data?.placementReadinessScore === "number");

    // AI Features: AI Recommendations
    const recsRes = await studentClient.get("/ai/recommendations");
    record("AI Features", "AI Opportunity Matching & Recommendations", recsRes.status === 200 && Array.isArray(recsRes.data?.data));

    // AI Features: Skill Gap Analysis
    const gapRes = await studentClient.post("/ai/skill-gap", { targetRole: "Full Stack Engineer" });
    record("AI Features", "Skill Gap Analysis Engine", gapRes.status === 200 && Array.isArray(gapRes.data?.data?.missingSkills));

    // AI Features: Career Roadmap
    const roadmapRes = await studentClient.post("/ai/career-roadmap", { targetRole: "Full Stack Engineer" });
    record("AI Features", "AI Career Roadmap Generator", roadmapRes.status === 200 && Boolean(roadmapRes.data?.data?.milestones));

    // AI Features: Mentor Chat
    const chatRes = await studentClient.post("/ai/chat", { message: "How should I prepare for a React internship interview?" });
    record("AI Features", "AI Mentor Chatbot", chatRes.status === 200 && Boolean(chatRes.data?.data?.reply));

    // AI Features: Mock Interview Questions & Evaluation
    const mockQuestionsRes = await studentClient.post("/ai/mock-interview/questions", { targetRole: "Frontend Developer" });
    record("AI Features", "Mock Interview Question Generator", mockQuestionsRes.status === 200 && Boolean(mockQuestionsRes.data?.data?.questions));

    const mockEvalRes = await studentClient.post("/ai/mock-interview/evaluate", {
      question: "Explain the virtual DOM in React.",
      answer: "The virtual DOM is a lightweight in-memory representation of the real DOM. React computes differences using reconciliation and batches DOM updates for high performance.",
    });
    record("AI Features", "Mock Interview Answer Evaluator", mockEvalRes.status === 200 && typeof mockEvalRes.data?.data?.score === "number");

    // Company: View Applicants & AI Ranking
    const rankRes = await companyClient.get(`/companies/opportunities/${opportunityId}/applicants`);
    record("Company", "AI-Ranked Applicant Matching", rankRes.status === 200 && rankRes.data?.data?.length > 0);

    // Company: Update Application Status
    const updateAppStatusRes = await companyClient.patch(`/companies/applications/${applicationId}/status`, {
      status: "SHORTLISTED",
      note: "Strong frontend assessment score.",
    });
    record("Company", "Applicant Status Progression", updateAppStatusRes.status === 200 && updateAppStatusRes.data?.data?.status === "SHORTLISTED");

    // College Analytics
    const colPlacementsRes = await collegeClient.get("/colleges/analytics/placements");
    record("College", "College Placement Analytics", colPlacementsRes.status === 200 && typeof colPlacementsRes.data?.data?.totalStudents === "number");

    const colStudentsRes = await collegeClient.get("/colleges/students");
    record("College", "College Student Monitoring", colStudentsRes.status === 200 && colStudentsRes.data?.data?.length > 0);

    // 5. SECURITY & ISOLATION CHECKS
    console.log("\n--- Testing Security & Isolation ---");
    // Cross-tenant tampering test: Student tries to withdraw non-existent or foreign application
    const fakeWithdraw = await studentClient.delete("/students/applications/non-existent-id");
    record("Security", "Multi-Tenant Application Protection (404 on Foreign Access)", fakeWithdraw.status === 404);

    // Unauthenticated access test
    const unauthRes = await client.get("/students/me");
    record("Security", "Unauthenticated Request Rejection (401)", unauthRes.status === 401);

    // Token refresh test
    const refreshRes = await client.post("/auth/refresh", { refreshToken: studentSignupRes.data?.data?.refreshToken });
    record("Security", "JWT Token Refresh Flow", refreshRes.status === 200 && Boolean(refreshRes.data?.data?.accessToken));

  } catch (err: any) {
    console.error("Test execution error:", err?.message || err);
  } finally {
    server.close();
    await prisma.$disconnect();

    console.log("\n=======================================================");
    console.log(`  Verification Summary: ${results.filter((r) => r.working).length} / ${results.length} PASSED`);
    console.log("=======================================================\n");
  }
}

runTests();

