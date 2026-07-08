import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../../api/client";
import type { PlayArea, PricingPlan, PricingType } from "../../api/types";
import { Icon } from "../../components/icons";
import { formatCurrency } from "../../utils/format";

const typeLabels: Record<PricingType, string> = {
  SAATLIK: "Saatlik",
  SABIT: "Sabit Paket",
  PAKET: "Paket",
};

function Toggle({
  checked,
  onChange,
  accent = "emerald",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: "emerald" | "amber";
}) {
  const on = accent === "amber" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? on : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function AddPackageDrawer({
  onClose,
  onSaved,
  plan,
}: {
  onClose: () => void;
  onSaved: () => void;
  plan?: PricingPlan;
}) {
  const editing = !!plan;
  const [playArea, setPlayArea] = useState(plan?.playArea ?? "");
  const [type, setType] = useState<PricingType>(plan?.type ?? "SABIT");
  const [unitMinutes, setUnitMinutes] = useState(plan ? String(plan.unitMinutes) : "");
  const [weekdayPrice, setWeekdayPrice] = useState(
    plan ? String(plan.weekdayPrice ?? plan.price) : ""
  );
  const [weekendPrice, setWeekendPrice] = useState(
    plan ? String(plan.weekendPrice ?? plan.price) : ""
  );
  const [label, setLabel] = useState(plan?.label ?? "");
  const [carryOver, setCarryOver] = useState(plan?.carryOver ?? false);
  const [loyalty, setLoyalty] = useState(plan?.loyalty ?? false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const errArea = submitted && !playArea.trim();
  const errUnit = submitted && !unitMinutes.trim();
  const errWeekday = submitted && !weekdayPrice.trim();
  const errWeekend = submitted && !weekendPrice.trim();

  const areas = useQuery({
    queryKey: ["play-areas"],
    queryFn: async () => (await api.get<PlayArea[]>("/play-areas")).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        type,
        playArea: playArea || null,
        label: label || null,
        unitMinutes: Number(unitMinutes),
        weekdayPrice: Number(weekdayPrice),
        weekendPrice: Number(weekendPrice),
        carryOver,
        loyalty,
      };
      return editing
        ? (await api.put<PricingPlan>(`/pricing-plans/${plan!.id}`, payload)).data
        : (await api.post<PricingPlan>("/pricing-plans", payload)).data;
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => setError(apiError(err, "Paket kaydedilemedi")),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!playArea.trim() || !unitMinutes.trim() || !weekdayPrice.trim() || !weekendPrice.trim()) {
      setError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    setError("");
    create.mutate();
  }

  const durationHint =
    type === "SAATLIK"
      ? "Her belirtilen süre için ücret alınır."
      : "Paketin toplam süresi.";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Icon name="clock" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {editing ? "Süre Paketi Düzenle" : "Yeni Süre Paketi"}
              </h3>
              <p className="text-xs text-slate-400">
                Model seçimine göre ücret alanları otomatik düzenlenir.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="label">
              Oyun Alanı <span className="text-red-500">*</span>
            </label>
            <select
              className={`input ${errArea ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
              value={playArea}
              onChange={(e) => setPlayArea(e.target.value)}
            >
              <option value="">Seçin...</option>
              {areas.data?.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
            {errArea ? (
              <p className="mt-1 text-xs text-red-600">Bu alan zorunludur.</p>
            ) : (
              areas.data &&
              areas.data.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Henüz oyun alanı yok. "Oyun Alanları" butonundan ekleyebilirsiniz.
                </p>
              )
            )}
          </div>

          <div>
            <label className="label">Model</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as PricingType)}
            >
              <option value="SABIT">Sabit Paket</option>
              <option value="SAATLIK">Saatlik</option>
              <option value="PAKET">Paket</option>
            </select>
          </div>

          <div>
            <label className="label">
              Süre (dakika) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                className={`input pr-10 ${errUnit ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
                value={unitMinutes}
                onChange={(e) => setUnitMinutes(e.target.value)}
                placeholder="30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                dk
              </span>
            </div>
            {errUnit ? (
              <p className="mt-1 text-xs text-red-600">Bu alan zorunludur.</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">{durationHint}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                Haftaiçi Ücret (TL) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className={`input pr-8 ${errWeekday ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
                  value={weekdayPrice}
                  onChange={(e) => setWeekdayPrice(e.target.value)}
                  placeholder="10.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  ₺
                </span>
              </div>
              {errWeekday && <p className="mt-1 text-xs text-red-600">Bu alan zorunludur.</p>}
            </div>
            <div>
              <label className="label">
                Haftasonu Ücret (TL) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className={`input pr-8 ${errWeekend ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
                  value={weekendPrice}
                  onChange={(e) => setWeekendPrice(e.target.value)}
                  placeholder="15.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  ₺
                </span>
              </div>
              {errWeekend && <p className="mt-1 text-xs text-red-600">Bu alan zorunludur.</p>}
            </div>
          </div>

          <div>
            <label className="label">Açılır Liste Etiketi</label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Örn: 1 Saat Oyun Paketi"
            />
            <p className="mt-1 text-xs text-slate-400">
              Müşteri kaydı modalındaki açılır listede gösterilecek özel etiket. Boş bırakılması
              durumunda otomatik olarak oluşturulur.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-700">Süre Devri</div>
              <div className="text-xs text-slate-400">
                Kullanılmayan süreyi sonraki girişe aktar
              </div>
            </div>
            <Toggle checked={carryOver} onChange={setCarryOver} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-amber-800">Sadakat Kampanyası</div>
              <div className="text-xs text-amber-600">
                Belirli giriş sayısına ücretsiz hak tanır
              </div>
            </div>
            <Toggle checked={loyalty} onChange={setLoyalty} accent="amber" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? "Kaydediliyor..." : editing ? "Kaydet" : "Paketi ekle"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PlayAreaRow({ area, onChanged }: { area: PlayArea; onChanged: () => void }) {
  const [name, setName] = useState(area.name);

  const save = useMutation({
    mutationFn: async (value: string) => api.put(`/play-areas/${area.id}`, { name: value }),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: async () => api.delete(`/play-areas/${area.id}`),
    onSuccess: onChanged,
  });

  return (
    <div className="flex items-center gap-2">
      <input
        className="input flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== area.name) save.mutate(trimmed);
          else if (!trimmed) setName(area.name);
        }}
      />
      <button
        type="button"
        className="shrink-0 p-2 text-slate-400 hover:text-red-600"
        onClick={() => remove.mutate()}
        aria-label="Oyun alanını sil"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
  );
}

function PlayAreasDrawer({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const areas = useQuery({
    queryKey: ["play-areas"],
    queryFn: async () => (await api.get<PlayArea[]>("/play-areas")).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["play-areas"] });
  }

  const add = useMutation({
    mutationFn: async () => api.post("/play-areas", { name: name.trim() }),
    onSuccess: () => {
      refresh();
      setName("");
    },
  });

  const count = areas.data?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Icon name="grid" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Oyun Alanlarını Yönet</h3>
              <p className="text-xs text-slate-400">
                Özel oyun alanları ekleyin ve isimlerini düzenleyin.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4">
          <p className="text-sm text-slate-500">
            Oyun alanlarını yeniden adlandırın, yeni ekleyin veya kaldırın. Her alan için ayrı süre
            paketleri tanımlayabilirsiniz.
          </p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {areas.isLoading ? (
            <p className="text-sm text-slate-500">Yükleniyor...</p>
          ) : count > 0 ? (
            areas.data!.map((a) => <PlayAreaRow key={a.id} area={a} onChanged={refresh} />)
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              Henüz oyun alanı yok.
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Yeni oyun alanı adı"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) add.mutate();
              }}
            />
            <button
              type="button"
              className="btn-primary shrink-0 gap-2"
              onClick={() => name.trim() && add.mutate()}
              disabled={add.isPending || !name.trim()}
            >
              <Icon name="plus" className="h-4 w-4" />
              Oyun alanı ekle
            </button>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimeTrackingSettings() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showAreas, setShowAreas] = useState(false);
  const [editPlan, setEditPlan] = useState<PricingPlan | null>(null);
  const [activeTab, setActiveTab] = useState("Tümü");

  const plans = useQuery({
    queryKey: ["plans", "all"],
    queryFn: async () => (await api.get<PricingPlan[]>("/pricing-plans")).data,
  });

  const areas = useQuery({
    queryKey: ["play-areas"],
    queryFn: async () => (await api.get<PlayArea[]>("/play-areas")).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  }

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/pricing-plans/${id}`),
    onSuccess: refresh,
  });

  const activePlans = (plans.data ?? []).filter((p) => p.active);
  const visiblePlans =
    activeTab === "Tümü" ? activePlans : activePlans.filter((p) => p.playArea === activeTab);
  const areaCount = areas.data?.length ?? 0;
  const tabs = ["Tümü", ...(areas.data?.map((a) => a.name) ?? [])];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
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

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-indigo-500 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Icon name="clock" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-800">Süre Paketleri</h3>
              <p className="text-xs text-slate-400">{activePlans.length} aktif paket</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            {areaCount} oyun alanı
          </span>
        </div>

        {plans.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Yükleniyor...</p>
        ) : visiblePlans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Oyun Alanı</th>
                  <th className="px-5 py-3">Süre (dk)</th>
                  <th className="px-5 py-3">Haftaiçi Ücret (TL)</th>
                  <th className="px-5 py-3">Haftasonu Ücret</th>
                  <th className="px-5 py-3">Model / Detay</th>
                  <th className="px-5 py-3">Devreden</th>
                  <th className="px-5 py-3">Promosyon</th>
                  <th className="px-5 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePlans.map((p) => (
                  <tr key={p.id} className="text-slate-700">
                    <td className="px-5 py-3 font-medium">{p.playArea || "Genel"}</td>
                    <td className="px-5 py-3 text-slate-500">{p.unitMinutes} dk</td>
                    <td className="px-5 py-3">{formatCurrency(p.weekdayPrice ?? p.price)}</td>
                    <td className="px-5 py-3">{formatCurrency(p.weekendPrice ?? p.price)}</td>
                    <td className="px-5 py-3">
                      <span className="badge bg-indigo-50 text-indigo-600">{typeLabels[p.type]}</span>
                      {p.label && (
                        <div className="mt-0.5 text-xs text-slate-400">{p.label}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {p.carryOver ? (
                        <span className="badge gap-1.5 bg-emerald-50 text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Evet
                        </span>
                      ) : (
                        <span className="badge gap-1.5 bg-red-50 text-red-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Hayır
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {p.loyalty ? (
                        <span className="badge bg-amber-100 text-amber-600">Sadakat</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-slate-400 hover:text-indigo-600"
                          onClick={() => setEditPlan(p)}
                          aria-label="Paketi düzenle"
                        >
                          <Icon name="pencil" className="h-4 w-4" />
                        </button>
                        <button
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => remove.mutate(p.id)}
                          aria-label="Paketi sil"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
              <Icon name="box" className="h-8 w-8" />
            </span>
            <p className="text-sm text-slate-400">
              {activeTab === "Tümü"
                ? "Henüz süre paketi eklenmemiş"
                : `"${activeTab}" için süre paketi yok`}
            </p>
            <button className="btn-primary mt-4 gap-2" onClick={() => setShowAdd(true)}>
              <Icon name="plus" className="h-4 w-4" />
              İlk Paketi Ekle
            </button>
          </div>
        )}
      </div>

      {showAdd && <AddPackageDrawer onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {editPlan && (
        <AddPackageDrawer
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={refresh}
        />
      )}
      {showAreas && <PlayAreasDrawer onClose={() => setShowAreas(false)} />}
    </div>
  );
}
