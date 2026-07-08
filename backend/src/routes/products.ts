import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const productsRouter = Router();
productsRouter.use(authRequired);

const productSchema = z.object({
  name: z.string().min(1, "Urun adi gerekli"),
  categoryId: z.coerce.number().int().positive("Kategori seçimi zorunludur"),
  price: z.coerce.number().nonnegative().default(0),
  stock: z.coerce.number().int().default(0),
  vatRate: z.coerce.number().int().min(0).max(100).default(10),
  image: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
  showInQrMenu: z.boolean().optional().default(true),
  qrDescription: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
});

type ProductInput = z.infer<typeof productSchema>;

function buildData(data: ProductInput) {
  return {
    name: data.name,
    categoryId: data.categoryId,
    price: data.price,
    stock: data.stock,
    vatRate: data.vatRate,
    image: data.image ?? null,
    active: data.active,
    showInQrMenu: data.showInQrMenu,
    qrDescription: data.qrDescription?.trim() || null,
    tags: data.tags?.trim() || null,
  };
}

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  })
);

productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: buildData(data),
      include: { category: true },
    });
    res.status(201).json(product);
  })
);

productsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: buildData(data),
      include: { category: true },
    });
    res.json(product);
  })
);

productsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);
