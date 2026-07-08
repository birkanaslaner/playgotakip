import { useEffect, useMemo, useRef, useState } from "react";
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

function SavedItemRow({ item }: { item: TabItem }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="truncate text-sm font-medium text-slate-800">{item.product?.name ?? "Ürün"}</p>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold text-slate-500">x{item.quantity}</span>
        <span className="text-sm font-bold text-slate-800">{formatCurrency(item.lineTotal)}</span>
      </div>
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

type SavedSnapshot = { productId: number; quantity: number }[];

function splitItems(items: TabItem[], snapshot: SavedSnapshot) {
  if (snapshot.length === 0) {
    return { saved: [] as TabItem[], unsaved: items };
  }

  const savedMap = new Map(snapshot.map((s) => [s.productId, s.quantity]));
  const saved: TabItem[] = [];
  const unsaved: TabItem[] = [];

  for (const item of items) {
    const snapQty = savedMap.get(item.productId) ?? 0;
    if (snapQty <= 0) {
      unsaved.push(item);
      continue;
    }
    if (item.quantity <= snapQty) {
      saved.push(item);
    } else {
      saved.push({
        ...item,
        quantity: snapQty,
        lineTotal: Number((snapQty * item.unitPrice).toFixed(2)),
      });
      unsaved.push({
        ...item,
        quantity: item.quantity - snapQty,
        lineTotal: Number(((item.quantity - snapQty) * item.unitPrice).toFixed(2)),
      });
    }
  }

  return { saved, unsaved };
}

function hasUnsavedChanges(items: TabItem[], snapshot: SavedSnapshot, tabSavedOnce: boolean): boolean {
  if (!tabSavedOnce) return items.length > 0;

  const current = new Map(items.map((i) => [i.productId, i.quantity]));
  const snap = new Map(snapshot.map((s) => [s.productId, s.quantity]));

  for (const [productId, qty] of current) {
    if ((snap.get(productId) ?? 0) !== qty) return true;
  }
  for (const productId of snap.keys()) {
    if (!current.has(productId)) return true;
  }
  return false;
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
}: {
  item: TabItem;
  pending: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-orange-100 bg-orange-50/80 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-slate-800">{item.product?.name ?? "Ürün"}</p>
        <button
          type="button"
          className="shrink-0 text-slate-400 hover:text-red-500"
          disabled={pending}
          onClick={onRemove}
          aria-label="Kalemi sil"
        >
          <Icon name="trash" className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-0.5 text-xs font-extrabold text-orange-500">{formatCurrency(item.unitPrice)}</p>
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
        <p className="text-xs font-bold text-slate-800">{formatCurrency(item.lineTotal)}</p>
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

function PaymentModal({
  tableName,
  amount,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  tableName: string;
  amount: number;
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("NAKIT");

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

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="creditCard" className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-800">Ödeme Al</h3>
        <p className="mt-1 text-sm text-slate-500">{tableName} adisyonu</p>

        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Ödenecek tutar</div>
          <div className="text-2xl font-bold text-brand-600">{formatCurrency(amount)}</div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-sm font-medium text-slate-600">Ödeme yöntemi</div>
          <div className="flex gap-2">
            {(["NAKIT", "KART"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                disabled={pending}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  method === m
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m === "NAKIT" ? "Nakit" : "Kart"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={pending}>
            İptal
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => onConfirm(method)}
            disabled={pending}
          >
            {pending ? "İşleniyor..." : "Ödemeyi Al"}
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
  const available = tables.filter(
    (t) => t.id !== currentTableId && t.status === "UYGUN" && !t.openTab
  );

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4">
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Kapat"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Icon name="move" className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Adisyonu Taşı</h3>
          <p className="mt-1 text-sm text-slate-500">Adisyonu taşımak istediğiniz masayı seçin.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {available.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Uygun masa bulunamadı.</p>
          ) : (
            <div className="space-y-2">
              {available.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  disabled={pending}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    selected === t.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon name="table" className="h-5 w-5 text-slate-400" />
                  <span className="font-semibold text-slate-800">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="px-6 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={pending}>
            İptal
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => selected && onConfirm(selected)}
            disabled={pending || !selected}
          >
            {pending ? "Taşınıyor..." : "Taşı"}
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
  const [savedSubtotal, setSavedSubtotal] = useState(0);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot>([]);
  const [tabSavedOnce, setTabSavedOnce] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

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

  const addItem = useMutation({
    mutationFn: async (productId: number) =>
      (await api.post<CafeTable>(`/tables/${tableId}/items`, { productId })).data,
    onSuccess: refresh,
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      (await api.patch<CafeTable>(`/tables/${tableId}/items/${itemId}`, { quantity })).data,
    onSuccess: refresh,
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: number) =>
      (await api.delete<CafeTable>(`/tables/${tableId}/items/${itemId}`)).data,
    onSuccess: refresh,
  });

  const openTab = table.data?.openTab ?? null;
  const items = openTab?.items ?? [];
  const hasItems = items.length > 0;
  const subtotal = openTab?.total ?? 0;
  const paid = openTab?.paidAmount ?? 0;
  const remaining = Math.max(0, subtotal - paid);
  const tabLabel = openTab && hasItems ? `#${openTab.id}` : "#Yeni";

  const pay = useMutation({
    mutationFn: async ({ method, amount }: { method: PaymentMethod; amount: number }) =>
      (await api.post<CafeTable>(`/tables/${tableId}/payment`, { method, amount })).data,
    onSuccess: () => {
      setShowPayment(false);
      setPaymentError("");
      refresh();
      navigate("/masalar");
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
      setSavedSnapshot(tab.items!.map((i) => ({ productId: i.productId, quantity: i.quantity })));
      setSavedSubtotal(tab.total);
      setTabSavedOnce(true);
    } else {
      setSavedSubtotal(0);
      setSavedSnapshot([]);
      setTabSavedOnce(false);
    }
  }, [table.data]);

  useEffect(() => {
    if (table.data?.openTab) return;
    setSavedSubtotal(0);
    setSavedSnapshot([]);
    setTabSavedOnce(false);
  }, [table.data?.openTab?.id]);

  const { saved: savedItems, unsaved: unsavedItems } = useMemo(
    () => splitItems(items, tabSavedOnce ? savedSnapshot : []),
    [items, savedSnapshot, tabSavedOnce]
  );

  const cartQtyByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of unsavedItems) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [unsavedItems]);

  const hasUnsaved = useMemo(
    () => hasUnsavedChanges(items, savedSnapshot, tabSavedOnce),
    [items, savedSnapshot, tabSavedOnce]
  );

  const araAmount = tabSavedOnce ? savedSubtotal : 0;
  const newAmount = Math.max(0, subtotal - araAmount);

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
    addItem.isPending ||
    updateItem.isPending ||
    removeItem.isPending ||
    pay.isPending ||
    moveTab.isPending ||
    cancelTab.isPending;

  function handleSave() {
    setSavedSnapshot(items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    setSavedSubtotal(subtotal);
    setTabSavedOnce(true);
    setSavedNotice(true);
  }

  function handlePrint() {
    printTabReceipt(table.data!.name, tabLabel, items, subtotal);
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
                  pending={addItem.isPending}
                  onAdd={() => addItem.mutate(product.id)}
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
              hasItems ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${hasItems ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {hasItems ? "AÇIK" : "BEKLEYEN"}
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
              {!tabSavedOnce ? (
                <>
                  <SectionHeader label="Yeni Ürünler" tone="new" />
                  <div className="space-y-2">
                    {items.map((item) => (
                      <OrderItemRow
                        key={item.id}
                        item={item}
                        pending={pending}
                        onDecrease={() =>
                          updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                        }
                        onIncrease={() =>
                          updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                        }
                        onRemove={() => removeItem.mutate(item.id)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {savedItems.length > 0 && (
                    <div className={unsavedItems.length > 0 ? "mb-5" : ""}>
                      <SectionHeader label="Eklenen Ürünler" tone="saved" />
                      <div className="space-y-2">
                        {savedItems.map((item) => (
                          <SavedItemRow key={`saved-${item.id}`} item={item} />
                        ))}
                      </div>
                    </div>
                  )}
                  {unsavedItems.length > 0 && (
                    <>
                      <SectionHeader label="Yeni Ürünler" tone="new" />
                      <div className="space-y-2">
                        {unsavedItems.map((item) => (
                          <OrderItemRow
                            key={`new-${item.id}`}
                            item={item}
                            pending={pending}
                            onDecrease={() =>
                              updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                            }
                            onIncrease={() =>
                              updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                            }
                            onRemove={() => removeItem.mutate(item.id)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
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
              {hasItems && newAmount > 0 && (
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
                hasItems && hasUnsaved
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "btn-ghost text-slate-400"
              }`}
              disabled={!hasItems || pending || !hasUnsaved}
              onClick={handleSave}
            >
              <Icon name="check" className="h-4 w-4" />
              KAYDET
            </button>
            <button
              type="button"
              className="btn-ghost gap-1 px-2 text-xs text-slate-400"
              disabled={!hasItems || pending}
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
              className="btn-ghost gap-1 px-2 text-xs text-slate-400"
              disabled={!hasItems || pending}
              onClick={handlePrint}
            >
              <Icon name="printer" className="h-4 w-4" />
              YAZDIR
            </button>
          </div>

          <button
            type="button"
            className="btn-primary mt-3 w-full gap-2 py-3 text-sm font-semibold"
            disabled={!hasItems || pending || remaining <= 0}
            onClick={() => {
              setPaymentError("");
              setShowPayment(true);
            }}
          >
            <Icon name="creditCard" className="h-4 w-4" />
            ÖDEME AL
          </button>

          {tabSavedOnce && hasItems && (
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
        <PaymentModal
          tableName={table.data.name}
          amount={remaining}
          pending={pay.isPending}
          error={paymentError}
          onClose={() => {
            if (!pay.isPending) {
              setShowPayment(false);
              setPaymentError("");
            }
          }}
          onConfirm={(method) => pay.mutate({ method, amount: remaining })}
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
