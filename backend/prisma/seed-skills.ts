import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CORE_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java",
  "SQL", "PostgreSQL", "MongoDB", "Docker", "AWS", "Git",
  "Data Structures", "Machine Learning", "REST APIs", "Communication",
  "HTML5", "CSS3", "Express", "Next.js", "GraphQL", "Tailwind CSS",
  "Kubernetes", "Linux", "C++", "C#", "Go"
];

async function main() {
  console.log("Seeding core skills catalog...");
  for (const name of CORE_SKILLS) {
    const existing = await prisma.skill.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (!existing) {
      await prisma.skill.create({ data: { name } });
      console.log(`Created skill: ${name}`);
    }
  }
  console.log("Core skills catalog ready.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
