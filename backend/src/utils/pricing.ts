import type { PricingPlan } from "@prisma/client";

/**
 * Ziyaret suresine ve tarifeye gore odenecek tutari hesaplar.
 * - SAATLIK: baslanan her birim (unitMinutes) icin fiyat alinir (en az 1 birim).
 * - SABIT / PAKET: sureden bagimsiz sabit fiyat.
 */
export function calculateAmount(plan: PricingPlan, durationMin: number): number {
  const safeDuration = Math.max(0, durationMin);
  if (plan.type === "SAATLIK") {
    const units = Math.max(1, Math.ceil(safeDuration / plan.unitMinutes));
    return Number((units * plan.price).toFixed(2));
  }
  return Number(plan.price.toFixed(2));
}

export function diffMinutes(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}
