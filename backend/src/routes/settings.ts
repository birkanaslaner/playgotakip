import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { authRequired } from "../middleware/auth";

export const settingsRouter = Router();
settingsRouter.use(authRequired);

const bodySchema = z.record(z.string(), z.string());

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) result[row.key] = row.value;
    res.json(result);
  })
);

settingsRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const data = bodySchema.parse(req.body);
    await prisma.$transaction(
      Object.entries(data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
    const rows = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) result[row.key] = row.value;
    res.json(result);
  })
);
