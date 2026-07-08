import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";
import { diffMinutes } from "../utils/pricing";

export const reportsRouter = Router();
reportsRouter.use(authRequired);

function dayRange(dateStr?: string) {
  const base = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Teslim edilmis ziyarette kullanilan oyun suresi (kalan bakiye haric). */
function completedPlayMinutes(v: {
  checkInAt: Date;
  checkOutAt: Date | null;
  durationMin: number | null;
  extraMinutes: number;
  pausedMs: number;
  pricingPlan: { unitMinutes: number; type: string } | null;
}): number {
  if (!v.checkOutAt) return 0;

  const allocated = (v.pricingPlan?.unitMinutes ?? 0) + (v.extraMinutes ?? 0);
  if (allocated > 0 && v.pricingPlan?.type !== "SAATLIK") {
    const endMs = v.checkInAt.getTime() + allocated * 60000 + (v.pausedMs ?? 0);
    const remainingMs = Math.max(0, endMs - v.checkOutAt.getTime());
    const consumed = allocated - remainingMs / 60000;
    return Math.max(0, Math.round(consumed));
  }

  return v.durationMin ?? diffMinutes(v.checkInAt, v.checkOutAt);
}

// Gunluk gelir ozeti: ?date=YYYY-MM-DD (varsayilan bugun)
reportsRouter.get(
  "/daily",
  asyncHandler(async (req, res) => {
    const { start, end } = dayRange(req.query.date as string | undefined);
    const visits = await prisma.visit.findMany({
      where: { checkOutAt: { gte: start, lt: end }, paymentStatus: "ODENDI" },
      include: { child: true, guardian: true, pricingPlan: true },
      orderBy: { checkOutAt: "desc" },
    });

    const totalRevenue = visits.reduce((sum, v) => sum + (v.amount ?? 0), 0);
    const cash = visits
      .filter((v) => v.paymentMethod === "NAKIT")
      .reduce((sum, v) => sum + (v.amount ?? 0), 0);
    const card = visits
      .filter((v) => v.paymentMethod === "KART")
      .reduce((sum, v) => sum + (v.amount ?? 0), 0);

    res.json({
      date: start.toISOString().slice(0, 10),
      visitCount: visits.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      cash: Number(cash.toFixed(2)),
      card: Number(card.toFixed(2)),
      visits,
    });
  })
);

// Anlik doluluk (aktif ziyaretler)
reportsRouter.get(
  "/occupancy",
  asyncHandler(async (_req, res) => {
    const active = await prisma.visit.findMany({
      where: { checkOutAt: null },
      include: { child: true, guardian: true, pricingPlan: true },
      orderBy: { checkInAt: "asc" },
    });
    res.json({ activeCount: active.length, visits: active });
  })
);

// Oyun alani dagilimi — bugune kadar o alanda bulunan tum cocuklar
// (teslim edilenler + aktif / duraklatilan / suresi dolan kayitlar)
reportsRouter.get(
  "/play-area-distribution",
  asyncHandler(async (_req, res) => {
    const visits = await prisma.visit.findMany({
      include: { pricingPlan: true },
    });

    const map = new Map<string, number>();

    for (const v of visits) {
      const area = v.pricingPlan?.playArea ?? "Diğer";
      map.set(area, (map.get(area) ?? 0) + 1);
    }

    const totalVisits = visits.length;

    const areas = [...map.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => a.area.localeCompare(b.area, "tr"));

    res.json({ totalVisits, areas });
  })
);

// Toplam oyun suresi — yalnizca teslim edilmis (tamamlanmis) ziyaretler
reportsRouter.get(
  "/total-play-time",
  asyncHandler(async (_req, res) => {
    const visits = await prisma.visit.findMany({
      where: { checkOutAt: { not: null }, paymentStatus: "ODENDI" },
      include: { pricingPlan: true },
    });

    const totalMinutes = visits.reduce((sum, v) => sum + completedPlayMinutes(v), 0);

    res.json({ totalMinutes });
  })
);
