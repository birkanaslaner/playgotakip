import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../api/client";
import type { PaymentMethod, PricingPlan, Visit } from "../api/types";
import { formatCurrency, formatDuration, formatTime, minutesSince } from "../utils/format";
import { Icon } from "../components/icons";
import { useAuth } from "../auth/AuthContext";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

function printReceipt(v: Visit, staff: string) {
  const nowStr = new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rows: [string, string][] = [
    ["Giriş Saati", formatTime(v.checkInAt)],
    ["Çocuk Adı Soyadı", v.child?.fullName ?? "-"],
    ["Veli Adı Soyadı", v.guardian?.fullName ?? "-"],
    ["Telefon", v.guardian?.phone ?? "-"],
    ["Total Ücret", formatCurrency(netPrice(v))],
  ];
  const body = rows
    .map(
      ([k, val]) =>
        `<div class="row"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(
          val
        )}</span></div>`
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fiş</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 16px; color: #111; }
  .title { text-align: center; font-size: 18px; font-weight: 700; }
  .sub { text-align: center; font-size: 12px; color: #555; margin-top: 2px; }
  hr { border: none; border-top: 1px dashed #999; margin: 12px 0; }
  .row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 4px 0; }
  .k { color: #555; }
  .v { font-weight: 600; text-align: right; }
  @media print { @page { margin: 8mm; } }
</style></head><body>
  <div class="title">${escapeHtml(staff)}</div>
  <div class="sub">${escapeHtml(nowStr)}</div>
  <hr />
  ${body}
</body></html>`;
  const width = 480;
  const height = 640;
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  const w = window.open(
    "",
    "_blank",
    `width=${width},height=${height},left=${left},top=${top}`
  );
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function estCheckout(v: Visit): number {
  const t = new Date(v.checkInAt).getTime();
  const mins = (v.pricingPlan?.unitMinutes ?? 0) + (v.extraMinutes ?? 0);
  return t + mins * 60000 + (v.pausedMs ?? 0);
}

function effectiveNow(v: Visit, now: number): number {
  return v.pausedAt ? new Date(v.pausedAt).getTime() : now;
}

function basePrice(v: Visit): number {
  const p = v.pricingPlan;
  if (!p) return 0;
  const isWeekend = [0, 6].includes(new Date(v.checkInAt).getDay());
  const w = isWeekend ? p.weekendPrice : p.weekdayPrice;
  return (w ?? p.price ?? 0) + (v.extraCharge ?? 0);
}

function netPrice(v: Visit): number {
  return Math.max(0, basePrice(v) - (v.discount ?? 0));
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}dk ${s}sn`;
}

function RemainingTimer({ visit, now }: { visit: Visit; now: number }) {
  const ms = estCheckout(visit) - effectiveNow(visit, now);
  const paused = Boolean(visit.pausedAt);
  if (ms <= 0)
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-semibold text-red-600">Süre doldu</span>
        <span className="flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-100 text-red-600">
          <Icon name="warn" className="h-3.5 w-3.5" />
        </span>
      </span>
    );
  const urgent = ms <= 5 * 60000;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`font-semibold tabular-nums ${
          paused ? "text-slate-400" : urgent ? "text-amber-600" : "text-emerald-600"
        }`}
      >
        {formatCountdown(ms)}
      </span>
      {urgent && !paused && (
        <span className="flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Icon name="warn" className="h-3.5 w-3.5" />
        </span>
      )}
      {paused && (
        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-black">
          Duraklatıldı
        </span>
      )}
    </span>
  );
}

