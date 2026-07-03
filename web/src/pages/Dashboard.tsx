import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Guardian, Visit } from "../api/types";
import { Icon } from "../components/icons";
import { formatCurrency, formatDuration, formatTime } from "../utils/format";

interface Occupancy {
  activeCount: number;
  visits: Visit[];
}
interface Daily {
  visitCount: number;
  totalRevenue: number;
  cash: number;
  card: number;
  visits: Visit[];
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
  const guardians = useQuery({
    queryKey: ["guardians", "dashboard"],
    queryFn: async () => (await api.get<Guardian[]>("/guardians")).data,
  });

  const activeCount = occupancy.data?.activeCount ?? 0;
  const totalRevenue = daily.data?.totalRevenue ?? 0;
  const totalPlayMinutes =
    daily.data?.visits.reduce((sum, v) => sum + (v.durationMin ?? 0), 0) ?? 0;
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
            <span className="text-xs text-slate-400">bugün şimdiye kadar</span>
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
          <h2 className="mb-4 font-semibold text-slate-800">Oyun Alanı Dağılımı</h2>
          <div className="flex h-52 items-center justify-center text-sm text-slate-400">
            Bugün veri yok
          </div>
        </div>
      </div>

      {/* Alt satir: aktif oyun sureleri tablosu */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-800">Aktif Oyun Süreleri</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4 font-medium">Çocuk / Veli</th>
                <th className="pb-2 pr-4 font-medium">Oyun Alanı</th>
                <th className="pb-2 pr-4 font-medium">Giriş Saati</th>
              </tr>
            </thead>
            <tbody>
              {occupancy.data && occupancy.data.visits.length > 0 ? (
                occupancy.data.visits.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-800">{v.child?.fullName}</div>
                      <div className="text-xs text-slate-400">{v.guardian?.fullName}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{v.pricingPlan?.name ?? "-"}</td>
                    <td className="py-3 pr-4 text-slate-600">{formatTime(v.checkInAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-sm text-slate-400">
                    İçeride kimse bulunmuyor.
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
