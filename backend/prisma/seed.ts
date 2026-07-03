import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      fullName: "Yonetici",
      username: "admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const planCount = await prisma.pricingPlan.count();
  if (planCount === 0) {
    await prisma.pricingPlan.createMany({
      data: [
        { name: "Saatlik", type: "SAATLIK", price: 150, unitMinutes: 60 },
        { name: "Yarim Saat", type: "SAATLIK", price: 90, unitMinutes: 30 },
        { name: "Gunluk Sabit", type: "SABIT", price: 400, unitMinutes: 60 },
        { name: "10 Giris Paketi", type: "PAKET", price: 1200, unitMinutes: 60 },
      ],
    });
  }

  const guardianCount = await prisma.guardian.count();
  if (guardianCount === 0) {
    const guardian = await prisma.guardian.create({
      data: {
        fullName: "Ayse Yilmaz",
        phone: "0532 000 00 00",
        children: {
          create: [{ fullName: "Deniz Yilmaz" }, { fullName: "Ege Yilmaz" }],
        },
      },
    });
    console.log(`Ornek veli olusturuldu: ${guardian.fullName}`);
  }

  console.log("Seed tamamlandi. Giris: admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
