import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";
import { calculateAmount, diffMinutes } from "../utils/pricing";

export const visitsRouter = Router();
visitsRouter.use(authRequired);

const includeRefs = {
  child: true,
  guardian: true,
  pricingPlan: true,
  staff: { select: { id: true, fullName: true } },
} as const;

const checkInSchema = z.object({
  childId: z.coerce.number().int().positive(),
  guardianId: z.coerce.number().int().positive(),
  pricingPlanId: z.coerce.number().int().positive(),
  wristbandNo: z.string().min(1, "Bileklik numarasi gerekli"),
  discount: z.coerce.number().nonnegative().optional().default(0),
  paymentMethod: z.enum(["NAKIT", "KART"]).optional(),
  membershipMonths: z.coerce.number().int().positive().optional(),
  membershipEndAt: z.coerce.date().optional(),
});

const checkOutSchema = z.object({
  paymentMethod: z.enum(["NAKIT", "KART"]).default("NAKIT"),
  wristbandNo: z.string().optional(),
});

// Ziyaret listesi: ?status=active | done | all (varsayilan all)
visitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) ?? "all";
    const where =
      status === "active"
        ? { checkOutAt: null }
        : status === "done"
          ? { checkOutAt: { not: null } }
          : {};
    const visits = await prisma.visit.findMany({
      where,
      include: includeRefs,
      orderBy: { checkInAt: "desc" },
    });
    res.json(visits);
  })
);

// Giris yap (check-in)
visitsRouter.post(
  "/check-in",
  asyncHandler(async (req, res) => {
    const data = checkInSchema.parse(req.body);

    const child = await prisma.child.findUnique({ where: { id: data.childId } });
    if (!child) return res.status(404).json({ error: "Cocuk bulunamadi" });
    if (child.guardianId !== data.guardianId) {
      return res.status(400).json({ error: "Cocuk secilen veliye ait degil" });
    }

    const plan = await prisma.pricingPlan.findUnique({ where: { id: data.pricingPlanId } });
    if (!plan || !plan.active) {
      return res.status(400).json({ error: "Gecersiz tarife" });
    }

    // Ayni bileklik su an aktifse engelle
    const activeBand = await prisma.visit.findFirst({
      where: { wristbandNo: data.wristbandNo, checkOutAt: null },
    });
    if (activeBand) {
      return res.status(409).json({ error: "Bu bileklik su an baska bir ziyarette kullaniliyor" });
    }

    const visit = await prisma.visit.create({
      data: {
        childId: data.childId,
        guardianId: data.guardianId,
        pricingPlanId: data.pricingPlanId,
        wristbandNo: data.wristbandNo,
        discount: data.discount,
        paymentMethod: data.paymentMethod,
        membershipMonths: data.membershipMonths,
        membershipEndAt: data.membershipEndAt,
        staffId: req.user!.id,
      },
      include: includeRefs,
    });
    res.status(201).json(visit);
  })
);

const extendSchema = z.object({
  minutes: z.coerce.number().int().positive(),
  fee: z.coerce.number().nonnegative().optional().default(0),
});

// Sureyi uzat (ek dakika + ek ucret ekle)
visitsRouter.post(
  "/:id/extend",
  asyncHandler(async (req, res) => {
    const { minutes, fee } = extendSchema.parse(req.body);
    const existing = await prisma.visit.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Ziyaret bulunamadi" });
    if (existing.checkOutAt) return res.status(400).json({ error: "Ziyaret zaten kapatilmis" });
    const visit = await prisma.visit.update({
      where: { id: existing.id },
      data: {
        extraMinutes: existing.extraMinutes + minutes,
        extraCharge: existing.extraCharge + fee,
      },
      include: includeRefs,
    });
    res.json(visit);
  })
);

// Sayaci duraklat / devam ettir
visitsRouter.post(
  "/:id/toggle-pause",
  asyncHandler(async (req, res) => {
    const existing = await prisma.visit.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Ziyaret bulunamadi" });
    if (existing.checkOutAt) return res.status(400).json({ error: "Ziyaret zaten kapatilmis" });
    const now = new Date();
    const data = existing.pausedAt
      ? { pausedAt: null, pausedMs: existing.pausedMs + (now.getTime() - existing.pausedAt.getTime()) }
      : { pausedAt: now };
    const visit = await prisma.visit.update({
      where: { id: existing.id },
      data,
      include: includeRefs,
    });
    res.json(visit);
  })
);

// Ziyareti iptal et (sil)
visitsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.visit.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Ziyaret bulunamadi" });
    await prisma.visit.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

// Cikista beklenen tutari onizle
visitsRouter.get(
  "/:id/quote",
  asyncHandler(async (req, res) => {
    const visit = await prisma.visit.findUnique({
      where: { id: Number(req.params.id) },
      include: { pricingPlan: true },
    });
    if (!visit) return res.status(404).json({ error: "Ziyaret bulunamadi" });
    if (visit.checkOutAt) return res.status(400).json({ error: "Ziyaret zaten kapatilmis" });
    const now = new Date();
    const durationMin = diffMinutes(visit.checkInAt, now);
    const gross = calculateAmount(visit.pricingPlan, durationMin, visit.checkInAt) + (visit.extraCharge ?? 0);
    const discount = visit.discount ?? 0;
    const amount = Math.max(0, gross - discount);
    res.json({ durationMin, gross, discount, amount });
  })
);

// Cikis yap (check-out)
visitsRouter.post(
  "/:id/check-out",
  asyncHandler(async (req, res) => {
    const data = checkOutSchema.parse(req.body);
    const existing = await prisma.visit.findUnique({
      where: { id: Number(req.params.id) },
      include: { pricingPlan: true },
    });
    if (!existing) return res.status(404).json({ error: "Ziyaret bulunamadi" });
    if (existing.checkOutAt) return res.status(400).json({ error: "Ziyaret zaten kapatilmis" });

    // Guvenlik: bileklik dogrulamasi (opsiyonel gonderilirse)
    if (data.wristbandNo && data.wristbandNo !== existing.wristbandNo) {
      return res.status(400).json({ error: "Bileklik numarasi eslesmiyor" });
    }

    const now = new Date();
    const durationMin = diffMinutes(existing.checkInAt, now);
    const gross =
      calculateAmount(existing.pricingPlan, durationMin, existing.checkInAt) +
      (existing.extraCharge ?? 0);
    const amount = Math.max(0, gross - (existing.discount ?? 0));

    const visit = await prisma.visit.update({
      where: { id: existing.id },
      data: {
        checkOutAt: now,
        durationMin,
        amount,
        paymentStatus: "ODENDI",
        paymentMethod: data.paymentMethod,
        staffId: req.user!.id,
      },
      include: includeRefs,
    });
    res.json(visit);
  })
);
