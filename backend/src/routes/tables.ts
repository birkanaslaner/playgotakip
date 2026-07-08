import { Router } from "express";
import { z } from "zod";
import { TableStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const tablesRouter = Router();
tablesRouter.use(authRequired);

const DEFAULT_TABLES: { name: string; status: TableStatus }[] = [
  { name: "MASA 1", status: "UYGUN" },
  { name: "MASA 2", status: "UYGUN" },
  { name: "MASA 3", status: "PASIF" },
  { name: "BAHÇE 01", status: "UYGUN" },
  { name: "BAHÇE 02", status: "UYGUN" },
  { name: "BAHÇE 03", status: "PASIF" },
  { name: "BAHÇE 04", status: "UYGUN" },
];

async function ensureDefaultTables() {
  for (let i = 0; i < DEFAULT_TABLES.length; i++) {
    const t = DEFAULT_TABLES[i];
    await prisma.cafeTable.upsert({
      where: { name: t.name },
      create: { name: t.name, status: t.status, sortOrder: i },
      update: {},
    });
  }
}

async function listTablesWithOpenTab() {
  const tables = await prisma.cafeTable.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      tabs: {
        where: { closedAt: null },
        orderBy: { openedAt: "desc" },
        take: 1,
      },
    },
  });

  return tables.map(({ tabs, ...table }) => ({
    ...table,
    openTab: tabs[0] ?? null,
  }));
}

const createSchema = z.object({
  name: z.string().min(1, "Masa adı gerekli"),
  status: z.enum(["UYGUN", "DOLU", "PASIF"]).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["UYGUN", "DOLU", "PASIF"]).optional(),
});

tablesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    await ensureDefaultTables();
    const tables = await listTablesWithOpenTab();
    res.json(tables);
  })
);

tablesRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    await ensureDefaultTables();
    const tables = await listTablesWithOpenTab();

    const total = tables.length;
    const occupied = tables.filter((t) => t.status === "DOLU").length;
    const available = tables.filter((t) => t.status === "UYGUN").length;
    const passive = tables.filter((t) => t.status === "PASIF").length;
    const openTotal = tables.reduce((sum, t) => sum + (t.openTab?.total ?? 0), 0);

    res.json({ total, occupied, available, passive, openTotal: Number(openTotal.toFixed(2)) });
  })
);

tablesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const maxOrder = await prisma.cafeTable.aggregate({ _max: { sortOrder: true } });
    const table = await prisma.cafeTable.create({
      data: {
        name: data.name.trim().toUpperCase(),
        status: (data.status as TableStatus) ?? "UYGUN",
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    res.status(201).json({ ...table, openTab: null });
  })
);

tablesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const id = Number(req.params.id);
    const existing = await prisma.cafeTable.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Masa bulunamadı" });

    if (data.status === "PASIF" || data.status === "UYGUN") {
      const openTab = await prisma.tableTab.findFirst({
        where: { tableId: id, closedAt: null },
      });
      if (openTab) {
        return res.status(400).json({ error: "Açık adisyonu olan masa güncellenemez" });
      }
    }

    const table = await prisma.cafeTable.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name.trim().toUpperCase() } : {}),
        ...(data.status != null ? { status: data.status as TableStatus } : {}),
      },
      include: {
        tabs: { where: { closedAt: null }, take: 1 },
      },
    });

    const { tabs, ...rest } = table;
    res.json({ ...rest, openTab: tabs[0] ?? null });
  })
);

tablesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.cafeTable.findUnique({
      where: { id },
      include: { tabs: { where: { closedAt: null } } },
    });
    if (!existing) return res.status(404).json({ error: "Masa bulunamadı" });
    if (existing.tabs.length > 0) {
      return res.status(400).json({ error: "Açık adisyonu olan masa silinemez" });
    }
    await prisma.cafeTable.delete({ where: { id } });
    res.status(204).end();
  })
);
