import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.cafeTable.findMany({ orderBy: { id: "asc" } });
  const seen = new Set<string>();
  const toDelete: number[] = [];

  for (const table of tables) {
    const key = table.name.toLocaleUpperCase("tr");
    if (seen.has(key)) toDelete.push(table.id);
    else seen.add(key);
  }

  if (toDelete.length > 0) {
    await prisma.cafeTable.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Silinen yinelenen masa: ${toDelete.length}`);
  } else {
    console.log("Yinelenen masa yok.");
  }
}

main().finally(() => prisma.$disconnect());
