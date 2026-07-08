export type Role = "ADMIN" | "STAFF";
export type PricingType = "SAATLIK" | "SABIT" | "PAKET";
export type PaymentStatus = "BEKLIYOR" | "ODENDI";
export type PaymentMethod = "NAKIT" | "KART";
export type TableStatus = "UYGUN" | "DOLU" | "PASIF";

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

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
}

export interface PlayArea {
  id: number;
  name: string;
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  vatRate: number;
  image?: string | null;
  active: boolean;
  showInQrMenu: boolean;
  qrDescription?: string | null;
  tags?: string | null;
  categoryId?: number | null;
  category?: Category | null;
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
  playArea?: string | null;
  label?: string | null;
  weekdayPrice?: number | null;
  weekendPrice?: number | null;
  carryOver?: boolean;
  loyalty?: boolean;
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
  discount?: number | null;
  extraMinutes?: number | null;
  extraCharge?: number | null;
  pausedAt?: string | null;
  pausedMs?: number | null;
  membershipMonths?: number | null;
  membershipEndAt?: string | null;
  amount?: number | null;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  child?: Child;
  guardian?: Guardian;
  pricingPlan?: PricingPlan;
  staff?: { id: number; fullName: string } | null;
}

export interface TabItem {
  id: number;
  tabId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
  createdAt?: string;
  product?: Product;
}

export interface TableTab {
  id: number;
  tableId: number;
  total: number;
  paidAmount: number;
  paymentMethod?: PaymentMethod | null;
  openedAt: string;
  closedAt?: string | null;
  items?: TabItem[];
}

export interface CafeTable {
  id: number;
  name: string;
  status: TableStatus;
  sortOrder: number;
  createdAt?: string;
  openTab?: TableTab | null;
}

export interface TableStats {
  total: number;
  occupied: number;
  available: number;
  passive: number;
  openTotal: number;
}
