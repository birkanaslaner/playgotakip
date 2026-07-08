import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../api/client";
import type { Child, Guardian, PlayArea, PricingPlan, Visit } from "../api/types";
import { Icon } from "../components/icons";
import { formatCurrency } from "../utils/format";

type ChildChip = { name: string; id: number | null };

const VALIDITY_OPTIONS = [1, 2, 3, 6, 12];

function formatPhone(value: string): string {
  let core = value.replace(/\D/g, "");
  if (core.startsWith("0")) core = core.slice(1); // baştaki 0 otomatik yönetilir
  core = core.replace(/^[^5]+/, ""); // 5 dışındaki baş rakamlar (ör. 0) gecersiz
  core = core.slice(0, 10);
  if (!core) return "";
  const d = "0" + core; // her zaman 05... ile baslar
  const parts: string[] = [d.slice(0, 4)];
  if (d.length > 4) parts.push(d.slice(4, 7));
  if (d.length > 7) parts.push(d.slice(7, 9));
  if (d.length > 9) parts.push(d.slice(9, 11));
  return parts.join(" ");
}

function normName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

function planPrice(p: PricingPlan): number {
  const isWeekend = [0, 6].includes(new Date().getDay());
  const w = isWeekend ? p.weekendPrice : p.weekdayPrice;
  return w ?? p.price ?? 0;
}

function planOptionLabel(p: PricingPlan): string {
  return `${p.unitMinutes} dk - ${planPrice(p).toFixed(2)} TL`;
}

