import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiError } from "../api/client";
import type { CafeTable, Category, PaymentMethod, Product, TabItem } from "../api/types";
import { Icon } from "../components/icons";
import { formatCurrency, formatDateTime } from "../utils/format";

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product,
  cartQty,
  onAdd,
  pending,
}: {
  product: Product;
  cartQty: number;
  onAdd: () => void;
  pending: boolean;
}) {
  return (
    <div className="group relative flex min-h-[72px] items-center gap-3 overflow-visible rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="relative z-[1] h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-50">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain object-center p-0.5"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="box" className="h-5 w-5 text-slate-300" />
          </div>
        )}
      </div>

      {cartQty > 0 && (
        <span className="absolute -right-2 -top-2 z-[4] flex h-7 min-w-[28px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-sm font-bold leading-none text-white shadow-md">
          {cartQty}
        </span>
      )}

      <div className="relative z-[1] min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-slate-800">{product.name}</h3>
        <p className="mt-1.5 text-sm font-extrabold text-brand-600">{formatCurrency(product.price)}</p>
      </div>

      <span className="relative z-[1] shrink-0 text-[11px] font-medium text-slate-400">{product.stock} adet</span>

      <button
        type="button"
        onClick={onAdd}
        disabled={pending || !product.active}
        className="absolute inset-0 z-[3] flex items-center justify-center rounded-lg bg-white/80 opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed"
        aria-label={`${product.name} ekle`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
          <Icon name="plus" className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
}

