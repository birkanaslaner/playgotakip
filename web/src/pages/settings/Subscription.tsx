import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Icon } from "../../components/icons";

interface Feature {
  key: string;
  label: string;
}

const FEATURES: Feature[] = [
  { key: "softPlay", label: "Soft Play Entegrasyonu" },
  { key: "sms", label: "SMS Entegrasyonu" },
  { key: "push", label: "Push Bildirimi" },
  { key: "cafe", label: "Kafe Entegrasyonu" },
  { key: "reports", label: "Satış Raporları" },
  { key: "detailedReports", label: "Detaylı Satış Raporları" },
  { key: "hidden", label: "Gizli Özellikler" },
  { key: "phone", label: "Telefon Desteği" },
];

interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  userCount: string;
  maxUsers: number;
  included: string[];
}

const PLANS: Plan[] = [
  {
    id: "ekonomik",
    name: "Ekonomik Paket",
    tagline: "Küçük işletmeler için ideal.",
    price: 719,
    userCount: "1",
    maxUsers: 1,
    included: ["softPlay", "reports", "phone"],
  },
  {
    id: "standart",
    name: "Standart Paket",
    tagline: "Orta ölçekli işletmeler için ideal.",
    price: 879,
    userCount: "1-3",
    maxUsers: 3,
    included: ["softPlay", "reports", "phone"],
  },
  {
    id: "premium",
    name: "Premium Paket",
    tagline: "Büyük ölçekli işletmeler için ideal.",
    price: 1049,
    userCount: "1-7",
    maxUsers: 7,
    included: ["softPlay", "sms", "push", "cafe", "reports", "detailedReports", "hidden", "phone"],
  },
];

function formatTL(value: number): string {
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function nextRenewalDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Subscription() {
  const queryClient = useQueryClient();
  const plansRef = useRef<HTMLDivElement>(null);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get<Record<string, string>>("/settings")).data,
  });

  const currentId = settings.data?.["subscription.plan"] ?? "premium";
  const current = PLANS.find((p) => p.id === currentId) ?? PLANS[2];

  const changePlan = useMutation({
    mutationFn: async (id: string) =>
      (await api.put("/settings", { "subscription.plan": id })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
          <Icon name="creditCard" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Abonelik</h2>
          <p className="text-sm text-slate-500">
            KidsPlay aboneliğinizi ve faturalandırmanızı yönetin.
          </p>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 lg:flex-row">
        <div className="flex-1 bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
            Mevcut Plan
          </span>
          <h3 className="mt-1 text-2xl font-bold">{current.name}</h3>
          <div className="mt-1 text-xl font-semibold">
            {formatTL(current.price)} <span className="text-sm font-normal text-indigo-200">/ ay</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-indigo-100">
            <Icon name="refresh" className="h-4 w-4" />
            Sonraki yenileme: {nextRenewalDate()}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn bg-white text-indigo-600 hover:bg-indigo-50">
              Aboneliği Yenile
            </button>
            <button
              className="btn bg-white/15 text-white hover:bg-white/25"
              onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              Plan Değiştir
            </button>
            <button className="btn bg-white/15 text-white hover:bg-white/25">İptal Et</button>
          </div>
        </div>

        <div className="w-full shrink-0 bg-white p-6 lg:w-80">
          <h4 className="text-sm font-semibold text-slate-700">Kullanım</h4>
          <p className="text-xs text-slate-400">Bu dönemki plan limitleri</p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Şubeler</span>
              <span className="font-semibold text-slate-800">1</span>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Personel hesapları</span>
                <span className="font-semibold text-slate-800">1 / {current.maxUsers}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(1 / current.maxUsers) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">SMS kredisi</span>
              <span className="font-semibold text-slate-800">0 SMS</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={plansRef} className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon name="creditCard" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-800">Mevcut Planlar</h3>
            <p className="text-xs text-slate-400">Dilediğiniz zaman yükseltin veya düşürün</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === current.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border p-5 ${
                  isCurrent ? "border-emerald-400 ring-1 ring-emerald-400" : "border-slate-200"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Mevcut Plan
                  </span>
                )}
                <h4 className="font-semibold text-slate-800">{plan.name}</h4>
                <p className="text-xs text-slate-400">{plan.tagline}</p>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-slate-800">{formatTL(plan.price)}</span>
                  <span className="text-sm text-slate-400"> / ay</span>
                </div>

                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-slate-700">
                    <Icon name="check" className="h-4 w-4 text-emerald-500" />
                    Kullanıcı Sayısı: {plan.userCount}
                  </li>
                  {FEATURES.map((f) => {
                    const included = plan.included.includes(f.key);
                    return (
                      <li
                        key={f.key}
                        className={`flex items-center gap-2 ${
                          included ? "text-slate-700" : "text-slate-300"
                        }`}
                      >
                        <Icon
                          name={included ? "check" : "close"}
                          className={`h-4 w-4 ${included ? "text-emerald-500" : "text-slate-300"}`}
                        />
                        {f.label}
                      </li>
                    );
                  })}
                </ul>

                <button
                  className={`btn mt-5 w-full ${
                    isCurrent
                      ? "cursor-default bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                  disabled={isCurrent || changePlan.isPending}
                  onClick={() => !isCurrent && changePlan.mutate(plan.id)}
                >
                  {isCurrent ? "Kullanıyor" : "Bu plana geç"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon name="doc" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-800">Fatura Geçmişi</h3>
            <p className="text-xs text-slate-400">0 fatura</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3">Fatura</th>
              <th className="px-6 py-3">Tarih</th>
              <th className="px-6 py-3">Tutar</th>
              <th className="px-6 py-3">Durum</th>
              <th className="px-6 py-3 text-right">İndir</th>
            </tr>
          </thead>
        </table>
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-slate-500">Henüz fatura kaydı yok.</p>
          <p className="text-xs text-slate-400">
            Faturalarınız ödeme sonrası e-posta ile gönderilir.
          </p>
        </div>
      </div>
    </div>
  );
}
