import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client";
import type { CafeTable, TableStats, TableStatus } from "../api/types";
import { Icon } from "../components/icons";
import { Toggle } from "../components/Toggle";
import { formatCurrency, minutesSince } from "../utils/format";

type StatusFilter = "all" | TableStatus;

function StatCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  icon: "grid" | "coffee" | "check" | "chart";
  iconClass: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  dotClass,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  dotClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {dotClass && (
        <span className={`h-2 w-2 rounded-full ${active ? "bg-white/90" : dotClass}`} />
      )}
      {label}
      <span
        className={`rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function TableCardMenu({
  table,
  onEdit,
  onTogglePassive,
  onDelete,
  tone = "default",
}: {
  table: CafeTable;
  onEdit: () => void;
  onTogglePassive: () => void;
  onDelete: () => void;
  tone?: "default" | "occupied";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const hasOpenTab = !!table.openTab;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={
          tone === "occupied"
            ? "rounded-lg p-1 text-brand-400 hover:bg-brand-100/80 hover:text-brand-600"
            : "rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        }
        onClick={() => setOpen((v) => !v)}
        aria-label="Masa menüsü"
      >
        <Icon name="more" className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Icon name="pencil" className="h-4 w-4 text-slate-400" />
            Düzenle
          </button>
          {!hasOpenTab && table.status !== "DOLU" && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onTogglePassive();
              }}
            >
              {table.status === "PASIF" ? (
                <>
                  <Icon name="check" className="h-4 w-4 text-emerald-500" />
                  Aktif yap
                </>
              ) : (
                <>
                  <Icon name="eyeOff" className="h-4 w-4 text-slate-400" />
                  Pasif yap
                </>
              )}
            </button>
          )}
          {!hasOpenTab && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Icon name="trash" className="h-4 w-4" />
              Sil
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function statusBadge(status: TableStatus) {
  switch (status) {
    case "UYGUN":
      return {
        label: "UYGUN",
        className: "bg-emerald-50 text-emerald-700",
        dotClassName: "bg-emerald-500",
      };
    case "DOLU":
      return {
        label: "DOLU",
        className: "bg-brand-100 font-bold uppercase text-brand-700",
        dotClassName: "bg-brand-500",
      };
    case "PASIF":
      return {
        label: "PASİF",
        className: "bg-slate-100 text-slate-500",
        dotClassName: "bg-slate-400",
      };
  }
}

function tableFooter(table: CafeTable): string {
  if (table.status === "PASIF") return "Hizmet dışı";
  if (table.status === "DOLU" && table.openTab) {
    return formatCurrency(table.openTab.total);
  }
  return "Boş adisyon yok";
}

function TableDrawer({
  table,
  onClose,
  onSaved,
}: {
  table?: CafeTable;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!table;
  const [name, setName] = useState(table?.name ?? "");
  const [active, setActive] = useState(table ? table.status !== "PASIF" : true);
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const closingRef = useRef(false);

  const requestClose = useCallback((done?: () => void) => {
    if (closingRef.current) {
      done?.();
      return;
    }
    closingRef.current = true;
    setOpen(false);
    window.setTimeout(() => {
      done?.();
      onClose();
    }, 320);
  }, [onClose]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        status: (active ? "UYGUN" : "PASIF") as TableStatus,
      };
      if (editing) {
        return (await api.put(`/tables/${table!.id}`, payload)).data;
      }
      return (await api.post("/tables", payload)).data;
    },
    onSuccess: () => {
      onSaved();
      requestClose();
    },
    onError: (err) =>
      setError(
        apiError(err, "Bu isimde mevcut bir masa var. Başka bir masa ismi giriniz.")
      ),
  });

  const nameError = submitted && !name.trim();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const main = document.querySelector("main");
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPadding = document.body.style.paddingRight;
    const prevMainOverflow = main instanceof HTMLElement ? main.style.overflow : "";

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    if (main instanceof HTMLElement) {
      main.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevBodyPadding;
      if (main instanceof HTMLElement) {
        main.style.overflow = prevMainOverflow;
      }
    };
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (!name.trim()) return;
    save.mutate();
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => requestClose()}
        aria-hidden
      />
      <form
        onSubmit={handleSubmit}
        className={`relative flex h-screen w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name="table" className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {editing ? "Masayı Düzenle" : "Yeni Masa Ekle"}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {editing ? "Masa bilgilerini güncelleyin" : "Yeni bir masa oluşturun"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => requestClose()}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Kapat"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="label">
              Masa Adı <span className="text-red-500">*</span>
            </label>
            <input
              className={`input ${nameError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
              placeholder="Örn: Masa 1, Teras 4..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {nameError && <p className="mt-1 text-xs text-red-500">Masa adı gerekli</p>}
          </div>

          <div className="rounded-xl border border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">Masa Aktif</p>
                <p className="mt-1 text-xs text-slate-400">Pasif masalar adisyon alamaz</p>
              </div>
              <Toggle checked={active} onChange={setActive} disabled={table?.status === "DOLU"} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" className="btn-ghost" onClick={() => requestClose()}>
            İptal
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function DeleteTableModal({
  table,
  pending,
  onClose,
  onConfirm,
}: {
  table: CafeTable;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white px-8 py-8 text-center shadow-xl">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
          aria-label="Kapat"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>

        <div className="relative mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center">
          <svg
            className="absolute inset-0 h-full w-full text-amber-100"
            viewBox="0 0 72 72"
            fill="currentColor"
            aria-hidden
          >
            <path d="M36 4c8.8 0 13.2 6.8 21.5 8.2 8.3 1.4 14.9 7.2 16.3 15.5 1.4 8.3 7.2 14.9 8.2 21.5 1 6.6-2.8 13.2-8.2 17.8-5.4 4.6-6.8 13.2-13.2 17.8-6.4 4.6-14.9 4.6-21.5 0-6.6-4.6-13.2-4.6-17.8-13.2-4.6-8.6-1-17.2 0-21.5 1-4.3 6.8-10.1 8.2-16.3C14.8 10.8 20.2 4 27.2 4 31.6 4 33.8 4 36 4Z" />
          </svg>
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
            <Icon name="warn" className="h-6 w-6" />
          </span>
        </div>

        <h3 className="text-2xl font-bold text-slate-800">Masayı Sil</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-700">{table.name}</span> masasını silmek
          istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn-ghost min-w-[120px]"
            onClick={onClose}
            disabled={pending}
          >
            İptal
          </button>
          <button
            type="button"
            className="btn min-w-[120px] bg-red-500 text-white hover:bg-red-600"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Siliniyor..." : "Evet, Sil"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TableOrder() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showNew, setShowNew] = useState(false);
  const [editTable, setEditTable] = useState<CafeTable | null>(null);
  const [deleteTableModal, setDeleteTableModal] = useState<CafeTable | null>(null);

  const tables = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await api.get<CafeTable[]>("/tables")).data,
  });
  const stats = useQuery({
    queryKey: ["tables", "stats"],
    queryFn: async () => (await api.get<TableStats>("/tables/stats")).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tables"] });
    qc.invalidateQueries({ queryKey: ["tables", "stats"] });
  };

  const updateTable = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TableStatus }) =>
      (await api.put(`/tables/${id}`, { status })).data,
    onSuccess: refresh,
  });

  const deleteTable = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/tables/${id}`)).data,
    onSuccess: () => {
      refresh();
      setDeleteTableModal(null);
    },
  });

  const s = stats.data ?? { total: 0, occupied: 0, available: 0, passive: 0, openTotal: 0 };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return (tables.data ?? []).filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (!q) return true;
      return t.name.toLocaleLowerCase("tr").includes(q);
    });
  }, [tables.data, search, filter]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam masa"
          value={s.total}
          icon="grid"
          iconClass="bg-slate-100 text-slate-500"
        />
        <StatCard
          label="Dolu masa"
          value={s.occupied}
          icon="coffee"
          iconClass="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Uygun masa"
          value={s.available}
          icon="check"
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Açık adisyon toplamı"
          value={formatCurrency(s.openTotal)}
          icon="chart"
          iconClass="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
              placeholder="Masa ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              label="Tümü"
              count={s.total}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            <FilterPill
              label="Uygun"
              count={s.available}
              active={filter === "UYGUN"}
              dotClass="bg-emerald-500"
              onClick={() => setFilter("UYGUN")}
            />
            <FilterPill
              label="Dolu"
              count={s.occupied}
              active={filter === "DOLU"}
              dotClass="bg-brand-500"
              onClick={() => setFilter("DOLU")}
            />
            <FilterPill
              label="Pasif"
              count={s.passive}
              active={filter === "PASIF"}
              dotClass="bg-slate-400"
              onClick={() => setFilter("PASIF")}
            />
            <button type="button" className="btn-primary gap-2" onClick={() => setShowNew(true)}>
              <Icon name="plus" className="h-4 w-4" />
              Yeni Masa Ekle
            </button>
          </div>
        </div>

        {tables.isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Masa bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filtered.map((table) => {
              const badge = statusBadge(table.status);
              const isOccupied = table.status === "DOLU";
              const openMinutes = table.openTab?.openedAt
                ? minutesSince(table.openTab.openedAt)
                : null;

              return (
                <div
                  key={table.id}
                  role="button"
                  tabIndex={table.status === "PASIF" ? -1 : 0}
                  onClick={() => {
                    if (table.status !== "PASIF") navigate(`/masalar/${table.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && table.status !== "PASIF") {
                      navigate(`/masalar/${table.id}`);
                    }
                  }}
                  className={`relative flex min-h-[155px] flex-col rounded-xl border p-3 shadow-sm transition-all duration-200 ${
                    isOccupied
                      ? "border-brand-200 bg-brand-50/80 hover:border-brand-300 hover:shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                  } ${table.status === "PASIF" ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`badge gap-1.5 ${badge.className}`}>
                      {badge.dotClassName && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${badge.dotClassName}`}
                          aria-hidden
                        />
                      )}
                      {badge.label}
                    </span>
                    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <TableCardMenu
                        table={table}
                        tone={isOccupied ? "occupied" : "default"}
                        onEdit={() => setEditTable(table)}
                        onTogglePassive={() =>
                          updateTable.mutate({
                            id: table.id,
                            status: table.status === "PASIF" ? "UYGUN" : "PASIF",
                          })
                        }
                        onDelete={() => setDeleteTableModal(table)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
                    <Icon
                      name="table"
                      className={`mb-2 h-9 w-9 ${isOccupied ? "text-brand-400" : "text-slate-300"}`}
                    />
                    <h3
                      className={`text-base font-bold tracking-wide ${
                        isOccupied ? "uppercase text-brand-800" : "text-slate-800"
                      }`}
                    >
                      {table.name}
                    </h3>
                  </div>

                  {isOccupied ? (
                    <div className="flex items-center justify-between border-t border-brand-100 pt-2.5">
                      <span className="text-sm font-bold text-brand-800">
                        {formatCurrency(table.openTab?.total ?? 0)}
                      </span>
                      {openMinutes != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                          <Icon name="clock" className="h-3.5 w-3.5" />
                          {openMinutes} dk
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="border-t border-slate-100 pt-2.5 text-center text-xs text-slate-400">
                      {tableFooter(table)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <TableDrawer onClose={() => setShowNew(false)} onSaved={refresh} />}
      {editTable && (
        <TableDrawer table={editTable} onClose={() => setEditTable(null)} onSaved={refresh} />
      )}
      {deleteTableModal && (
        <DeleteTableModal
          table={deleteTableModal}
          pending={deleteTable.isPending}
          onClose={() => setDeleteTableModal(null)}
          onConfirm={() => deleteTable.mutate(deleteTableModal.id)}
        />
      )}
    </div>
  );
}
