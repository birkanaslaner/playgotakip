import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.cafeTable.deleteMany();
  console.log(`Silinen masa: ${result.count}`);
}

main().finally(() => prisma.$disconnect());
