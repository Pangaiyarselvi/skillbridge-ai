/**
 * Seed script — creates:
 *  - one ADMIN account
 *  - a base skill catalog
 *  - one demo COMPANY (verified) with one opportunity
 *  - one demo COLLEGE (verified)
 *  - one demo STUDENT enrolled at the demo college with a couple of skills
 *
 * Run with: npm run seed
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKILL_CATALOG = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java",
  "SQL", "PostgreSQL", "MongoDB", "Docker", "AWS", "Git",
  "Data Structures", "Machine Learning", "REST APIs", "Communication",
];

async function upsertUserWithPassword(email: string, password: string, role: "ADMIN" | "STUDENT" | "COMPANY" | "COLLEGE") {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role, isEmailVerified: true, isActive: true },
  });
}

async function main() {
  console.log("Seeding SkillBridge AI database...");

  // Skills
  for (const name of SKILL_CATALOG) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seeded ${SKILL_CATALOG.length} skills.`);

  // Admin
  const adminUser = await upsertUserWithPassword("admin@skillbridge.ai", "Admin@12345", "ADMIN");
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, fullName: "SkillBridge Admin" },
  });
  console.log("Admin login -> admin@skillbridge.ai / Admin@12345");

  // Demo company
  const companyUser = await upsertUserWithPassword("company@demo.com", "Demo@12345", "COMPANY");
  const company = await prisma.company.upsert({
    where: { userId: companyUser.id },
    update: {},
    create: {
      userId: companyUser.id,
      name: "Acme Technologies",
      industry: "Software",
      hqLocation: "Bengaluru, India",
      description: "A demo company for showcasing SkillBridge AI.",
      verificationStatus: "VERIFIED",
    },
  });

  const reactSkill = await prisma.skill.findUniqueOrThrow({ where: { name: "React" } });
  const nodeSkill = await prisma.skill.findUniqueOrThrow({ where: { name: "Node.js" } });

  await prisma.opportunity.upsert({
    where: { id: "seed-opportunity-frontend-intern" },
    update: {},
    create: {
      id: "seed-opportunity-frontend-intern",
      companyId: company.id,
      title: "Frontend Engineering Intern",
      type: "INTERNSHIP",
      description: "Work on our React-based product dashboard alongside senior engineers.",
      location: "Bengaluru",
      isRemote: true,
      stipendOrSalary: "₹25,000/month",
      duration: "6 months",
      openings: 3,
      minCgpa: 6.5,
      eligibleBranches: ["Computer Science", "Information Technology"],
      requiredSkills: {
        create: [
          { skillId: reactSkill.id, weight: 2 },
          { skillId: nodeSkill.id, weight: 1 },
        ],
      },
    },
  });
  console.log("Demo company login -> company@demo.com / Demo@12345");

  // Demo college
  const collegeUser = await upsertUserWithPassword("college@demo.com", "Demo@12345", "COLLEGE");
  const college = await prisma.college.upsert({
    where: { userId: collegeUser.id },
    update: {},
    create: {
      userId: collegeUser.id,
      name: "Demo Institute of Technology",
      code: "DIT001",
      address: "Coimbatore, India",
      verificationStatus: "VERIFIED",
    },
  });
  console.log("Demo college login -> college@demo.com / Demo@12345");

  // Demo student
  const studentUser = await upsertUserWithPassword("student@demo.com", "Demo@12345", "STUDENT");
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      fullName: "Asha Kumar",
      collegeId: college.id,
      department: "Computer Science",
      degree: "B.Tech",
      branch: "Computer Science",
      currentSemester: 6,
      cgpa: 8.2,
      graduationYear: new Date().getFullYear() + 1,
    },
  });

  await prisma.studentSkill.upsert({
    where: { studentId_skillId: { studentId: student.id, skillId: reactSkill.id } },
    update: {},
    create: { studentId: student.id, skillId: reactSkill.id, proficiency: "INTERMEDIATE" },
  });
  await prisma.studentSkill.upsert({
    where: { studentId_skillId: { studentId: student.id, skillId: nodeSkill.id } },
    update: {},
    create: { studentId: student.id, skillId: nodeSkill.id, proficiency: "BEGINNER" },
  });
  console.log("Demo student login -> student@demo.com / Demo@12345");

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
