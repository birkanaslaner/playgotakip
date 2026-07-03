export type Role = "ADMIN" | "STAFF";
export type PricingType = "SAATLIK" | "SABIT" | "PAKET";
export type PaymentStatus = "BEKLIYOR" | "ODENDI";
export type PaymentMethod = "NAKIT" | "KART";

export interface User {
  id: number;
  fullName: string;
  username: string;
  role: Role;
}

export interface Child {
  id: number;
  fullName: string;
  birthDate?: string | null;
  note?: string | null;
  guardianId: number;
}

export interface Guardian {
  id: number;
  fullName: string;
  phone: string;
  note?: string | null;
  createdAt?: string;
  children?: Child[];
}

export interface PricingPlan {
  id: number;
  name: string;
  type: PricingType;
  price: number;
  unitMinutes: number;
  active: boolean;
}

export interface Visit {
  id: number;
  childId: number;
  guardianId: number;
  pricingPlanId: number;
  wristbandNo: string;
  checkInAt: string;
  checkOutAt?: string | null;
  durationMin?: number | null;
  amount?: number | null;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  child?: Child;
  guardian?: Guardian;
  pricingPlan?: PricingPlan;
  staff?: { id: number; fullName: string } | null;
}
