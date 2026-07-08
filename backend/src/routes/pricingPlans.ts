import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const pricingPlansRouter = Router();
pricingPlansRouter.use(authRequired);

const typeLabels: Record<string, string> = {
  SAATLIK: "Saatlik",
  SABIT: "Sabit Paket",
  PAKET: "Paket",
};

const planSchema = z.object({
  type: z.enum(["SAATLIK", "SABIT", "PAKET"]).default("SABIT"),
  playArea: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  unitMinutes: z.coerce.number().int().positive().default(30),
  weekdayPrice: z.coerce.number().nonnegative(),
  weekendPrice: z.coerce.number().nonnegative().optional(),
  carryOver: z.boolean().optional().default(false),
  loyalty: z.boolean().optional().default(false),
  active: z.boolean().optional(),
});

type PlanInput = z.infer<typeof planSchema>;

function buildData(data: PlanInput) {
  const label = data.label?.trim() || null;
  const name = label || `${typeLabels[data.type]} ${data.unitMinutes} dk`;
  return {
    name,
    label,
    type: data.type,
    playArea: data.playArea?.trim() || null,
    unitMinutes: data.unitMinutes,
    price: data.weekdayPrice,
    weekdayPrice: data.weekdayPrice,
    weekendPrice: data.weekendPrice ?? data.weekdayPrice,
    carryOver: data.carryOver,
    loyalty: data.loyalty,
    ...(data.active !== undefined ? { active: data.active } : {}),
  };
}

pricingPlansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const onlyActive = req.query.active === "true";
    const plans = await prisma.pricingPlan.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(plans);
  })
);

pricingPlansRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = planSchema.parse(req.body);
    const plan = await prisma.pricingPlan.create({ data: buildData(data) });
    res.status(201).json(plan);
  })
);

pricingPlansRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = planSchema.parse(req.body);
    const plan = await prisma.pricingPlan.update({
      where: { id: Number(req.params.id) },
      data: buildData(data),
    });
    res.json(plan);
  })
);

pricingPlansRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.pricingPlan.update({
      where: { id: Number(req.params.id) },
      data: { active: false },
    });
    res.status(204).end();
  })
);
