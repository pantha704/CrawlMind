import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.crawlJob.findMany({
    where: {
      query: { contains: "blueshift.gg" },
      status: "completed"
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log(JSON.stringify(jobs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
