import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(authRequired);

function dayRange(dateStr?: string) {
  const base = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
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