function MenuItem({
  icon,
  label,
  className = "text-slate-600",
  onClick,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-slate-50 ${className}`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

function RowActions({
  paused,
  onExtend,
  onCheckout,
  onPause,
  onPrint,
  onCancel,
}: {
  paused: boolean;
  onExtend: () => void;
  onCheckout: () => void;
  onPause: () => void;
  onPrint: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  }

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="flex justify-end">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="İşlemler"
      >
        <Icon name="pencil" className="h-5 w-5" />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="fixed z-50 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl"
              style={{ top: pos.top, right: pos.right }}
            >
              <MenuItem icon="clock" label="Süre Uzat" onClick={run(onExtend)} />
              <MenuItem
                icon="check"
                label="Teslim Et"
                className="text-emerald-600"
                onClick={run(onCheckout)}
              />
              <MenuItem
                icon={paused ? "play" : "bolt"}
                label={paused ? "Devam Et" : "Durdur"}
                onClick={run(onPause)}
              />
              <MenuItem icon="doc" label="Fiş Yazdır" onClick={run(onPrint)} />
              <MenuItem
                icon="close"
                label="İptal Et"
                className="text-red-600"
                onClick={run(onCancel)}
              />
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

function CheckOutModal({ visit, onClose, onDone }: { visit: Visit; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>(visit.paymentMethod ?? "NAKIT");
  const [error, setError] = useState("");

  const quote = useQuery({
    queryKey: ["quote", visit.id],
    queryFn: async () =>
      (
        await api.get<{ durationMin: number; gross: number; discount: number; amount: number }>(
          `/visits/${visit.id}/quote`
        )
      ).data,
    refetchInterval: 30000,
  });

  const checkout = useMutation({
    mutationFn: async () =>
      (await api.post(`/visits/${visit.id}/check-out`, { paymentMethod: method })).data,
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (err) => setError(apiError(err, "Cikis yapilamadi")),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-800">{visit.child?.fullName}</div>
            <div className="text-sm text-slate-500">{visit.guardian?.fullName}</div>
          </div>
          <span className="badge bg-brand-100 text-brand-700">#{visit.wristbandNo}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-slate-400">Giriş</div>
            <div>{formatTime(visit.checkInAt)}</div>
          </div>
          <div>
            <div className="text-slate-400">Süre</div>
            <div>{formatDuration(quote.data?.durationMin ?? minutesSince(visit.checkInAt))}</div>
          </div>
          <div>
            <div className="text-slate-400">Paket</div>
            <div>{visit.pricingPlan?.label || visit.pricingPlan?.name}</div>
          </div>
          <div>
            <div className="text-slate-400">Tutar</div>
            {quote.data && quote.data.discount > 0 && (
              <div className="text-xs text-slate-400">
                <span className="line-through">{formatCurrency(quote.data.gross)}</span>
                <span className="ml-1 text-emerald-600">-{formatCurrency(quote.data.discount)}</span>
              </div>
            )}
            <div className="text-lg font-semibold text-brand-700">
              {formatCurrency(quote.data?.amount)}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {(["NAKIT", "KART"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                method === m ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200"
              }`}
            >
              {m === "NAKIT" ? "Nakit" : "Kart"}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Vazgeç
          </button>
          <button
            className="btn-primary flex-1"
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? "İşleniyor..." : "Çıkış Yap & Ödeme Al"}
          </button>
        </div>
      </div>
    </div>
  );
}

type SortKey = "veli" | "cocuk" | "alan" | "telefon" | "fiyat" | "giris" | "tahmini" | "kalan";

const columns: { key: SortKey; label: string }[] = [
  { key: "veli", label: "Veli Adı" },
  { key: "cocuk", label: "Çocuk Adı" },
  { key: "alan", label: "Oyun Alanı" },
  { key: "telefon", label: "Telefon" },
  { key: "fiyat", label: "Fiyat" },
  { key: "giris", label: "Giriş Saati" },
  { key: "tahmini", label: "Tahmini Çıkış" },
  { key: "kalan", label: "Kalan Süre" },
];

