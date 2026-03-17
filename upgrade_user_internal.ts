import { prisma } from "./src/lib/prisma";

async function main() {
  const user = await prisma.user.update({
    where: { email: "prathamjaiswal204@gmail.com" },
    data: { plan: "PRO" }, // We'll upgrade to PRO for now, and handle PRO_PLUS logic in the API
  });
  console.log(`Upgraded user ${user.email} to ${user.plan} plan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
