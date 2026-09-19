import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const colleges = await prisma.college.findMany({
    include: {
      _count: {
        select: { students: true, partnerships: true },
      },
    },
  });
  console.log("COLLEGES IN DB (" + colleges.length + "):");
  for (const c of colleges) {
    console.log(`- ID: ${c.id}, Name: "${c.name}", Code: "${c.code}", Students: ${c._count.students}, Partnerships: ${c._count.partnerships}, UserId: ${c.userId}`);
  }

  const skills = await prisma.skill.findMany({
    include: {
      _count: {
        select: { studentSkills: true, jobSkills: true, industrySkillDemands: true },
      },
    },
    orderBy: { name: "asc" },
  });
  console.log("\nSKILLS IN DB (" + skills.length + "):");
  for (const s of skills) {
    console.log(`- ID: ${s.id}, Name: "${s.name}", StudentSkills: ${s._count.studentSkills}, JobSkills: ${s._count.jobSkills}`);
  }

  const students = await prisma.student.findMany({
    select: { id: true, fullName: true, collegeId: true, branch: true, department: true, college: { select: { name: true } } },
  });
  console.log("\nSTUDENTS IN DB (" + students.length + "):");
  for (const st of students) {
    console.log(`- ID: ${st.id}, Name: "${st.fullName}", College: "${st.college?.name}" (ID: ${st.collegeId}), Branch: "${st.branch}"`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