function SavedItemRow({
  item,
  editingItem,
  pending,
  isEditing,
  onEdit,
  onSave,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: TabItem;
  editingItem: TabItem;
  pending: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  if (isEditing) {
    return (
      <OrderItemRow
        item={editingItem}
        pending={pending}
        variant="saved"
        onSave={onSave}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onRemove={onRemove}
      />
    );
  }

  return (
    <div className="group relative flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="truncate text-sm font-medium text-slate-800">{item.product?.name ?? "Ürün"}</p>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold text-slate-500">x{item.quantity}</span>
        <span className="text-sm font-bold text-slate-800">{formatCurrency(item.lineTotal)}</span>
      </div>
      <button
        type="button"
        className="absolute inset-0 z-[1] flex items-center justify-center rounded-lg bg-white/80 opacity-0 transition group-hover:opacity-100"
        onClick={onEdit}
        aria-label={`${item.product?.name ?? "Ürün"} düzenle`}
      >
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
          <Icon name="pencil" className="h-3.5 w-3.5" />
          Düzenle
        </span>
      </button>
    </div>
  );
}

function SectionHeader({ label, tone }: { label: string; tone: "new" | "saved" }) {
  const isNew = tone === "new";
  return (
    <div className="mb-3 flex items-center gap-3">
      <h3
        className={`shrink-0 text-xs font-extrabold uppercase tracking-wider ${
          isNew ? "text-orange-600" : "text-slate-500"
        }`}
      >
        {label}
      </h3>
      <div className={`h-px flex-1 ${isNew ? "bg-orange-200" : "bg-slate-200"}`} />
    </div>
  );
}

type DraftItem = { productId: number; quantity: number };

function draftToTabItem(draft: DraftItem, product?: Product): TabItem {
  const unitPrice = product?.price ?? 0;
  return {
    id: -draft.productId,
    tabId: 0,
    productId: draft.productId,
    quantity: draft.quantity,
    unitPrice,
    vatRate: product?.vatRate ?? 10,
    lineTotal: Number((unitPrice * draft.quantity).toFixed(2)),
    product,
  };
}

function CancelTabModal({
  tableName,
  pending,
  onClose,
  onConfirm,
}: {
  tableName: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          aria-label="Kapat"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Icon name="close" className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-800">Adisyon İptal</h3>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{tableName}</span> adisyonunu iptal etmek
          istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>

        <div className="mt-6 flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={pending}>
            Vazgeç
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "İptal ediliyor..." : "Adisyonu İptal Et"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function OrderItemRow({
  item,
  pending,
  onDecrease,
  onIncrease,
  onRemove,
  onSave,
  variant = "new",
}: {
  item: TabItem;
  pending: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  onSave?: () => void;
  variant?: "new" | "saved";
}) {
  const isSaved = variant === "saved";

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        isSaved ? "border-slate-200 bg-white" : "border-orange-100 bg-orange-50/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-800">
          {item.product?.name ?? "Ürün"}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded-md p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
            disabled={pending}
            onClick={onRemove}
            aria-label="Kalemi sil"
          >
            <Icon name="trash" className="h-5 w-5" />
          </button>
          {onSave && (
            <button
              type="button"
              className="rounded-md p-0.5 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
              disabled={pending}
              onClick={onSave}
              aria-label="Değişiklikleri kaydet"
            >
              <Icon name="check" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <p
        className={`mt-0.5 text-xs font-extrabold ${isSaved ? "text-brand-600" : "text-orange-500"}`}
      >
        {formatCurrency(item.unitPrice)}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <div className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 bg-white">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center text-sm text-slate-500 hover:bg-slate-50"
            disabled={pending}
            onClick={onDecrease}
          >
            −
          </button>
          <span className="flex h-7 min-w-[28px] items-center justify-center border-x border-slate-200 text-xs font-semibold text-slate-700">
            {item.quantity}
          </span>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center text-sm text-slate-500 hover:bg-slate-50"
            disabled={pending}
            onClick={onIncrease}
          >
            +
          </button>
        </div>
        <p className="text-sm font-bold text-slate-800">{formatCurrency(item.lineTotal)}</p>
      </div>
    </div>
  );
}

function SummaryLine({
  dotClass,
  label,
  value,
  valueClass = "text-slate-800",
}: {
  dotClass: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      {label}: <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </span>
  );
}

function printTabReceipt(tableName: string, tabLabel: string, items: TabItem[], total: number) {
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #eee">${item.product?.name ?? "Ürün"}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.lineTotal)}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Adisyon - ${tableName}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 320px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; color: #64748b; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .total { margin-top: 16px; font-size: 16px; font-weight: bold; text-align: right; }
</style></head><body>
  <h1>${tableName} ${tabLabel}</h1>
  <div class="meta">${formatDateTime(new Date().toISOString())}</div>
  <table>
    <thead><tr>
      <th>Ürün</th><th style="text-align:center">Adet</th><th style="text-align:right">Tutar</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Toplam: ${formatCurrency(total)}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
</body></html>`;

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function buildFullSelection(items: TabItem[]): Record<number, number> {
  const next: Record<number, number> = {};
  for (const item of items) next[item.id] = item.quantity;
  return next;
}

function PaymentDrawer({
  items,
  remaining,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  items: TabItem[];
  remaining: number;
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (
    method: PaymentMethod,
    amount: number,
    selectedItems: { itemId: number; quantity: number }[]
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("NAKIT");
  const [discountInput, setDiscountInput] = useState("0.00");
  const [selection, setSelection] = useState<Record<number, number>>(() => buildFullSelection(items));

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function requestClose() {
    if (pending) return;
    setOpen(false);
    window.setTimeout(onClose, 280);
  }

  const selectedTotal = useMemo(() => {
    let total = 0;
    for (const item of items) {
      const qty = selection[item.id] ?? 0;
      if (qty > 0) total += item.unitPrice * qty;
    }
    return Number(total.toFixed(2));
  }, [items, selection]);

  const discountPercent = Math.min(100, Math.max(0, Number(discountInput.replace(",", ".")) || 0));
  const discountAmount = Number(((selectedTotal * discountPercent) / 100).toFixed(2));
  const netTotal = Number(Math.max(0, selectedTotal - discountAmount).toFixed(2));
  const payableAmount = Math.min(netTotal, remaining);
  const hasSelection = payableAmount > 0;

  function selectAll() {
    setSelection(buildFullSelection(items));
  }

  function clearSelection() {
    setSelection({});
  }

  function toggleItem(item: TabItem) {
    setSelection((prev) => {
      const current = prev[item.id] ?? 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: item.quantity };
    });
  }

  function setItemQty(item: TabItem, qty: number) {
    setSelection((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[item.id];
        return next;
      }
      next[item.id] = Math.min(item.quantity, qty);
      return next;
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
              <span className="text-lg font-bold leading-none">$</span>
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Ödeme ve Tahsilat</h3>
              <p className="mt-0.5 text-sm text-slate-500">Ödenecek ürünleri seçin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={pending}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Kapat"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Ürünler</h4>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button type="button" className="text-brand-600 hover:text-brand-700" onClick={selectAll} disabled={pending}>
                Tümünü Seç
              </button>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={clearSelection}
                disabled={pending}
              >
                Seçimi Temizle
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const selectedQty = selection[item.id] ?? 0;
              const checked = selectedQty > 0;
              const lineTotal = Number((item.unitPrice * (checked ? selectedQty : item.quantity)).toFixed(2));
              const canAdjustQty = item.quantity > 1;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3 py-3 transition ${
                    checked ? "border-brand-200 bg-brand-50/40" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggleItem(item)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                      aria-label={checked ? "Seçimi kaldır" : "Ürünü seç"}
                    >
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {item.product?.name ?? "Ürün"}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-400">
                            {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {canAdjustQty && checked ? (
                            <div className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 bg-white">
                              <button
                                type="button"
                                className="flex h-7 w-7 items-center justify-center text-sm text-slate-500 hover:bg-slate-50"
                                disabled={pending}
                                onClick={() => setItemQty(item, selectedQty - 1)}
                              >
                                −
                              </button>
                              <span className="flex h-7 min-w-[28px] items-center justify-center border-x border-slate-200 text-xs font-semibold text-slate-700">
                                {selectedQty}
                              </span>
                              <button
                                type="button"
                                className="flex h-7 w-7 items-center justify-center text-sm text-slate-500 hover:bg-slate-50"
                                disabled={pending || selectedQty >= item.quantity}
                                onClick={() => setItemQty(item, selectedQty + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-slate-500">x{item.quantity}</span>
                          )}
                          <p className="text-sm font-bold text-slate-800">
                            {formatCurrency(
                              checked ? Number((item.unitPrice * selectedQty).toFixed(2)) : lineTotal
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Ödeme Yöntemi
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setMethod("NAKIT")}
                className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold transition ${
                  method === "NAKIT"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold ${
                    method === "NAKIT" ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  $
                </span>
                Nakit
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setMethod("KART")}
                className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold transition ${
                  method === "KART"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    method === "KART" ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon name="creditCard" className="h-5 w-5" />
                </span>
                Kredi Kartı
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
              İndirim (%)
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="input"
              value={discountInput}
              placeholder="0.00"
              disabled={pending}
              onFocus={() => {
                if (discountInput === "0.00" || discountInput === "0") {
                  setDiscountInput("");
                }
              }}
              onChange={(e) => setDiscountInput(e.target.value)}
              onBlur={() => {
                const n = Math.min(100, Math.max(0, Number(discountInput.replace(",", ".")) || 0));
                setDiscountInput(n.toFixed(2));
              }}
            />
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="mb-1 flex items-center justify-between text-sm text-slate-500">
            <span>Seçili Toplam</span>
            <span className="font-semibold text-slate-700">{formatCurrency(selectedTotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="mb-1 flex items-center justify-between text-sm text-slate-500">
              <span>İndirim</span>
              <span className="font-semibold text-red-500">−{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="mb-4 flex items-end justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Net Tahsilat
            </span>
            <span className="text-2xl font-extrabold text-emerald-600">{formatCurrency(payableAmount)}</span>
          </div>
          <button
            type="button"
            disabled={pending || !hasSelection}
            onClick={() => {
              const selectedItems = items
                .map((item) => ({ itemId: item.id, quantity: selection[item.id] ?? 0 }))
                .filter((item) => item.quantity > 0);
              onConfirm(method, payableAmount, selectedItems);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Icon name="check" className="h-5 w-5" />
            {pending ? "İşleniyor..." : "Tahsilatı Tamamla"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function MoveModal({
  currentTableId,
  tables,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  currentTableId: number;
  tables: CafeTable[];
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (targetTableId: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return tables
      .filter((t) => t.id !== currentTableId && t.status !== "PASIF")
      .filter((t) => (q ? t.name.toLocaleLowerCase("tr").includes(q) : true))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }, [tables, currentTableId, query]);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Kapat"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
          <h3 className="text-2xl font-bold text-slate-900">Masayı Taşı</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Adisyon Aktarımı
          </p>

          <div className="mt-5 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
              <Icon name="info" className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm font-bold text-sky-900">Masa Taşıma Bilgisi</p>
              <p className="mt-1 text-sm leading-relaxed text-sky-800/80">
                Bu işlem mevcut adisyonu tüm ürünleri ile birlikte başka bir masaya taşır. Hedef masa
                boş olmalıdır veya açık bir adisyonu varsa birleştirilir.
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              className="input pl-9"
              placeholder="Masa ara..."
              value={query}
              disabled={pending}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Uygun Masalar
            </h4>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-700">
              {candidates.length} Masa
            </span>
          </div>

          {candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Uygun masa bulunamadı.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {candidates.map((t) => {
                const busy = Boolean(t.openTab) || t.status === "DOLU";
                const isSelected = selected === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={pending}
                    onClick={() => setSelected(t.id)}
                    className={`rounded-xl border px-3 py-3.5 text-left transition ${
                      isSelected
                        ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-slate-800">{t.name}</p>
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        busy ? "text-amber-600" : "text-slate-400"
                      }`}
                    >
                      {busy ? "MEŞGUL" : "BOŞ"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}

        <div className="px-6 py-5">
          <button
            type="button"
            className="w-full rounded-xl bg-sky-500 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-sky-600 disabled:opacity-60"
            onClick={() => selected && onConfirm(selected)}
            disabled={pending || !selected}
          >
            {pending ? "Aktarılıyor..." : "Aktarımı Tamamla"}
          </button>
          <button
            type="button"
            className="mt-3 w-full text-center text-sm font-medium text-slate-400 hover:text-slate-600"
            onClick={onClose}
            disabled={pending}
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TableDetail() {
  const { id } = useParams();
  const tableId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Tümü");
  const [showPayment, setShowPayment] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [moveError, setMoveError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [tabSavedOnce, setTabSavedOnce] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [editingSavedItem, setEditingSavedItem] = useState<{ itemId: number; quantity: number } | null>(
    null
  );

  const table = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => (await api.get<CafeTable>(`/tables/${tableId}`)).data,
    enabled: Number.isFinite(tableId),
  });

  const allTables = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await api.get<CafeTable[]>("/tables")).data,
  });

  const products = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get<Product[]>("/products")).data,
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["table", tableId] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    queryClient.invalidateQueries({ queryKey: ["tables", "stats"] });
  }

  const saveDraft = useMutation({
    mutationFn: async (drafts: DraftItem[]) => {
      for (const item of drafts) {
        await api.post(`/tables/${tableId}/items`, {
          productId: item.productId,
          quantity: item.quantity,
        });
      }
      return (await api.get<CafeTable>(`/tables/${tableId}`)).data;
    },
    onSuccess: (data) => {
      if (data.openTab?.items?.length) {
        setTabSavedOnce(true);
      }
      setDraftItems([]);
      setSavedNotice(true);
      refresh();
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      (await api.patch<CafeTable>(`/tables/${tableId}/items/${itemId}`, { quantity })).data,
    onSuccess: () => {
      setEditingSavedItem(null);
      refresh();
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: number) =>
      (await api.delete<CafeTable>(`/tables/${tableId}/items/${itemId}`)).data,
    onSuccess: (_data, itemId) => {
      setEditingSavedItem((current) => (current?.itemId === itemId ? null : current));
      refresh();
    },
  });

  const openTab = table.data?.openTab ?? null;
  const savedServerItems = openTab?.items ?? [];
  const hasSavedItems = savedServerItems.length > 0;
  const hasDraft = draftItems.length > 0;
  const hasItems = hasSavedItems || hasDraft;
  const paid = openTab?.paidAmount ?? 0;

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    for (const product of products.data ?? []) {
      map.set(product.id, product);
    }
    return map;
  }, [products.data]);

  const draftDisplayItems = useMemo(
    () => draftItems.map((draft) => draftToTabItem(draft, productById.get(draft.productId))),
    [draftItems, productById]
  );

  const draftSubtotal = useMemo(
    () => draftDisplayItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [draftDisplayItems]
  );

  const savedSubtotalAmount = openTab?.total ?? 0;
  const subtotal = savedSubtotalAmount + draftSubtotal;
  // Parçalı ödemede ödenen ürünler adisyondan düşülür; kalan = mevcut ürün toplamı
  const remaining = Math.max(0, subtotal);
  const paymentRemaining = Math.max(0, savedSubtotalAmount);
  const tabLabel = openTab && hasSavedItems ? `#${openTab.id}` : "#Yeni";

  const addToDraft = useCallback((productId: number) => {
    setDraftItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }, []);

  const updateDraftQty = useCallback((productId: number, quantity: number) => {
    setDraftItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.productId !== productId);
      return prev.map((item) => (item.productId === productId ? { ...item, quantity } : item));
    });
  }, []);

  useEffect(() => {
    setDraftItems([]);
    setEditingSavedItem(null);
  }, [tableId]);

  function getEditingDisplayItem(item: TabItem): TabItem {
    if (editingSavedItem?.itemId !== item.id) return item;
    const quantity = editingSavedItem.quantity;
    return {
      ...item,
      quantity,
      lineTotal: Number((item.unitPrice * quantity).toFixed(2)),
    };
  }

  function startEditingSavedItem(item: TabItem) {
    setEditingSavedItem({ itemId: item.id, quantity: item.quantity });
  }

  function adjustEditingSavedQty(itemId: number, delta: number) {
    setEditingSavedItem((prev) => {
      if (!prev || prev.itemId !== itemId) return prev;
      return { ...prev, quantity: Math.max(1, prev.quantity + delta) };
    });
  }

  function saveEditedSavedItem(item: TabItem) {
    if (!editingSavedItem || editingSavedItem.itemId !== item.id) return;
    if (editingSavedItem.quantity === item.quantity) {
      setEditingSavedItem(null);
      return;
    }
    updateItem.mutate({ itemId: item.id, quantity: editingSavedItem.quantity });
  }

  const pay = useMutation({
    mutationFn: async ({
      method,
      amount,
      items,
    }: {
      method: PaymentMethod;
      amount: number;
      items: { itemId: number; quantity: number }[];
    }) =>
      (
        await api.post<CafeTable>(`/tables/${tableId}/payment`, {
          method,
          amount,
          items,
        })
      ).data,
    onSuccess: (data) => {
      setShowPayment(false);
      setPaymentError("");
      refresh();
      const leftover = data.openTab?.items?.length ?? 0;
      if (leftover === 0) {
        navigate("/masalar");
      }
    },
    onError: (err) => setPaymentError(apiError(err, "Ödeme alınamadı")),
  });

  const moveTab = useMutation({
    mutationFn: async (targetTableId: number) =>
      (await api.post<CafeTable>(`/tables/${tableId}/move`, { targetTableId })).data,
    onSuccess: (data) => {
      setShowMove(false);
      setMoveError("");
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["tables", "stats"] });
      navigate(`/masalar/${data.id}`);
    },
    onError: (err) => setMoveError(apiError(err, "Adisyon taşınamadı")),
  });

  const cancelTab = useMutation({
    mutationFn: async () => (await api.post<CafeTable>(`/tables/${tableId}/cancel`)).data,
    onSuccess: () => {
      setShowCancel(false);
      refresh();
      navigate("/masalar");
    },
  });

  const entryInitializedRef = useRef(false);

  useEffect(() => {
    entryInitializedRef.current = false;
  }, [tableId]);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(false), 2500);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  useEffect(() => {
    if (!table.data || entryInitializedRef.current) return;
    entryInitializedRef.current = true;

    const tab = table.data.openTab;
    if (tab && (tab.items?.length ?? 0) > 0) {
      setTabSavedOnce(true);
    } else {
      setTabSavedOnce(false);
    }
  }, [table.data]);

  useEffect(() => {
    if (table.data?.openTab) return;
    setTabSavedOnce(false);
    setDraftItems([]);
  }, [table.data?.openTab?.id]);

  const cartQtyByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of draftItems) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [draftItems]);

  const araAmount = tabSavedOnce ? savedSubtotalAmount + paid : paid;
  const newAmount = draftSubtotal;

  const activeProducts = useMemo(
    () => (products.data ?? []).filter((p) => p.active),
    [products.data]
  );

  const tabs = useMemo(
    () => ["Tümü", ...(categories.data?.map((c) => c.name) ?? [])],
    [categories.data]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return activeProducts.filter((p) => {
      const inTab = activeTab === "Tümü" || p.category?.name === activeTab;
      const inSearch = !q || p.name.toLocaleLowerCase("tr").includes(q);
      return inTab && inSearch;
    });
  }, [activeProducts, activeTab, search]);

  if (table.isLoading) {
    return <div className="-m-6 p-6 text-sm text-slate-400">Yükleniyor...</div>;
  }

  if (!table.data) {
    return (
      <div className="-m-6 p-6 text-sm text-slate-500">
        Masa bulunamadı.{" "}
        <button type="button" className="text-brand-600 hover:underline" onClick={() => navigate("/masalar")}>
          Masalara dön
        </button>
      </div>
    );
  }

  if (table.data.status === "PASIF") {
    return (
      <div className="-m-6 p-6 text-sm text-slate-500">
        Bu masa pasif durumda.{" "}
        <button type="button" className="text-brand-600 hover:underline" onClick={() => navigate("/masalar")}>
          Masalara dön
        </button>
      </div>
    );
  }

  const pending =
    pay.isPending ||
    moveTab.isPending ||
    cancelTab.isPending ||
    saveDraft.isPending ||
    updateItem.isPending ||
    removeItem.isPending;

  function handleSave() {
    if (draftItems.length === 0) return;
    saveDraft.mutate(draftItems);
  }

  function handlePrint() {
    printTabReceipt(table.data!.name, tabLabel, savedServerItems, savedSubtotalAmount);
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {savedNotice && (
        <div className="fixed left-1/2 top-20 z-[120] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Adisyon kaydedildi
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <div className="border-b border-slate-200 bg-white p-6">
          <div className="relative max-w-xl">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
              placeholder="Ürün ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <CategoryTab
                key={tab}
                label={tab}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">Ürün bulunamadı.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQty={cartQtyByProduct.get(product.id) ?? 0}
                  pending={saveDraft.isPending}
                  onAdd={() => addToDraft(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="flex w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate("/masalar")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Geri"
          >
            <Icon name="chevronLeft" className="h-5 w-5" />
          </button>
          <h2 className="flex-1 text-lg font-bold text-slate-800">
            {table.data.name} {tabLabel}
          </h2>
          <span
            className={`badge gap-1.5 ${
              hasSavedItems ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${hasSavedItems ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {hasSavedItems ? "AÇIK" : "BEKLEYEN"}
          </span>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {!hasItems ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                <Icon name="bag" className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-slate-600">Adisyon henüz boş.</p>
              <p className="mt-1 text-sm text-slate-400">Soldan ürün seçerek sipariş ekleyin.</p>
            </div>
          ) : (
            <div className="p-4">
              {hasDraft && (
                <div className={tabSavedOnce && hasSavedItems ? "mb-5" : ""}>
                  <SectionHeader label="Yeni Ürünler" tone="new" />
                  <div className="space-y-2">
                    {draftDisplayItems.map((item) => (
                      <OrderItemRow
                        key={`draft-${item.productId}`}
                        item={item}
                        pending={pending}
                        onDecrease={() => updateDraftQty(item.productId, item.quantity - 1)}
                        onIncrease={() => updateDraftQty(item.productId, item.quantity + 1)}
                        onRemove={() => updateDraftQty(item.productId, 0)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {tabSavedOnce && hasSavedItems && (
                <div>
                  <SectionHeader label="Eklenen Ürünler" tone="saved" />
                  <div className="space-y-2">
                    {savedServerItems.map((item) => (
                      <SavedItemRow
                        key={`saved-${item.id}`}
                        item={item}
                        editingItem={getEditingDisplayItem(item)}
                        pending={pending}
                        isEditing={editingSavedItem?.itemId === item.id}
                        onEdit={() => startEditingSavedItem(item)}
                        onSave={() => saveEditedSavedItem(item)}
                        onDecrease={() => adjustEditingSavedQty(item.id, -1)}
                        onIncrease={() => adjustEditingSavedQty(item.id, 1)}
                        onRemove={() => removeItem.mutate(item.id)}
                      />
                    ))}
                  </div>
                  {paid > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Icon name="check" className="h-3.5 w-3.5" />
                      </span>
                      <span>{formatCurrency(paid)} tutarında ödeme alındı</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <SummaryLine dotClass="bg-slate-500" label="Ara" value={formatCurrency(araAmount)} />
              <span className="hidden text-slate-300 sm:inline">|</span>
              <SummaryLine
                dotClass="bg-emerald-500"
                label="Ödenen"
                value={formatCurrency(paid)}
                valueClass="text-emerald-700"
              />
              <span className="hidden text-slate-300 sm:inline">|</span>
              <SummaryLine
                dotClass="bg-brand-500"
                label="Kalan"
                value={formatCurrency(remaining)}
                valueClass="text-brand-700"
              />
              {hasDraft && newAmount > 0 && (
                <>
                  <span className="hidden text-slate-300 sm:inline">|</span>
                  <SummaryLine
                    dotClass="bg-orange-500"
                    label="Yeni"
                    value={`+${formatCurrency(newAmount)}`}
                    valueClass="text-orange-600"
                  />
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Toplam</span>
            <span className="text-2xl font-bold text-brand-600">{formatCurrency(subtotal)}</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`btn gap-1 px-2 text-xs ${
                hasDraft
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "btn-ghost text-slate-400"
              }`}
              disabled={!hasDraft || pending}
              onClick={handleSave}
            >
              <Icon name="check" className="h-4 w-4" />
              KAYDET
            </button>
            <button
              type="button"
              className={`btn gap-1 px-2 text-xs ${
                hasSavedItems && !hasDraft && !pending
                  ? "border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100"
                  : "btn-ghost text-slate-400"
              }`}
              disabled={!hasSavedItems || pending || hasDraft}
              onClick={() => {
                setMoveError("");
                setShowMove(true);
              }}
            >
              <Icon name="move" className="h-4 w-4" />
              TAŞI
            </button>
            <button
              type="button"
              className={`btn gap-1 px-2 text-xs ${
                hasSavedItems && !hasDraft && !pending
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "btn-ghost text-slate-400"
              }`}
              disabled={!hasSavedItems || pending || hasDraft}
              onClick={handlePrint}
            >
              <Icon name="printer" className="h-4 w-4" />
              YAZDIR
            </button>
          </div>

          <button
            type="button"
            className="btn-primary mt-3 w-full gap-2 py-3 text-sm font-semibold"
            disabled={!hasSavedItems || pending || hasDraft || paymentRemaining <= 0}
            onClick={() => {
              setPaymentError("");
              setShowPayment(true);
            }}
          >
            <Icon name="creditCard" className="h-4 w-4" />
            ÖDEME AL
          </button>

          {tabSavedOnce && hasSavedItems && (
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              disabled={pending}
              onClick={() => setShowCancel(true)}
            >
              <Icon name="close" className="h-4 w-4" />
              ADİSYON İPTAL
            </button>
          )}
        </div>
      </aside>

      {showPayment && (
        <PaymentDrawer
          items={savedServerItems}
          remaining={paymentRemaining}
          pending={pay.isPending}
          error={paymentError}
          onClose={() => {
            if (!pay.isPending) {
              setShowPayment(false);
              setPaymentError("");
            }
          }}
          onConfirm={(method, amount, items) => pay.mutate({ method, amount, items })}
        />
      )}

      {showMove && (
        <MoveModal
          currentTableId={tableId}
          tables={allTables.data ?? []}
          pending={moveTab.isPending}
          error={moveError}
          onClose={() => {
            if (!moveTab.isPending) {
              setShowMove(false);
              setMoveError("");
            }
          }}
          onConfirm={(targetTableId) => moveTab.mutate(targetTableId)}
        />
      )}

      {showCancel && (
        <CancelTabModal
          tableName={table.data.name}
          pending={cancelTab.isPending}
          onClose={() => {
            if (!cancelTab.isPending) setShowCancel(false);
          }}
          onConfirm={() => cancelTab.mutate()}
        />
      )}
    </div>
  );
}
