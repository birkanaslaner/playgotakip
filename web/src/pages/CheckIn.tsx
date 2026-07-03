import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../api/client";
import type { Guardian, PricingPlan } from "../api/types";

export default function CheckIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [guardianId, setGuardianId] = useState<number | null>(null);
  const [childId, setChildId] = useState<number | null>(null);
  const [pricingPlanId, setPricingPlanId] = useState<number | null>(null);
  const [wristbandNo, setWristbandNo] = useState("");
  const [error, setError] = useState("");

  const guardians = useQuery({
    queryKey: ["guardians", search],
    queryFn: async () =>
      (await api.get<Guardian[]>("/guardians", { params: { q: search } })).data,
  });
  const plans = useQuery({
    queryKey: ["plans", "active"],
    queryFn: async () =>
      (await api.get<PricingPlan[]>("/pricing-plans", { params: { active: true } })).data,
  });

  const selectedGuardian = useMemo(
    () => guardians.data?.find((g) => g.id === guardianId) ?? null,
    [guardians.data, guardianId]
  );

  const checkIn = useMutation({
    mutationFn: async () =>
      (
        await api.post("/visits/check-in", {
          guardianId,
          childId,
          pricingPlanId,
          wristbandNo,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["occupancy"] });
      navigate("/");
    },
    onError: (err) => setError(apiError(err, "Giris yapilamadi")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!guardianId || !childId || !pricingPlanId || !wristbandNo.trim()) {
      setError("Lutfen tum alanlari doldurun");
      return;
    }
    checkIn.mutate();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Giris Yap</h1>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="font-semibold">1. Veli & Cocuk Sec</h2>

          <div>
            <label className="label">Veli ara (ad veya telefon)</label>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ornek: Ayse ya da 0532..."
            />
          </div>

          <div>
            <label className="label">Veli</label>
            <select
              className="input"
              value={guardianId ?? ""}
              onChange={(e) => {
                setGuardianId(Number(e.target.value) || null);
                setChildId(null);
              }}
            >
              <option value="">Seciniz</option>
              {guardians.data?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName} - {g.phone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Cocuk</label>
            <select
              className="input"
              value={childId ?? ""}
              onChange={(e) => setChildId(Number(e.target.value) || null)}
              disabled={!selectedGuardian}
            >
              <option value="">Seciniz</option>
              {selectedGuardian?.children?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
            {selectedGuardian && (selectedGuardian.children?.length ?? 0) === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Bu veliye ait cocuk yok. Veliler ekranindan ekleyin.
              </p>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">2. Bileklik & Tarife</h2>

          <div>
            <label className="label">Bileklik / Bilet No</label>
            <input
              className="input"
              value={wristbandNo}
              onChange={(e) => setWristbandNo(e.target.value)}
              placeholder="Ornek: 12"
            />
          </div>

          <div>
            <label className="label">Tarife</label>
            <div className="grid gap-2">
              {plans.data?.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    pricingPlanId === p.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="plan"
                      checked={pricingPlanId === p.id}
                      onChange={() => setPricingPlanId(p.id)}
                    />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-slate-400">
                      {p.type === "SAATLIK" ? `${p.unitMinutes} dk basi` : "sabit"}
                    </span>
                  </span>
                  <span className="font-semibold">{p.price} TL</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={checkIn.isPending}>
            {checkIn.isPending ? "Kaydediliyor..." : "Girisi Baslat"}
          </button>
        </div>
      </form>
    </div>
  );
}
