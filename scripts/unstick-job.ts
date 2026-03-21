import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.crawlJob.update({
    where: { id: "cmn03x3ly0001ju04qo7874q6" },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  console.log("Job unstuck and manually marked as COMPLETED.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
