import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const playAreasRouter = Router();
playAreasRouter.use(authRequired);

const areaSchema = z.object({
  name: z.string().min(1, "Oyun alanı adı gerekli"),
});

playAreasRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const areas = await prisma.playArea.findMany({ orderBy: { createdAt: "asc" } });
    res.json(areas);
  })
);

playAreasRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = areaSchema.parse(req.body);
    const area = await prisma.playArea.create({ data: { name: data.name.trim() } });
    res.status(201).json(area);
  })
);

playAreasRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = areaSchema.parse(req.body);
    const area = await prisma.playArea.update({
      where: { id: Number(req.params.id) },
      data: { name: data.name.trim() },
    });
    res.json(area);
  })
);

playAreasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.playArea.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);
