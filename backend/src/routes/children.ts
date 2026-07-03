import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const childrenRouter = Router();
childrenRouter.use(authRequired);

const childSchema = z.object({
  fullName: z.string().min(1, "Ad soyad gerekli"),
  guardianId: z.coerce.number().int().positive(),
  birthDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

childrenRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const guardianId = req.query.guardianId ? Number(req.query.guardianId) : undefined;
    const children = await prisma.child.findMany({
      where: guardianId ? { guardianId } : undefined,
      include: { guardian: true },
      orderBy: { fullName: "asc" },
    });
    res.json(children);
  })
);

childrenRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = childSchema.parse(req.body);
    const child = await prisma.child.create({
      data: {
        fullName: data.fullName,
        guardianId: data.guardianId,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        note: data.note ?? null,
      },
    });
    res.status(201).json(child);
  })
);

childrenRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = childSchema.parse(req.body);
    const child = await prisma.child.update({
      where: { id: Number(req.params.id) },
      data: {
        fullName: data.fullName,
        guardianId: data.guardianId,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        note: data.note ?? null,
      },
    });
    res.json(child);
  })
);

childrenRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.child.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);
