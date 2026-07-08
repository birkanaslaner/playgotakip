import { Router } from "express";
import { z } from "zod";
import { TableStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const tablesRouter = Router();
tablesRouter.use(authRequired);

const DUPLICATE_TABLE_NAME =
  "Bu isimde mevcut bir masa var. Başka bir masa ismi giriniz.";

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
  const count = await prisma.cafeTable.count();
  if (count > 0) return;

  for (let i = 0; i < DEFAULT_TABLES.length; i++) {
    const t = DEFAULT_TABLES[i];
    await prisma.cafeTable.create({
      data: { name: t.name, status: t.status, sortOrder: i },
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

async function loadTableDetail(id: number) {
  const table = await prisma.cafeTable.findUnique({
    where: { id },
    include: {
      tabs: {
        where: { closedAt: null },
        orderBy: { openedAt: "desc" },
        take: 1,
        include: {
          items: {
            include: { product: { include: { category: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!table) return null;
  const { tabs, ...rest } = table;
  return { ...rest, openTab: tabs[0] ?? null };
}

async function recalcTabTotal(tabId: number) {
  const items = await prisma.tabItem.findMany({ where: { tabId } });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  await prisma.tableTab.update({
    where: { id: tabId },
    data: { total: Number(total.toFixed(2)) },
  });
}

async function getOrCreateOpenTab(tableId: number) {
  let tab = await prisma.tableTab.findFirst({
    where: { tableId, closedAt: null },
  });
  if (!tab) {
    tab = await prisma.tableTab.create({ data: { tableId } });
    await prisma.cafeTable.update({
      where: { id: tableId },
      data: { status: "DOLU" },
    });
  }
  return tab;
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

tablesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const table = await loadTableDetail(id);
    if (!table) return res.status(404).json({ error: "Masa bulunamadı" });
    res.json(table);
  })
);

const addItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().default(1),
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(0),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  method: z.enum(["NAKIT", "KART"]).default("NAKIT"),
});

const moveSchema = z.object({
  targetTableId: z.coerce.number().int().positive(),
});

tablesRouter.post(
  "/:id/items",
  asyncHandler(async (req, res) => {
    const tableId = Number(req.params.id);
    const data = addItemSchema.parse(req.body);

    const table = await prisma.cafeTable.findUnique({ where: { id: tableId } });
    if (!table) return res.status(404).json({ error: "Masa bulunamadı" });
    if (table.status === "PASIF") {
      return res.status(400).json({ error: "Pasif masaya ürün eklenemez" });
    }

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product || !product.active) {
      return res.status(400).json({ error: "Ürün bulunamadı" });
    }

    const tab = await getOrCreateOpenTab(tableId);
    const existing = await prisma.tabItem.findUnique({
      where: { tabId_productId: { tabId: tab.id, productId: data.productId } },
    });

    if (existing) {
      const quantity = existing.quantity + data.quantity;
      await prisma.tabItem.update({
        where: { id: existing.id },
        data: {
          quantity,
          lineTotal: Number((quantity * existing.unitPrice).toFixed(2)),
        },
      });
    } else {
      await prisma.tabItem.create({
        data: {
          tabId: tab.id,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: product.price,
          vatRate: product.vatRate,
          lineTotal: Number((data.quantity * product.price).toFixed(2)),
        },
      });
    }

    await recalcTabTotal(tab.id);
    const detail = await loadTableDetail(tableId);
    res.json(detail);
  })
);

tablesRouter.patch(
  "/:id/items/:itemId",
  asyncHandler(async (req, res) => {
    const tableId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { quantity } = updateItemSchema.parse(req.body);

    const tab = await prisma.tableTab.findFirst({
      where: { tableId, closedAt: null },
    });
    if (!tab) return res.status(404).json({ error: "Açık adisyon bulunamadı" });

    const item = await prisma.tabItem.findFirst({
      where: { id: itemId, tabId: tab.id },
    });
    if (!item) return res.status(404).json({ error: "Kalem bulunamadı" });

    if (quantity === 0) {
      await prisma.tabItem.delete({ where: { id: item.id } });
    } else {
      await prisma.tabItem.update({
        where: { id: item.id },
        data: {
          quantity,
          lineTotal: Number((quantity * item.unitPrice).toFixed(2)),
        },
      });
    }

    await recalcTabTotal(tab.id);
    const detail = await loadTableDetail(tableId);
    res.json(detail);
  })
);

tablesRouter.delete(
  "/:id/items/:itemId",
  asyncHandler(async (req, res) => {
    const tableId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    const tab = await prisma.tableTab.findFirst({
      where: { tableId, closedAt: null },
    });
    if (!tab) return res.status(404).json({ error: "Açık adisyon bulunamadı" });

    const item = await prisma.tabItem.findFirst({
      where: { id: itemId, tabId: tab.id },
    });
    if (!item) return res.status(404).json({ error: "Kalem bulunamadı" });

    await prisma.tabItem.delete({ where: { id: item.id } });
    await recalcTabTotal(tab.id);

    const remaining = await prisma.tabItem.count({ where: { tabId: tab.id } });
    if (remaining === 0 && tab.paidAmount === 0) {
      await prisma.tableTab.delete({ where: { id: tab.id } });
      await prisma.cafeTable.update({
        where: { id: tableId },
        data: { status: "UYGUN" },
      });
    }

    const detail = await loadTableDetail(tableId);
    res.json(detail);
  })
);

tablesRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const tableId = Number(req.params.id);

    const tab = await prisma.tableTab.findFirst({
      where: { tableId, closedAt: null },
    });
    if (!tab) return res.status(400).json({ error: "Açık adisyon yok" });
    if (tab.paidAmount > 0) {
      return res.status(400).json({ error: "Ödeme alınmış adisyon iptal edilemez" });
    }

    await prisma.$transaction([
      prisma.tabItem.deleteMany({ where: { tabId: tab.id } }),
      prisma.tableTab.delete({ where: { id: tab.id } }),
      prisma.cafeTable.update({
        where: { id: tableId },
        data: { status: "UYGUN" },
      }),
    ]);

    const detail = await loadTableDetail(tableId);
    res.json(detail);
  })
);

tablesRouter.post(
  "/:id/payment",
  asyncHandler(async (req, res) => {
    const tableId = Number(req.params.id);
    const data = paymentSchema.parse(req.body);

    const tab = await prisma.tableTab.findFirst({
      where: { tableId, closedAt: null },
      include: { items: true },
    });
    if (!tab) return res.status(400).json({ error: "Açık adisyon yok" });
    if (tab.items.length === 0) {
      return res.status(400).json({ error: "Adisyona ürün ekleyin" });
    }

    const remaining = Math.max(0, tab.total - tab.paidAmount);
    if (remaining <= 0) {
      return res.status(400).json({ error: "Ödenecek tutar kalmadı" });
    }

    const payAmount = data.amount ?? remaining;
    if (payAmount > remaining) {
      return res.status(400).json({ error: "Ödeme tutarı kalan tutardan fazla olamaz" });
    }

    const newPaid = Number((tab.paidAmount + payAmount).toFixed(2));
    const fullyPaid = newPaid >= tab.total;

    await prisma.tableTab.update({
      where: { id: tab.id },
      data: {
        paidAmount: newPaid,
        paymentMethod: data.method,
        ...(fullyPaid ? { closedAt: new Date() } : {}),
      },
    });

    if (fullyPaid) {
      await prisma.cafeTable.update({
        where: { id: tableId },
        data: { status: "UYGUN" },
      });
    }

    const detail = await loadTableDetail(tableId);
    res.json(detail);
  })
);

tablesRouter.post(
  "/:id/move",
  asyncHandler(async (req, res) => {
    const sourceTableId = Number(req.params.id);
    const { targetTableId } = moveSchema.parse(req.body);

    if (sourceTableId === targetTableId) {
      return res.status(400).json({ error: "Adisyon zaten bu masada" });
    }

    const sourceTab = await prisma.tableTab.findFirst({
      where: { tableId: sourceTableId, closedAt: null },
      include: { items: true },
    });
    if (!sourceTab) {
      return res.status(400).json({ error: "Taşınacak açık adisyon yok" });
    }
    if (sourceTab.items.length === 0) {
      return res.status(400).json({ error: "Boş adisyon taşınamaz" });
    }

    const targetTable = await prisma.cafeTable.findUnique({
      where: { id: targetTableId },
      include: { tabs: { where: { closedAt: null } } },
    });
    if (!targetTable) return res.status(404).json({ error: "Hedef masa bulunamadı" });
    if (targetTable.status === "PASIF") {
      return res.status(400).json({ error: "Pasif masaya adisyon taşınamaz" });
    }
    if (targetTable.tabs.length > 0) {
      return res.status(400).json({ error: "Hedef masada zaten açık adisyon var" });
    }

    await prisma.$transaction([
      prisma.tableTab.update({
        where: { id: sourceTab.id },
        data: { tableId: targetTableId },
      }),
      prisma.cafeTable.update({
        where: { id: sourceTableId },
        data: { status: "UYGUN" },
      }),
      prisma.cafeTable.update({
        where: { id: targetTableId },
        data: { status: "DOLU" },
      }),
    ]);

    const detail = await loadTableDetail(targetTableId);
    res.json(detail);
  })
);

tablesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const normalizedName = data.name.trim().toLocaleUpperCase("tr");
    const existing = await prisma.cafeTable.findFirst({ where: { name: normalizedName } });
    if (existing) {
      return res.status(409).json({ error: DUPLICATE_TABLE_NAME });
    }
    const maxOrder = await prisma.cafeTable.aggregate({ _max: { sortOrder: true } });
    const table = await prisma.cafeTable.create({
      data: {
        name: normalizedName,
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

    if (data.name != null) {
      const normalizedName = data.name.trim().toLocaleUpperCase("tr");
      if (normalizedName !== existing.name) {
        const duplicate = await prisma.cafeTable.findFirst({ where: { name: normalizedName } });
        if (duplicate) {
          return res.status(409).json({ error: DUPLICATE_TABLE_NAME });
        }
      }
    }

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
        ...(data.name != null ? { name: data.name.trim().toLocaleUpperCase("tr") } : {}),
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
