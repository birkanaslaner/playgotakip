import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

const DUPLICATE_TABLE_NAME =
  "Bu isimde mevcut bir masa var. Başka bir masa ismi giriniz.";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Kaynak bulunamadi" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Gecersiz veri", details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({ error: DUPLICATE_TABLE_NAME });
  }
  console.error(err);
  res.status(500).json({ error: "Sunucu hatasi" });
}

// Async route handler'lari icin sarmalayici
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
