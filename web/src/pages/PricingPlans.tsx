import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../api/client";
import type { PricingPlan, PricingType } from "../api/types";
import { formatCurrency } from "../utils/format";

const typeLabels: Record<PricingType, string> = {
  SAATLIK: "Saatlik",
  SABIT: "Sabit",
  PAKET: "Paket",
};

export default function PricingPlans() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<PricingType>("SAATLIK");
  const [price, setPrice] = useState("");
  const [unitMinutes, setUnitMinutes] = useState("60");
  const [error, setError] = useState("");

  const plans = useQuery({
    queryKey: ["plans", "all"],
    queryFn: async () => (await api.get<PricingPlan[]>("/pricing-plans")).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  }

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
      setName("");
      setPrice("");
      setUnitMinutes("60");
      setError("");
      refresh();
    },
    onError: (err) => setError(apiError(err, "Tarife eklenemedi")),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/pricing-plans/${id}`),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tarifeler</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <h2 className="font-semibold">Yeni Tarife</h2>
          <div>
            <label className="label">Ad</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Tip</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as PricingType)}
            >
              <option value="SAATLIK">Saatlik (sureye gore)</option>
              <option value="SABIT">Sabit (tek fiyat)</option>
              <option value="PAKET">Paket</option>
            </select>
          </div>
          <div>
            <label className="label">Fiyat (TL)</label>
            <input
              type="number"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          {type === "SAATLIK" && (
            <div>
              <label className="label">Birim sure (dakika)</label>
              <input
                type="number"
                className="input"
                value={unitMinutes}
                onChange={(e) => setUnitMinutes(e.target.value)}
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={create.isPending}>
            {create.isPending ? "Ekleniyor..." : "Tarife Ekle"}
          </button>
        </form>

        <div className="lg:col-span-2">
          <div className="card">
            {plans.isLoading ? (
              <p className="text-sm text-slate-500">Yukleniyor...</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-4">Ad</th>
                    <th className="py-2 pr-4">Tip</th>
                    <th className="py-2 pr-4">Fiyat</th>
                    <th className="py-2 pr-4">Birim</th>
                    <th className="py-2 pr-4">Durum</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {plans.data?.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.name}</td>
                      <td className="py-2 pr-4">{typeLabels[p.type]}</td>
                      <td className="py-2 pr-4">{formatCurrency(p.price)}</td>
                      <td className="py-2 pr-4">
                        {p.type === "SAATLIK" ? `${p.unitMinutes} dk` : "-"}
                      </td>
                      <td className="py-2 pr-4">
                        {p.active ? (
                          <span className="badge bg-green-100 text-green-700">Aktif</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500">Pasif</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {p.active && (
                          <button
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => remove.mutate(p.id)}
                          >
                            Pasif yap
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
