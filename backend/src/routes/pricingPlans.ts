import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const pricingPlansRouter = Router();
pricingPlansRouter.use(authRequired);

const planSchema = z.object({
  name: z.string().min(1, "Tarife adi gerekli"),
  type: z.enum(["SAATLIK", "SABIT", "PAKET"]).default("SAATLIK"),
  price: z.coerce.number().nonnegative(),
  unitMinutes: z.coerce.number().int().positive().default(60),
  active: z.boolean().optional(),
});

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
    const plan = await prisma.pricingPlan.create({ data });
    res.status(201).json(plan);
  })
);

pricingPlansRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = planSchema.parse(req.body);
    const plan = await prisma.pricingPlan.update({
      where: { id: Number(req.params.id) },
      data,
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
