import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../../api/client";
import type { PricingPlan, PricingType } from "../../api/types";
import { Icon } from "../../components/icons";
import { formatCurrency } from "../../utils/format";

const typeLabels: Record<PricingType, string> = {
  SAATLIK: "Saatlik",
  SABIT: "Sabit",
  PAKET: "Paket",
};

function AddPackageModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PricingType>("SAATLIK");
  const [price, setPrice] = useState("");
  const [unitMinutes, setUnitMinutes] = useState("60");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post<PricingPlan>("/pricing-plans", {
          name,
          type,
          price: Number(price),
          unitMinutes: Number(unitMinutes),
        })
      ).data,
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => setError(apiError(err, "Paket eklenemedi")),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !price) {
      setError("Lütfen paket adı ve fiyat girin");
      return;
    }
    create.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Yeni Süre Paketi</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Paket Adı</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Tip</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as PricingType)}>
              <option value="SAATLIK">Saatlik (süreye göre)</option>
              <option value="SABIT">Sabit (tek fiyat)</option>
              <option value="PAKET">Paket</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fiyat (TL)</label>
              <input type="number" className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            {type === "SAATLIK" && (
              <div>
                <label className="label">Birim (dk)</label>
                <input
                  type="number"
                  className="input"
                  value={unitMinutes}
                  onChange={(e) => setUnitMinutes(e.target.value)}
                />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={create.isPending}>
            {create.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AreasModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon name="grid" className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Oyun Alanları</h3>
        <p className="mt-2 text-sm text-slate-500">
          Oyun alanı (bölge) tanımlama özelliği yakında eklenecek. Şimdilik paketlerinizi
          oluşturabilirsiniz.
        </p>
        <button className="btn-primary mt-6 w-full" onClick={onClose}>
          Tamam
        </button>
      </div>
    </div>
  );
}

export default function TimeTrackingSettings() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showAreas, setShowAreas] = useState(false);

  const plans = useQuery({
    queryKey: ["plans", "all"],
    queryFn: async () => (await api.get<PricingPlan[]>("/pricing-plans")).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  }

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/pricing-plans/${id}`),
    onSuccess: refresh,
  });

  const hasPackages = plans.data && plans.data.length > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
            <Icon name="clock" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Süre Takip Ayarları</h2>
            <p className="text-sm text-slate-500">
              Oyun alanlarına göre süre paketlerini ve ücretlendirmeyi yönet.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost gap-2" onClick={() => setShowAreas(true)}>
            <Icon name="grid" className="h-4 w-4" />
            Oyun Alanları
          </button>
          <button
            className="btn gap-2 bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => setShowAdd(true)}
          >
            <Icon name="plus" className="h-4 w-4" />
            Paket Ekle
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {plans.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Yükleniyor...</p>
        ) : hasPackages ? (
          <div className="divide-y divide-slate-100">
            {plans.data!.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                    <Icon name="clock" className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      {!p.active && (
                        <span className="badge bg-slate-100 text-slate-500">Pasif</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {typeLabels[p.type]}
                      {p.type === "SAATLIK" ? ` · ${p.unitMinutes} dk` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-800">{formatCurrency(p.price)}</span>
                  {p.active && (
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => remove.mutate(p.id)}
                    >
                      Pasif yap
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
              <Icon name="box" className="h-8 w-8" />
            </span>
            <p className="text-sm text-slate-400">Henüz süre paketi eklenmemiş</p>
            <button className="btn-primary mt-4 gap-2" onClick={() => setShowAdd(true)}>
              <Icon name="plus" className="h-4 w-4" />
              İlk Paketi Ekle
            </button>
          </div>
        )}
      </div>

      {showAdd && <AddPackageModal onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {showAreas && <AreasModal onClose={() => setShowAreas(false)} />}
    </div>
  );
}