function addMonths(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function CheckIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [children, setChildren] = useState<ChildChip[]>([]);
  const [childInput, setChildInput] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [playArea, setPlayArea] = useState("");
  const [pricingPlanId, setPricingPlanId] = useState("");
  const [validityMonths, setValidityMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("NAKIT");
  const [discount, setDiscount] = useState("0");
  const [findPhone, setFindPhone] = useState("");
  const [finding, setFinding] = useState(false);
  const [foundGuardianId, setFoundGuardianId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [conflict, setConflict] = useState(false);

  const areas = useQuery({
    queryKey: ["play-areas"],
    queryFn: async () => (await api.get<PlayArea[]>("/play-areas")).data,
  });
  const plans = useQuery({
    queryKey: ["plans", "active"],
    queryFn: async () =>
      (await api.get<PricingPlan[]>("/pricing-plans", { params: { active: true } })).data,
  });

  const areaPlans = useMemo(
    () => (plans.data ?? []).filter((p) => !playArea || p.playArea === playArea),
    [plans.data, playArea]
  );

  const selectedPlan = useMemo(
    () => (plans.data ?? []).find((p) => String(p.id) === pricingPlanId) ?? null,
    [plans.data, pricingPlanId]
  );

  const unitPrice = selectedPlan ? planPrice(selectedPlan) : 0;
  const childCount = Math.max(children.length, 1);
  const discountNum = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, unitPrice * childCount - discountNum);
  const membershipEnd = addMonths(validityMonths);
  const endDateStr = membershipEnd.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  function addChild(name: string) {
    const n = name.trim().replace(/\s+/g, " ");
    if (!n) return;
    setChildren((prev) =>
      prev.some((c) => normName(c.name) === normName(n)) ? prev : [...prev, { name: n, id: null }]
    );
    setChildInput("");
  }

  function removeChild(index: number) {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }

  function handleChildKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChild(childInput);
    } else if (e.key === "Backspace" && !childInput && children.length) {
      removeChild(children.length - 1);
    }
  }

  async function handleFind() {
    const q = findPhone.trim();
    if (!q) return;
    setFinding(true);
    setError("");
    try {
      const { data } = await api.get<Guardian[]>("/guardians", { params: { q } });
      const g = data[0];
      if (g) {
        setGuardianName(g.fullName);
        setPhone(formatPhone(g.phone));
        setFoundGuardianId(g.id);
        setChildren((g.children ?? []).map((k) => ({ name: k.fullName, id: k.id })));
      } else {
        setError("Bu telefona kayıtlı müşteri bulunamadı.");
      }
    } catch (err) {
      setError(apiError(err, "Arama yapılamadı"));
    } finally {
      setFinding(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      let gId = foundGuardianId;
      if (!gId) {
        const { data: found } = await api.get<Guardian[]>("/guardians", {
          params: { q: phone.trim() },
        });
        const normPhone = (s: string) => s.replace(/\D/g, "");
        const match =
          found.find((g) => normPhone(g.phone) === normPhone(phone)) ??
          found.find((g) => normName(g.fullName) === normName(guardianName));
        gId = match
          ? match.id
          : (
              await api.post<Guardian>("/guardians", {
                fullName: guardianName.trim().replace(/\s+/g, " "),
                phone: phone.trim(),
              })
            ).data.id;
      }

      const childIds: number[] = [];
      const { data: kids } = await api.get<Child[]>("/children", { params: { guardianId: gId } });
      for (const c of children) {
        if (c.id) {
          childIds.push(c.id);
          continue;
        }
        const match = kids.find((k) => normName(k.fullName) === normName(c.name));
        childIds.push(
          match
            ? match.id
            : (
                await api.post<Child>("/children", {
                  fullName: c.name.trim().replace(/\s+/g, " "),
                  guardianId: gId,
                })
              ).data.id
        );
      }

      const { data: activeNow } = await api.get<Visit[]>("/visits", {
        params: { status: "active" },
      });
      const activeSet = new Set(activeNow.map((v) => v.childId));
      if (childIds.some((id) => activeSet.has(id))) {
        throw new Error("CHILD_ALREADY_ACTIVE");
      }

      const base = Date.now() % 100000;
      const results = [];
      for (let i = 0; i < childIds.length; i++) {
        const wristbandNo = String((base + i) % 100000);
        results.push(
          (
            await api.post("/visits/check-in", {
              guardianId: gId,
              childId: childIds[i],
              pricingPlanId: Number(pricingPlanId),
              wristbandNo,
              paymentMethod,
              discount: i === 0 ? discountNum : 0,
              membershipMonths: validityMonths,
              membershipEndAt: membershipEnd.toISOString(),
            })
          ).data
        );
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits", "active"] });
      queryClient.invalidateQueries({ queryKey: ["occupancy"] });
      navigate("/sure-takip");
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "CHILD_ALREADY_ACTIVE") {
        setConflict(true);
        return;
      }
      setError(apiError(err, "Kayıt yapılamadı"));
    },
  });

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 11 && phoneDigits.startsWith("0");

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (children.length === 0 || !guardianName.trim() || !phone.trim() || !playArea || !pricingPlanId) {
      setError("Lütfen zorunlu (*) alanları doldurun.");
      return;
    }
    if (!phoneValid) {
      setError("Telefon numarası 0 ile başlamalı ve 11 haneli olmalıdır.");
      return;
    }
    setError("");
    save.mutate();
  }

  const err = (cond: boolean) =>
    submitted && cond ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "";

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-2">
            <Icon name="plus" className="mt-0.5 h-5 w-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Yeni Müşteri Kaydı</h2>
              <p className="text-sm text-slate-400">Oyun alanına yeni bir müşteri girişi yapın.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                className="w-52 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
                placeholder="Tel ile Bul (05...)"
                value={findPhone}
                onChange={(e) => setFindPhone(formatPhone(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFind();
                  }
                }}
              />
            </div>
            <button type="button" className="btn-primary" onClick={handleFind} disabled={finding}>
              {finding ? "..." : "Bul"}
            </button>
          </div>
        </div>

        <div className="grid gap-8 py-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Icon name="users" className="h-4 w-4 text-slate-400" />
              Müşteri Bilgileri
            </div>

            <div>
              <label className="label flex items-center gap-1">
                Çocuk Adı Soyadı *
                <span title="Birden fazla çocuk ekleyebilirsiniz. Eklemek için isim yazıp Enter'a basın.">
                  <Icon name="info" className="h-3.5 w-3.5 text-slate-300" />
                </span>
              </label>
              <div
                className={`flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm outline-none focus-within:border-brand-500 ${
                  submitted && children.length === 0 ? "border-red-500" : "border-slate-200"
                }`}
              >
                {children.map((c, i) => (
                  <span
                    key={`${c.name}-${i}`}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                  >
                    {c.name}
                    <button
                      type="button"
                      onClick={() => removeChild(i)}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      <Icon name="close" className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  className="min-w-[120px] flex-1 border-0 bg-transparent p-1 text-sm outline-none"
                  value={childInput}
                  onChange={(e) => setChildInput(e.target.value)}
                  onKeyDown={handleChildKey}
                  onBlur={() => addChild(childInput)}
                  placeholder={children.length === 0 ? "Örn: Ali Yılmaz" : "Başka çocuk ekle..."}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Veli Adı Soyadı *</label>
                <input
                  className={`input ${err(!guardianName.trim())}`}
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Örn: Ayşe Yılmaz"
                />
              </div>
              <div>
                <label className="label">Telefon Numarası *</label>
                <input
                  className={`input ${err(!phoneValid)}`}
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    setFoundGuardianId(null);
                  }}
                  placeholder="0 5__ ___ __ __"
                />
                {submitted && !phoneValid && (
                  <p className="mt-1 text-xs text-red-600">
                    0 ile başlamalı ve 11 haneli olmalıdır.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Icon name="grid" className="h-4 w-4 text-slate-400" />
              Oyun Alanı Seçimi
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Oyun Alanı *</label>
                <select
                  className={`input ${err(!playArea)}`}
                  value={playArea}
                  onChange={(e) => {
                    setPlayArea(e.target.value);
                    setPricingPlanId("");
                  }}
                >
                  <option value="">Seçiniz</option>
                  {areas.data?.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Süre / Paket *</label>
                <select
                  className={`input ${err(!pricingPlanId)}`}
                  value={pricingPlanId}
                  onChange={(e) => setPricingPlanId(e.target.value)}
                  disabled={!playArea}
                >
                  <option value="">Seçiniz</option>
                  {areaPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {planOptionLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPlan && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Icon name="info" className="h-4 w-4 text-indigo-500" />
                    Geçerlilik Süresi
                  </div>
                  <div className="text-xs text-indigo-600">
                    Abonelik bitiş tarihi: <span className="font-semibold">{endDateStr}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {VALIDITY_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setValidityMonths(m)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        validityMonths === m
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-slate-600 hover:bg-indigo-100"
                      }`}
                    >
                      {m} Ay
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 text-sm font-semibold text-slate-700">
              <Icon name="creditCard" className="h-4 w-4 text-slate-400" />
              Ödeme Bilgileri
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ödeme Türü</label>
                <select
                  className="input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="NAKIT">Nakit</option>
                  <option value="KART">Kredi Kartı</option>
                </select>
              </div>
              <div>
                <label className="label">İndirim Tutarı</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Toplam Alınacak Ücret
            </div>
            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(total)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => navigate("/sure-takip")}>
              İptal
            </button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? "Kaydediliyor..." : "Kaydet ve Süreyi Başlat"}
            </button>
          </div>
        </div>
      </form>

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white px-8 py-8 text-center shadow-xl">
            <button
              type="button"
              onClick={() => setConflict(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              aria-label="Kapat"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg
                className="h-7 w-7"
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
            <h3 className="text-2xl font-bold text-slate-800">Hata</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">
              Bu çocuk zaten içeride. Lütfen önce mevcut işlemini sonlandırın veya çocuk listesini
              kontrol edin.
            </p>
            <button
              type="button"
              onClick={() => setConflict(false)}
              className="mt-6 rounded-lg bg-red-500 px-8 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
