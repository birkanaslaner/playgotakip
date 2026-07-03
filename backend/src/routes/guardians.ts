import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const guardiansRouter = Router();
guardiansRouter.use(authRequired);

const guardianSchema = z.object({
  fullName: z.string().min(1, "Ad soyad gerekli"),
  phone: z.string().min(1, "Telefon gerekli"),
  note: z.string().optional().nullable(),
});

guardiansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const guardians = await prisma.guardian.findMany({
      where: q
        ? {
            OR: [
              { fullName: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      include: { children: true },
      orderBy: { fullName: "asc" },
    });
    res.json(guardians);
  })
);

guardiansRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const guardian = await prisma.guardian.findUnique({
      where: { id: Number(req.params.id) },
      include: { children: true },
    });
    if (!guardian) return res.status(404).json({ error: "Veli bulunamadi" });
    res.json(guardian);
  })
);

guardiansRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = guardianSchema.parse(req.body);
    const guardian = await prisma.guardian.create({ data });
    res.status(201).json(guardian);
  })
);

guardiansRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = guardianSchema.parse(req.body);
    const guardian = await prisma.guardian.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(guardian);
  })
);

guardiansRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.guardian.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);
