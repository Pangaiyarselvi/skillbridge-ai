import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STANDARD_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java",
  "SQL", "PostgreSQL", "MongoDB", "Docker", "AWS", "Git",
  "Data Structures", "Machine Learning", "REST APIs", "Communication",
  "HTML5", "CSS3", "Express", "Next.js", "GraphQL", "Tailwind CSS",
  "Kubernetes", "Linux", "C++", "C#", "Go",
];

async function resetDatabase() {
  console.log("==================================================");
  console.log("       RESETTING SKILLBRIDGE AI DATABASE          ");
  console.log("==================================================");

  console.log("Cleaning all existing data...");

  // 1. Delete communication & messages
  await prisma.communication.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();

  // 2. Delete offers & applications
  await prisma.offerLetter.deleteMany();
  await prisma.applicationStatusLog.deleteMany();
  await prisma.application.deleteMany();

  // 3. Delete AI & student records
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.careerRoadmap.deleteMany();
  await prisma.skillGapReport.deleteMany();
  await prisma.resumeAnalysis.deleteMany();

  await prisma.savedOpportunity.deleteMany();
  await prisma.opportunitySkill.deleteMany();
  await prisma.industryExpectation.deleteMany();
  await prisma.industrySkillDemand.deleteMany();
  await prisma.industryPartnership.deleteMany();
  await prisma.opportunity.deleteMany();

  await prisma.studentSkill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.assessment.deleteMany();

  // 4. Delete core role entities
  await prisma.student.deleteMany();
  await prisma.company.deleteMany();
  await prisma.college.deleteMany();
  await prisma.admin.deleteMany();

  // 5. Delete tokens & users
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ All user, company, student, college, and application data completely cleared.");

  // 6. Reset skills to standard catalog
  await prisma.skill.deleteMany();
  for (const name of STANDARD_SKILLS) {
    await prisma.skill.create({ data: { name } });
  }
  console.log(`✅ Seeded ${STANDARD_SKILLS.length} clean standard skills.`);

  // 7. Seed single Admin account for system verification
  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@skillbridge.ai",
      passwordHash,
      role: "ADMIN",
      isEmailVerified: true,
      isActive: true,
      admin: {
        create: {
          fullName: "SkillBridge Admin",
        },
      },
    },
  });
  console.log(`✅ Clean Admin account ready: ${adminUser.email} / Admin@12345`);

  // Verify counts
  const [users, students, companies, colleges, opportunities, applications] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.company.count(),
    prisma.college.count(),
    prisma.opportunity.count(),
    prisma.application.count(),
  ]);

  console.log("\nCurrent Database State:");
  console.log({
    users,
    students,
    companies,
    colleges,
    opportunities,
    applications,
  });

  console.log("==================================================");
  console.log("  DATABASE IS NOW EMPTY AND READY FOR FRESH USERS ");
  console.log("==================================================");
}

resetDatabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
