import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CafeTable, TableStats, TableStatus } from "../api/types";
import { Icon } from "../components/icons";
import { formatCurrency } from "../utils/format";

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
}: {
  table: CafeTable;
  onEdit: () => void;
  onTogglePassive: () => void;
  onDelete: () => void;
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
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        onClick={() => setOpen((v) => !v)}
        aria-label="Masa menüsü"
      >
        <Icon name="more" className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Düzenle
          </button>
          {!hasOpenTab && table.status !== "DOLU" && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onTogglePassive();
              }}
            >
              {table.status === "PASIF" ? "Aktif yap" : "Pasif yap"}
            </button>
          )}
          {!hasOpenTab && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
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
      return { label: "UYGUN", className: "bg-emerald-50 text-emerald-700" };
    case "DOLU":
      return { label: "DOLU", className: "bg-brand-50 text-brand-700" };
    case "PASIF":
      return { label: "PASİF", className: "bg-slate-100 text-slate-500" };
  }
}

function tableFooter(table: CafeTable): string {
  if (table.status === "PASIF") return "Hizmet dışı";
  if (table.status === "DOLU" && table.openTab) {
    return formatCurrency(table.openTab.total);
  }
  return "Boş adisyon yok";
}

function NewTableModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: async () => (await api.post("/tables", { name: name.trim() })).data,
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-800">Yeni Masa</h3>
        <p className="mt-1 text-sm text-slate-500">Masa adını girin (ör. MASA 4, BAHÇE 05)</p>
        <input
          className="input mt-4"
          placeholder="Masa adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && name.trim() && create.mutate()}
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTableModal({
  table,
  onClose,
  onSaved,
}: {
  table: CafeTable;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(table.name);

  const save = useMutation({
    mutationFn: async () =>
      (await api.put(`/tables/${table.id}`, { name: name.trim() })).data,
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-800">Masayı Düzenle</h3>
        <input
          className="input mt-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TableOrder() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showNew, setShowNew] = useState(false);
  const [editTable, setEditTable] = useState<CafeTable | null>(null);

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
    onSuccess: refresh,
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
              Yeni Masa
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
              return (
                <div
                  key={table.id}
                  className="relative flex min-h-[180px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`badge ${badge.className}`}>{badge.label}</span>
                    <TableCardMenu
                      table={table}
                      onEdit={() => setEditTable(table)}
                      onTogglePassive={() =>
                        updateTable.mutate({
                          id: table.id,
                          status: table.status === "PASIF" ? "UYGUN" : "PASIF",
                        })
                      }
                      onDelete={() => {
                        if (window.confirm(`"${table.name}" masasını silmek istiyor musunuz?`)) {
                          deleteTable.mutate(table.id);
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
                    <Icon name="table" className="mb-3 h-10 w-10 text-slate-300" />
                    <h3 className="text-base font-bold tracking-wide text-slate-800">{table.name}</h3>
                  </div>

                  <p className="border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
                    {tableFooter(table)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <NewTableModal onClose={() => setShowNew(false)} onCreated={refresh} />}
      {editTable && (
        <EditTableModal table={editTable} onClose={() => setEditTable(null)} onSaved={refresh} />
      )}
    </div>
  );
}