function sortValue(v: Visit, key: SortKey, now: number): string | number {
  switch (key) {
    case "veli":
      return (v.guardian?.fullName ?? "").toLocaleLowerCase("tr");
    case "cocuk":
      return (v.child?.fullName ?? "").toLocaleLowerCase("tr");
    case "alan":
      return (v.pricingPlan?.playArea ?? "").toLocaleLowerCase("tr");
    case "telefon":
      return v.guardian?.phone ?? "";
    case "fiyat":
      return netPrice(v);
    case "giris":
      return new Date(v.checkInAt).getTime();
    case "tahmini":
      return estCheckout(v);
    case "kalan":
      return estCheckout(v) - effectiveNow(v, now);
  }
}

type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

function SortIcon({ column, sort }: { column: SortKey; sort: SortState }) {
  const active = sort?.key === column;
  if (!active) {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />
      </svg>
    );
  }
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-indigo-600 transition-transform ${
        sort.dir === "asc" ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type ListFilter =
  | { type: "all" }
  | { type: "ongoing" }
  | { type: "paused" }
  | { type: "expired" };

function countByPlayArea(
  visits: Visit[],
  match: (v: Visit) => boolean
): { area: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of visits) {
    if (!match(v)) continue;
    const a = v.pricingPlan?.playArea ?? "Diğer";
    map.set(a, (map.get(a) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => a.area.localeCompare(b.area, "tr"));
}

function getVisiblePages(currentPage: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const pages: (number | "ellipsis")[] = [0];
  if (currentPage > 2) pages.push("ellipsis");

  const from = Math.max(1, currentPage - 1);
  const to = Math.min(pageCount - 2, currentPage + 1);
  for (let i = from; i <= to; i++) pages.push(i);

  if (currentPage < pageCount - 3) pages.push("ellipsis");
  pages.push(pageCount - 1);

  return pages;
}

function StatFilterCard({
  label,
  count,
  active,
  dimmed,
  onClick,
  baseClass,
  labelClass,
  countClass,
  activeBorderClass,
  areas,
  detailClass,
}: {
  label: string;
  count: number;
  active: boolean;
  dimmed?: boolean;
  onClick: () => void;
  baseClass: string;
  labelClass: string;
  countClass: string;
  activeBorderClass: string;
  areas?: { area: string; count: number }[];
  detailClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-[180px] flex-1 flex-col rounded-xl border border-slate-200 px-4 py-3 text-left transition-all duration-200 ${baseClass} ${
        dimmed ? "opacity-40 saturate-[0.7] hover:opacity-55" : "opacity-100"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-xl border-2 ${
          active ? activeBorderClass : "border-transparent"
        }`}
      />
      <span className={`relative text-xs font-semibold uppercase tracking-wide ${labelClass}`}>
        {label}
      </span>
      <span className={`relative mt-1 text-2xl font-bold tabular-nums ${countClass}`}>{count}</span>
      {areas && areas.length > 0 && (
        <div className={`relative mt-3 space-y-1.5 border-t border-current/10 pt-2 ${detailClass ?? ""}`}>
          {areas.map(({ area, count: areaCount }) => (
            <div key={area} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{area}</span>
              <span className="font-bold tabular-nums">{areaCount}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default function CheckOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortState>(null);
  const [checkoutVisit, setCheckoutVisit] = useState<Visit | null>(null);
  const [extendVisit, setExtendVisit] = useState<Visit | null>(null);
  const [cancelVisitModal, setCancelVisitModal] = useState<Visit | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>({ type: "all" });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = useQuery({
    queryKey: ["visits", "active"],
    queryFn: async () =>
      (await api.get<Visit[]>("/visits", { params: { status: "active" } })).data,
    refetchInterval: 30000,
  });
  const plans = useQuery({
    queryKey: ["plans", "active"],
    queryFn: async () =>
      (await api.get<PricingPlan[]>("/pricing-plans", { params: { active: true } })).data,
  });

  function handleDone() {
    queryClient.invalidateQueries({ queryKey: ["visits", "active"] });
    queryClient.invalidateQueries({ queryKey: ["occupancy"] });
    queryClient.invalidateQueries({ queryKey: ["daily"] });
    queryClient.invalidateQueries({ queryKey: ["total-play-time"] });
    queryClient.invalidateQueries({ queryKey: ["play-area-distribution"] });
  }

  const cancelVisit = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/visits/${id}`)).data,
    onSuccess: () => {
      setCancelVisitModal(null);
      handleDone();
    },
  });

  const togglePause = useMutation({
    mutationFn: async (id: number) => (await api.post(`/visits/${id}/toggle-pause`)).data,
    onSuccess: handleDone,
  });

  const extend = useMutation({
    mutationFn: async ({ id, minutes, fee }: { id: number; minutes: number; fee: number }) =>
      (await api.post(`/visits/${id}/extend`, { minutes, fee })).data,
    onSuccess: handleDone,
  });

  const ongoingCount = useMemo(
    () =>
      (active.data ?? []).filter(
        (v) => !v.pausedAt && estCheckout(v) - effectiveNow(v, now) > 0
      ).length,
    [active.data, now]
  );

  const ongoingByArea = useMemo(
    () =>
      countByPlayArea(
        active.data ?? [],
        (v) => !v.pausedAt && estCheckout(v) - effectiveNow(v, now) > 0
      ),
    [active.data, now]
  );

  const pausedCount = useMemo(
    () => (active.data ?? []).filter((v) => v.pausedAt).length,
    [active.data]
  );

  const pausedByArea = useMemo(
    () => countByPlayArea(active.data ?? [], (v) => Boolean(v.pausedAt)),
    [active.data]
  );

  const expiredCount = useMemo(
    () =>
      (active.data ?? []).filter((v) => estCheckout(v) - effectiveNow(v, now) <= 0).length,
    [active.data, now]
  );

  const expiredByArea = useMemo(
    () =>
      countByPlayArea(
        active.data ?? [],
        (v) => estCheckout(v) - effectiveNow(v, now) <= 0
      ),
    [active.data, now]
  );

  function toggleOngoingFilter() {
    setListFilter((prev) => (prev.type === "ongoing" ? { type: "all" } : { type: "ongoing" }));
    setPage(0);
  }

  function togglePausedFilter() {
    setListFilter((prev) => (prev.type === "paused" ? { type: "all" } : { type: "paused" }));
    setPage(0);
  }

  function toggleExpiredFilter() {
    setListFilter((prev) => (prev.type === "expired" ? { type: "all" } : { type: "expired" }));
    setPage(0);
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(0);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    const source = active.data ?? [];
    const orderIndex = new Map(source.map((v, i) => [v.id, i]));
    const rows = source.filter((v) => {
      if (listFilter.type === "ongoing") {
        if (v.pausedAt || estCheckout(v) - effectiveNow(v, now) <= 0) return false;
      }
      if (listFilter.type === "paused" && !v.pausedAt) return false;
      if (listFilter.type === "expired" && estCheckout(v) - effectiveNow(v, now) > 0) {
        return false;
      }
      if (!term) return true;
      const hay = `${v.guardian?.fullName ?? ""} ${v.child?.fullName ?? ""} ${
        v.guardian?.phone ?? ""
      }`.toLocaleLowerCase("tr");
      return hay.includes(term);
    });
    if (sort) {
      rows.sort((a, b) => {
        const av = sortValue(a, sort.key, now);
        const bv = sortValue(b, sort.key, now);
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv), "tr");
        return sort.dir === "asc" ? cmp : -cmp;
      });
    } else {
      rows.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
    }
    // Ayni velinin cocuklarini alt alta grupla (ilk gorunum sirasini koru)
    const order: number[] = [];
    const groups = new Map<number, Visit[]>();
    for (const v of rows) {
      if (!groups.has(v.guardianId)) {
        groups.set(v.guardianId, []);
        order.push(v.guardianId);
      }
      groups.get(v.guardianId)!.push(v);
    }
    return order.flatMap((g) => groups.get(g)!);
  }, [active.data, search, sort, listFilter, now]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const offset = currentPage * pageSize;
  const pageRows = filtered.slice(offset, offset + pageSize);
  const start = total === 0 ? 1 : offset + 1;
  const end = Math.min(offset + pageSize, total);

  const guardianCounts = pageRows.reduce(
    (m, v) => m.set(v.guardianId, (m.get(v.guardianId) ?? 0) + 1),
    new Map<number, number>()
  );

  const filterActive = listFilter.type !== "all";
  const isDimmed = (type: Exclude<ListFilter["type"], "all">) =>
    filterActive && listFilter.type !== type;

  const noPackages = plans.isSuccess && plans.data.length === 0;

  if (noPackages) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Önce Paket Oluşturmalısınız</h2>
          <p className="mt-2 text-sm text-slate-500">
            Süre takibi yapabilmek için tanımlı en az bir fiyatlandırma paketiniz olmalıdır. Sizi
            paket oluşturma sayfasına yönlendirelim.
          </p>
          <button className="btn-primary mt-6 w-full" onClick={() => navigate("/ayarlar/sure-takip")}>
            Tamam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Göster</span>
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-400"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>kayıt</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
              placeholder="Veli, Çocuk veya Telefon Ara..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <button
            className="btn-ghost gap-2"
            onClick={() => document.documentElement.requestFullscreen?.()}
          >
            <Icon name="tv" className="h-4 w-4" />
            Ekrana Yansıt
          </button>
          <button className="btn-primary gap-2" onClick={() => navigate("/giris-yap")}>
            <Icon name="plus" className="h-4 w-4" />
            Yeni Kayıt
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <StatFilterCard
          label="Aktif Devam Edenler"
          count={ongoingCount}
          active={listFilter.type === "ongoing"}
          dimmed={isDimmed("ongoing")}
          onClick={toggleOngoingFilter}
          baseClass={
            listFilter.type === "ongoing"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-white hover:bg-emerald-50/50"
          }
          labelClass={listFilter.type === "ongoing" ? "text-emerald-100" : "text-slate-400"}
          countClass={listFilter.type === "ongoing" ? "text-white" : "text-emerald-600"}
          activeBorderClass="border-emerald-400 text-emerald-400"
          areas={ongoingByArea}
          detailClass={listFilter.type === "ongoing" ? "text-emerald-50" : "text-slate-600"}
        />
        <StatFilterCard
          label="DURAKLATILDI"
          count={pausedCount}
          active={listFilter.type === "paused"}
          dimmed={isDimmed("paused")}
          onClick={togglePausedFilter}
          baseClass={
            listFilter.type === "paused"
              ? "bg-amber-500 hover:bg-amber-600"
              : "bg-amber-400 hover:bg-amber-500"
          }
          labelClass={listFilter.type === "paused" ? "text-black/50" : "text-black/60"}
          countClass="text-black"
          activeBorderClass="border-amber-800 text-amber-800"
          areas={pausedByArea}
          detailClass="text-black/80"
        />
        <StatFilterCard
          label="Süresi Dolanlar"
          count={expiredCount}
          active={listFilter.type === "expired"}
          dimmed={isDimmed("expired")}
          onClick={toggleExpiredFilter}
          baseClass={
            listFilter.type === "expired"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-red-50 hover:bg-red-100/80"
          }
          labelClass={listFilter.type === "expired" ? "text-red-100" : "text-slate-400"}
          countClass={listFilter.type === "expired" ? "text-white" : "text-red-600"}
          activeBorderClass="border-red-500 text-red-500"
          areas={expiredByArea}
          detailClass={listFilter.type === "expired" ? "text-red-50" : "text-slate-600"}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-3">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 hover:text-slate-700 ${
                      sort?.key === c.key ? "text-slate-700" : ""
                    }`}
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label}
                    <SortIcon column={c.key} sort={sort} />
                  </button>
                </th>
              ))}
              <th className="px-5 py-3">
                <div className="flex items-center justify-end gap-2">
                  <span>İşlemler</span>
                  <Icon name="pencil" className="h-4 w-4 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {active.isLoading ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center text-sm text-slate-400">
                  Yükleniyor...
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center text-sm text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              pageRows.map((v, i) => {
                const grouped = (guardianCounts.get(v.guardianId) ?? 0) > 1;
                const isFirst = i === 0 || pageRows[i - 1].guardianId !== v.guardianId;
                const isLast =
                  i === pageRows.length - 1 || pageRows[i + 1].guardianId !== v.guardianId;
                const expired = estCheckout(v) - effectiveNow(v, now) <= 0;
                return (
                  <tr
                    key={v.id}
                    className={expired ? "bg-red-50 text-slate-700" : "text-slate-700"}
                  >
                    <td className="px-5 py-3 text-slate-600">{v.guardian?.fullName ?? "-"}</td>
                    <td className="relative px-5 py-3 font-semibold text-slate-800">
                      {grouped && (
                        <span
                          className={`absolute left-2 w-1 bg-indigo-500 ${
                            isFirst ? "top-1/2 rounded-t-full" : "top-0"
                          } ${isLast ? "bottom-1/2 rounded-b-full" : "bottom-0"}`}
                        />
                      )}
                      <span className={grouped ? "pl-3" : ""}>{v.child?.fullName ?? "-"}</span>
                    </td>
                    <td className="px-5 py-3">
                      {v.pricingPlan?.playArea ? (
                        <span className="badge bg-indigo-50 text-indigo-600">
                          {v.pricingPlan.playArea}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{v.guardian?.phone ?? "-"}</td>
                    <td className="px-5 py-3">
                      {v.discount && v.discount > 0 ? (
                        <span className="leading-tight">
                          <span className="text-xs text-slate-400 line-through">
                            {formatCurrency(basePrice(v))}
                          </span>
                          <span className="ml-1.5 font-medium text-slate-800">
                            {formatCurrency(netPrice(v))}
                          </span>
                        </span>
                      ) : (
                        formatCurrency(netPrice(v))
                      )}
                    </td>
                    <td className="px-5 py-3">{formatTime(v.checkInAt)}</td>
                    <td className="px-5 py-3">{formatTime(new Date(estCheckout(v)).toISOString())}</td>
                    <td className="px-5 py-3">
                      <RemainingTimer visit={v} now={now} />
                    </td>
                    <td className="px-5 py-3">
                      <RowActions
                        paused={Boolean(v.pausedAt)}
                        onExtend={() => setExtendVisit(v)}
                        onCheckout={() => setCheckoutVisit(v)}
                        onPause={() => togglePause.mutate(v.id)}
                        onPrint={() => printReceipt(v, user?.username ?? "")}
                        onCancel={() => setCancelVisitModal(v)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
        <span>
          {total} kayıttan {start} - {end} arası gösteriliyor
        </span>
        <div className="flex items-center gap-1">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            aria-label="Önceki"
          >
            <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
          </button>
          {getVisiblePages(currentPage, pageCount).map((p, idx) =>
            p === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Sayfa ${p + 1}`}
                aria-current={p === currentPage ? "page" : undefined}
                className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-medium tabular-nums transition ${
                  p === currentPage
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p + 1}
              </button>
            )
          )}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            aria-label="Sonraki"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {checkoutVisit && (
        <CheckOutModal
          visit={checkoutVisit}
          onClose={() => setCheckoutVisit(null)}
          onDone={handleDone}
        />
      )}

      {extendVisit && (
        <ExtendModal
          visit={extendVisit}
          plans={(plans.data ?? []).filter(
            (p) => !extendVisit.pricingPlan?.playArea || p.playArea === extendVisit.pricingPlan.playArea
          )}
          pending={extend.isPending}
          onClose={() => setExtendVisit(null)}
          onSubmit={(minutes, fee) =>
            extend.mutate(
              { id: extendVisit.id, minutes, fee },
              { onSuccess: () => setExtendVisit(null) }
            )
          }
        />
      )}

      {cancelVisitModal && (
        <CancelModal
          pending={cancelVisit.isPending}
          onClose={() => setCancelVisitModal(null)}
          onConfirm={() => cancelVisit.mutate(cancelVisitModal.id)}
        />
      )}
    </div>
  );
}

