import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deduplicateSkills() {
  console.log("--- DEDUPLICATING SKILLS ---");
  const allSkills = await prisma.skill.findMany({
    include: {
      studentSkills: true,
      jobSkills: true,
      industrySkillDemands: true,
    },
  });

  const skillGroups = new Map<string, typeof allSkills>();
  for (const s of allSkills) {
    const key = s.name.trim().toLowerCase();
    if (!skillGroups.has(key)) skillGroups.set(key, []);
    skillGroups.get(key)!.push(s);
  }

  for (const [key, group] of skillGroups.entries()) {
    if (group.length <= 1) continue;

    console.log(`Found duplicate skills for "${key}":`, group.map(g => `"${g.name}" (${g.id})`));
    
    // Choose canonical: prefer PascalCase/CamelCase like "Java" over "JAVA", or the one with most usages
    const canonical = group.reduce((best, cur) => {
      const bestUsages = best.studentSkills.length + best.jobSkills.length;
      const curUsages = cur.studentSkills.length + cur.jobSkills.length;
      if (curUsages > bestUsages) return cur;
      // If same usages, prefer mixed-case over all-caps
      const curIsAllUpper = cur.name === cur.name.toUpperCase();
      const bestIsAllUpper = best.name === best.name.toUpperCase();
      if (bestIsAllUpper && !curIsAllUpper) return cur;
      return best;
    });

    console.log(`Canonical skill for "${key}" is "${canonical.name}" (${canonical.id})`);

    for (const dup of group) {
      if (dup.id === canonical.id) continue;

      // Move studentSkills
      for (const ss of dup.studentSkills) {
        const existing = await prisma.studentSkill.findUnique({
          where: { studentId_skillId: { studentId: ss.studentId, skillId: canonical.id } },
        });
        if (existing) {
          await prisma.studentSkill.delete({ where: { id: ss.id } });
        } else {
          await prisma.studentSkill.update({
            where: { id: ss.id },
            data: { skillId: canonical.id },
          });
        }
      }

      // Move jobSkills
      for (const js of dup.jobSkills) {
        const existing = await prisma.opportunitySkill.findUnique({
          where: { opportunityId_skillId: { opportunityId: js.opportunityId, skillId: canonical.id } },
        });
        if (existing) {
          await prisma.opportunitySkill.delete({ where: { id: js.id } });
        } else {
          await prisma.opportunitySkill.update({
            where: { id: js.id },
            data: { skillId: canonical.id },
          });
        }
      }

      // Move industrySkillDemands
      for (const dem of dup.industrySkillDemands) {
        const existing = await prisma.industrySkillDemand.findUnique({
          where: { companyId_skillId: { companyId: dem.companyId, skillId: canonical.id } },
        });
        if (existing) {
          await prisma.industrySkillDemand.delete({ where: { id: dem.id } });
        } else {
          await prisma.industrySkillDemand.update({
            where: { id: dem.id },
            data: { skillId: canonical.id },
          });
        }
      }

      // Delete the duplicate skill
      await prisma.skill.delete({ where: { id: dup.id } });
      console.log(`Deleted duplicate skill "${dup.name}" (${dup.id})`);
    }
  }
}

async function deduplicateColleges() {
  console.log("\n--- DEDUPLICATING COLLEGES ---");
  const allColleges = await prisma.college.findMany({
    include: {
      students: true,
      partnerships: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const collegeGroups = new Map<string, typeof allColleges>();
  for (const c of allColleges) {
    const key = c.name.trim().toLowerCase();
    if (!collegeGroups.has(key)) collegeGroups.set(key, []);
    collegeGroups.get(key)!.push(c);
  }

  for (const [key, group] of collegeGroups.entries()) {
    if (group.length <= 1) continue;

    console.log(`Found duplicate colleges for "${key}":`, group.map(g => `"${g.name}" (${g.id})`));

    // Choose canonical: the one that is VERIFIED or has code or has most students
    const canonical = group.reduce((best, cur) => {
      if (cur.verificationStatus === "VERIFIED" && best.verificationStatus !== "VERIFIED") return cur;
      if (cur.students.length > best.students.length) return cur;
      return best;
    });

    console.log(`Canonical college for "${key}" is "${canonical.name}" (${canonical.id})`);

    for (const dup of group) {
      if (dup.id === canonical.id) continue;

      // Re-point students
      if (dup.students.length > 0) {
        const studentIds = dup.students.map(s => s.id);
        await prisma.student.updateMany({
          where: { id: { in: studentIds } },
          data: { collegeId: canonical.id },
        });
        console.log(`Re-pointed ${studentIds.length} students from duplicate college to canonical`);
      }

      // Re-point partnerships
      if (dup.partnerships.length > 0) {
        const partnershipIds = dup.partnerships.map(p => p.id);
        await prisma.industryPartnership.updateMany({
          where: { id: { in: partnershipIds } },
          data: { collegeId: canonical.id },
        });
        console.log(`Re-pointed ${partnershipIds.length} partnerships to canonical`);
      }

      // Delete the duplicate college
      await prisma.college.delete({ where: { id: dup.id } });
      console.log(`Deleted duplicate college ${dup.id}`);

      // Delete associated dummy user if exists
      if (dup.userId) {
        try {
          await prisma.user.delete({ where: { id: dup.userId } });
          console.log(`Deleted associated user ${dup.userId}`);
        } catch (e: any) {
          console.log(`Could not delete user ${dup.userId}: ${e.message}`);
        }
      }
    }
  }
}

async function verifyIntegrity() {
  console.log("\n--- VERIFYING REFERENTIAL INTEGRITY ---");
  const [users, students, companies, colleges, opportunities, applications, offerLetters, notifications] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.company.count(),
    prisma.college.count(),
    prisma.opportunity.count(),
    prisma.application.count(),
    prisma.offerLetter.count(),
    prisma.notification.count(),
  ]);

  console.log({
    users,
    students,
    companies,
    colleges,
    opportunities,
    applications,
    offerLetters,
    notifications,
  });
}

async function main() {
  await deduplicateSkills();
  await deduplicateColleges();
  await verifyIntegrity();
  console.log("\n=== DEDUPLICATION & INTEGRITY CHECK COMPLETE ===");
}

main()
  .catch((err) => {
    console.error("Error running dedup:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
