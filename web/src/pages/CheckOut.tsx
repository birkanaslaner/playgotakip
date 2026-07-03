import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "../api/client";
import type { PaymentMethod, PricingPlan, Visit } from "../api/types";
import { formatCurrency, formatDuration, formatTime, minutesSince } from "../utils/format";

function CheckOutCard({ visit, onDone }: { visit: Visit; onDone: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>("NAKIT");
  const [error, setError] = useState("");

  const quote = useQuery({
    queryKey: ["quote", visit.id],
    queryFn: async () =>
      (await api.get<{ durationMin: number; amount: number }>(`/visits/${visit.id}/quote`)).data,
    refetchInterval: 30000,
  });

  const checkout = useMutation({
    mutationFn: async () =>
      (await api.post(`/visits/${visit.id}/check-out`, { paymentMethod: method })).data,
    onSuccess: onDone,
    onError: (err) => setError(apiError(err, "Cikis yapilamadi")),
  });

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{visit.child?.fullName}</div>
          <div className="text-sm text-slate-500">{visit.guardian?.fullName}</div>
        </div>
        <span className="badge bg-brand-100 text-brand-700">#{visit.wristbandNo}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-slate-400">Giris</div>
          <div>{formatTime(visit.checkInAt)}</div>
        </div>
        <div>
          <div className="text-slate-400">Sure</div>
          <div>{formatDuration(quote.data?.durationMin ?? minutesSince(visit.checkInAt))}</div>
        </div>
        <div>
          <div className="text-slate-400">Tarife</div>
          <div>{visit.pricingPlan?.name}</div>
        </div>
        <div>
          <div className="text-slate-400">Tutar</div>
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

      <button
        className="btn-primary w-full"
        onClick={() => checkout.mutate()}
        disabled={checkout.isPending}
      >
        {checkout.isPending ? "Isleniyor..." : "Cikis Yap & Odeme Al"}
      </button>
    </div>
  );
}

export default function CheckOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
  }

  const noPackages = plans.isSuccess && plans.data.length === 0;

  if (noPackages) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Önce Paket Oluşturmalısınız</h2>
          <p className="mt-2 text-sm text-slate-500">
            Süre takibi yapabilmek için tanımlı en az bir fiyatlandırma paketiniz olmalıdır. Sizi
            paket oluşturma sayfasına yönlendirelim.
          </p>
          <button
            className="btn-primary mt-6 w-full"
            onClick={() => navigate("/ayarlar/sure-takip")}
          >
            Tamam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Süre Takip</h1>

      {active.isLoading ? (
        <p className="text-sm text-slate-500">Yukleniyor...</p>
      ) : active.data && active.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.data.map((v) => (
            <CheckOutCard key={v.id} visit={v} onDone={handleDone} />
          ))}
        </div>
      ) : (
        <div className="card text-sm text-slate-500">Cikis bekleyen aktif ziyaret yok.</div>
      )}
    </div>
  );
}