function CancelModal({
  pending,
  onClose,
  onConfirm,
}: {
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white px-8 py-8 text-center shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          aria-label="Kapat"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <svg
            className="h-9 w-9 text-amber-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-slate-800">İptal Et</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">
          Bu seansı iptal etmek istediğinize emin misiniz?
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button type="button" className="btn-ghost min-w-[120px]" onClick={onClose}>
            Hayır
          </button>
          <button
            type="button"
            className="btn-primary min-w-[120px]"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "İptal ediliyor..." : "İptal Et"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtendModal({
  visit,
  plans,
  pending,
  onClose,
  onSubmit,
}: {
  visit: Visit;
  plans: PricingPlan[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (minutes: number, fee: number) => void;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [manualMin, setManualMin] = useState("");
  const [manualFee, setManualFee] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = estCheckout(visit) - effectiveNow(visit, now);

  function selectPlan(p: PricingPlan) {
    setSelectedPlanId((cur) => (cur === p.id ? null : p.id));
    setManualMin("");
    setManualFee("");
  }

  function onManualChange(setter: (v: string) => void, value: string) {
    setSelectedPlanId(null);
    setter(value);
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const minutes = selectedPlan ? selectedPlan.unitMinutes : Number(manualMin) || 0;
  const fee = selectedPlan ? planPrice(selectedPlan) : Number(manualFee) || 0;
  const canSubmit = minutes > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="text-lg font-bold text-slate-800">Süre Uzat</div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Icon name="clock" className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs text-slate-400">Seçilen Misafir</div>
                <div className="font-bold text-slate-800">{visit.child?.fullName ?? "-"}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-cyan-500">
                {visit.pricingPlan?.unitMinutes ?? 0} dk
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Kalan:{" "}
                <span
                  className={`font-semibold ${
                    remainingMs <= 0
                      ? "text-red-600"
                      : remainingMs <= 5 * 60000
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }`}
                >
                  {remainingMs <= 0 ? "Süre doldu" : formatCountdown(remainingMs)}
                </span>
              </div>
            </div>
          </div>

          {plans.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Mevcut Süre Paketleri
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {plans.map((p) => {
                  const isSel = selectedPlanId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPlan(p)}
                      className={`relative rounded-xl border p-4 text-center transition-colors ${
                        isSel
                          ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-200"
                          : "border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {isSel && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <Icon name="check" className="h-3 w-3" />
                        </span>
                      )}
                      <div className="font-bold text-slate-800">{p.unitMinutes} dk</div>
                      <div className="mt-0.5 text-sm font-semibold text-indigo-600">
                        {formatCurrency(planPrice(p))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-100" />
            veya Manuel Girin
            <span className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ek Süre (dk)</label>
              <input
                type="number"
                min={1}
                className="input"
                placeholder="Örn: 30"
                value={manualMin}
                onChange={(e) => onManualChange(setManualMin, e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ek Ücret (TL)</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="Örn: 50"
                value={manualFee}
                onChange={(e) => onManualChange(setManualFee, e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button className="btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button
            className="btn-primary gap-1.5"
            onClick={() => onSubmit(minutes, fee)}
            disabled={pending || !canSubmit}
          >
            <Icon name="plus" className="h-4 w-4" />
            {pending ? "Ekleniyor..." : "Süreyi Uzat"}
          </button>
        </div>
      </div>
    </div>
  );
}

function planPrice(p: PricingPlan): number {
  const isWeekend = [0, 6].includes(new Date().getDay());
  const w = isWeekend ? p.weekendPrice : p.weekdayPrice;
  return w ?? p.price ?? 0;
}
