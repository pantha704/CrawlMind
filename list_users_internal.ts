import { prisma } from "./src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, plan: true },
  });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
