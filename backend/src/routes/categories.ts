import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const categoriesRouter = Router();
categoriesRouter.use(authRequired);

const categorySchema = z.object({
  name: z.string().min(1, "Kategori adi gerekli"),
  description: z.string().optional().nullable(),
});

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(categories);
  })
);

categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
    res.status(201).json(category);
  })
);

const reorderSchema = z.object({ ids: z.array(z.coerce.number().int()) });

categoriesRouter.put(
  "/reorder",
  asyncHandler(async (req, res) => {
    const { ids } = reorderSchema.parse(req.body);
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.category.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(categories);
  })
);

categoriesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.update({
      where: { id: Number(req.params.id) },
      data: { name: data.name, description: data.description ?? null },
    });
    res.json(category);
  })
);

categoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);
