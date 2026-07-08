import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Ali", "Ayşe", "Mehmet", "Zeynep", "Can", "Elif", "Burak", "Selin", "Emre", "Defne",
  "Kerem", "Ece", "Oğuz", "Merve", "Barış", "Ceren", "Tolga", "Dilara", "Serkan", "Gizem",
  "Alp", "Sevval", "Aslan", "Faruk", "Deniz", "Ege", "Arda", "Yağmur", "Kaan", "Buse",
  "Onur", "Sude", "Cem", "İrem", "Umut", "Naz", "Berk", "Melis", "Tuna", "Ebru",
];

const LAST_NAMES = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Aydın", "Öztürk", "Arslan", "Doğan",
  "Kılıç", "Aslan", "Çetin", "Koç", "Kurt", "Özkan", "Polat", "Aksoy", "Erdoğan", "Güneş",
  "Acar", "Tekin", "Yavuz", "Karaca", "Bulut", "Taş", "Korkmaz", "Şimşek", "Bayrak", "Uçar",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function phone(i: number): string {
  const base = 5300000000 + i * 7919;
  const s = String(base).slice(0, 11);
  return `${s.slice(0, 4)} ${s.slice(4, 7)} ${s.slice(7, 9)} ${s.slice(9, 11)}`;
}

async function main() {
  const staff = await prisma.user.findFirst();
  if (!staff) throw new Error("Kullanici bulunamadi. Once seed calistirin.");

  let areas = await prisma.playArea.findMany({ orderBy: { createdAt: "asc" } });
  if (areas.length < 2) {
    const names = ["Orman", "Manzara"];
    for (const name of names) {
      const exists = areas.find((a) => a.name === name);
      if (!exists) {
        await prisma.playArea.create({ data: { name } });
      }
    }
    areas = await prisma.playArea.findMany({ orderBy: { createdAt: "asc" } });
  }

  const areaA = areas[0].name;
  const areaB = areas[1]?.name ?? areas[0].name;

  let plans = await prisma.pricingPlan.findMany({ where: { active: true } });
  if (plans.length === 0) throw new Error("Aktif paket yok.");

  for (const area of [areaA, areaB]) {
    if (!plans.some((p) => p.playArea === area)) {
      await prisma.pricingPlan.create({
        data: {
          name: `${area} 60dk`,
          type: "SABIT",
          price: 200 + Math.floor(Math.random() * 150),
          unitMinutes: 60,
          playArea: area,
          label: `${area} 60 dk`,
          weekdayPrice: 250,
          weekendPrice: 300,
          active: true,
        },
      });
    }
  }
  plans = await prisma.pricingPlan.findMany({ where: { active: true } });

  const plansA = plans.filter((p) => p.playArea === areaA);
  const plansB = plans.filter((p) => p.playArea === areaB);
  if (!plansA.length || !plansB.length) {
    throw new Error("Her iki oyun alani icin paket gerekli.");
  }

  // ~28 veli; ilk 12'sinde 2-3 cocuk, geri kalan tek cocuk -> toplam 100 ziyaret
  const guardianGroups: { guardianName: string; childNames: string[]; phone: string }[] = [];
  let remaining = 100;
  let g = 0;
  while (remaining > 0) {
    const multi = g < 12;
    const childCount = multi ? Math.min(remaining, 2 + (g % 2)) : Math.min(remaining, 1);
    const children: string[] = [];
    for (let c = 0; c < childCount; c++) {
      const idx = 100 - remaining + c;
      children.push(`${pick(FIRST_NAMES, idx * 3)} ${pick(LAST_NAMES, idx * 7)}`);
    }
    guardianGroups.push({
      guardianName: `${pick(FIRST_NAMES, g * 5 + 1)} ${pick(LAST_NAMES, g * 11)}`,
      childNames: children,
      phone: phone(1000 + g),
    });
    remaining -= childCount;
    g++;
  }

  const now = Date.now();
  let visitIndex = 0;
  let created = 0;

  for (const group of guardianGroups) {
    const guardian = await prisma.guardian.create({
      data: { fullName: group.guardianName, phone: group.phone },
    });

    for (const childName of group.childNames) {
      const child = await prisma.child.create({
        data: { fullName: childName, guardianId: guardian.id },
      });

      const isAreaA = visitIndex < 50;
      const areaPlans = isAreaA ? plansA : plansB;
      const plan = areaPlans[visitIndex % areaPlans.length];

      // Cesitlilik: farkli giris zamanlari, indirim, odeme, ek sure
      const minutesAgo = 5 + (visitIndex % 55);
      const checkInAt = new Date(now - minutesAgo * 60_000);
      const discount = visitIndex % 7 === 0 ? 10 + (visitIndex % 5) * 5 : 0;
      const extraMinutes = visitIndex % 11 === 0 ? 15 : 0;
      const extraCharge = extraMinutes > 0 ? 45 : 0;
      const paymentMethod = visitIndex % 2 === 0 ? "NAKIT" : "KART";
      const wristbandNo = String(90000 + visitIndex);

      await prisma.visit.create({
        data: {
          childId: child.id,
          guardianId: guardian.id,
          pricingPlanId: plan.id,
          wristbandNo,
          checkInAt,
          discount,
          extraMinutes,
          extraCharge,
          paymentMethod,
          membershipMonths: visitIndex % 5 === 0 ? [1, 2, 3, 6, 12][visitIndex % 5] : null,
          membershipEndAt:
            visitIndex % 5 === 0
              ? new Date(checkInAt.getTime() + 30 * 24 * 60 * 60_000)
              : null,
          staffId: staff.id,
        },
      });

      visitIndex++;
      created++;
    }
  }

  console.log(`Tamamlandi: ${created} aktif ziyaret eklendi.`);
  console.log(`Oyun alanlari: ${areaA} (~50), ${areaB} (~50)`);
  console.log(`Veli gruplari: ${guardianGroups.length} (bazi velilerde birden fazla cocuk)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
