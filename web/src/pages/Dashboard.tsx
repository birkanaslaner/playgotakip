import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Visit } from "../api/types";
import { Icon } from "../components/icons";
import PlayAreaDonut, { withPlayAreaColors } from "../components/PlayAreaDonut";
import { formatCurrency, formatDuration } from "../utils/format";

interface Occupancy {
  activeCount: number;
  visits: Visit[];
}
interface PlayAreaDistribution {
  totalVisits: number;
  areas: { area: string; count: number }[];
}
interface Daily {
  visitCount: number;
  totalRevenue: number;
  cash: number;
  card: number;
  visits: Visit[];
}

function visitEndMs(v: Visit): number {
  const t = new Date(v.checkInAt).getTime();
  const mins = (v.pricingPlan?.unitMinutes ?? 0) + (v.extraMinutes ?? 0);
  return t + mins * 60000 + (v.pausedMs ?? 0);
}

function formatRemainingMs(ms: number): string {
  if (ms <= 0) return "Süre doldu";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}dk ${s}sn`;
}

function remainingAtCheckout(v: Visit): string {
  if (!v.checkOutAt) return "-";
  const end = visitEndMs(v);
  const out = new Date(v.checkOutAt).getTime();
  return formatRemainingMs(end - out);
}

function isToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export default function Dashboard() {
  const [revealEarnings, setRevealEarnings] = useState(false);

  const occupancy = useQuery({
    queryKey: ["occupancy"],
    queryFn: async () => (await api.get<Occupancy>("/reports/occupancy")).data,
    refetchInterval: 30000,
  });
  const daily = useQuery({
    queryKey: ["daily"],
    queryFn: async () => (await api.get<Daily>("/reports/daily")).data,
    refetchInterval: 60000,
  });
  const playAreaDistribution = useQuery({
    queryKey: ["play-area-distribution"],
    queryFn: async () =>
      (await api.get<PlayAreaDistribution>("/reports/play-area-distribution")).data,
    refetchInterval: 30000,
  });
  const totalPlayTime = useQuery({
    queryKey: ["total-play-time"],
    queryFn: async () => (await api.get<{ totalMinutes: number }>("/reports/total-play-time")).data,
    refetchInterval: 60000,
  });
  const guardians = useQuery({
    queryKey: ["guardians", "dashboard"],
    queryFn: async () => (await api.get<{ createdAt?: string }[]>("/guardians")).data,
  });

  const deliveredVisits = daily.data?.visits ?? [];
  const playAreaSegments = withPlayAreaColors(playAreaDistribution.data?.areas ?? []);

  const activeCount = occupancy.data?.activeCount ?? 0;
  const totalRevenue = daily.data?.totalRevenue ?? 0;
  const totalPlayMinutes = totalPlayTime.data?.totalMinutes ?? 0;
  const newGuardians = guardians.data?.filter((g) => isToday(g.createdAt)).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Ust satir: 3 istatistik karti */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Gunluk Kazanc */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-bold tracking-wide text-slate-800">
              {revealEarnings ? formatCurrency(totalRevenue) : "\u2605\u2605\u2605\u2605"}
            </div>
            <button
              className="text-slate-400 hover:text-slate-600"
              onClick={() => setRevealEarnings((v) => !v)}
              aria-label="Tutari goster/gizle"
            >
              <Icon name={revealEarnings ? "eye" : "eyeOff"} className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Günlük Kazanç</span>
            <span className="text-xs text-slate-400">döne göre</span>
          </div>
        </div>

        {/* Toplam Oyun Suresi */}
        <div className="card">
          <div className="text-3xl font-bold text-slate-800">
            {totalPlayMinutes > 0 ? formatDuration(totalPlayMinutes) : "0"}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Toplam Oyun Süresi</span>
            <span className="text-xs text-slate-400">bugüne kadar</span>
          </div>
        </div>

        {/* Yeni Veliler */}
        <div className="card">
          <div className="text-3xl font-bold text-slate-800">{newGuardians}</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Yeni Veliler</span>
            <span className="flex items-center gap-2">
              <span className="badge bg-emerald-100 text-emerald-700">+{newGuardians}</span>
              <span className="text-xs text-slate-400">döne göre</span>
            </span>
          </div>
        </div>
      </div>

      {/* Orta satir: analiz + dagilim */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Aktif Oyun Süresi Analizi</h2>
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">{activeCount}</span>
              <span className="text-slate-400">Anlık İçerde</span>
            </span>
          </div>

          <div className="flex h-44 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-300">
            {activeCount > 0 ? "Grafik" : ""}
          </div>

          <div className="mt-4 grid grid-cols-3 border-t border-slate-100 pt-4 text-center">
            <div>
              <div className="text-lg font-semibold text-slate-800">0</div>
              <div className="text-xs text-slate-400">Ort. Günlük</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-800">0</div>
              <div className="text-xs text-slate-400">Ort. Haftalık</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-800">0</div>
              <div className="text-xs text-slate-400">Ort. Aylık</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Oyun Alanı Dağılımı</h2>
            <span className="text-xs text-slate-400">Bugüne kadar</span>
          </div>
          <PlayAreaDonut segments={playAreaSegments} />
        </div>
      </div>

      {/* Alt satir: teslim edilmis cocuklar */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-800">Aktif Oyun Süreleri</h2>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4 font-medium">Veli Adı</th>
                  <th className="pb-2 pr-4 font-medium">Çocuk Adı</th>
                  <th className="pb-2 pr-4 font-medium">Oyun Alanı</th>
                  <th className="pb-2 pr-4 font-medium">Telefon</th>
                  <th className="pb-2 pr-4 font-medium">Kalan Süre</th>
                </tr>
              </thead>
              <tbody>
                {deliveredVisits.length > 0 ? (
                  deliveredVisits.map((v) => (
                    <tr key={v.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-4 text-slate-600">{v.guardian?.fullName ?? "-"}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-800">
                        {v.child?.fullName ?? "-"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {v.pricingPlan?.playArea ?? v.pricingPlan?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{v.guardian?.phone ?? "-"}</td>
                      <td className="py-3 pr-4 font-medium text-slate-700">
                        {remainingAtCheckout(v)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                      Bugün teslim edilmiş kayıt bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
