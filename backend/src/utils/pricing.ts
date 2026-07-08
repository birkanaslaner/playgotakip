import type { PricingPlan } from "@prisma/client";

/** Verilen tarihin hafta sonu olup olmadigina gore gecerli birim fiyati doner. */
export function priceForDate(plan: PricingPlan, date: Date = new Date()): number {
  const day = date.getDay(); // 0 = Pazar, 6 = Cumartesi
  const isWeekend = day === 0 || day === 6;
  const weekday = plan.weekdayPrice ?? plan.price;
  const weekend = plan.weekendPrice ?? plan.price;
  return isWeekend ? weekend : weekday;
}

/**
 * Ziyaret suresine ve tarifeye gore odenecek tutari hesaplar.
 * - SAATLIK: baslanan her birim (unitMinutes) icin fiyat alinir (en az 1 birim).
 * - SABIT / PAKET: sureden bagimsiz sabit fiyat.
 * Haftaici / haftasonu fiyati ziyaretin giris tarihine gore secilir.
 */
export function calculateAmount(
  plan: PricingPlan,
  durationMin: number,
  date: Date = new Date()
): number {
  const unitPrice = priceForDate(plan, date);
  const safeDuration = Math.max(0, durationMin);
  if (plan.type === "SAATLIK") {
    const units = Math.max(1, Math.ceil(safeDuration / plan.unitMinutes));
    return Number((units * unitPrice).toFixed(2));
  }
  return Number(unitPrice.toFixed(2));
}

export function diffMinutes(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}
