import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Visit } from "../api/types";
import { formatCurrency, formatDuration, formatDateTime } from "../utils/format";

interface Daily {
  date: string;
  visitCount: number;
  totalRevenue: number;
  cash: number;
  card: number;
  visits: Visit[];
}

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const daily = useQuery({
    queryKey: ["daily-report", date],
    queryFn: async () =>
      (await api.get<Daily>("/reports/daily", { params: { date } })).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Raporlar</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Tarih</label>
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <div className="text-sm text-slate-500">Ziyaret sayisi</div>
          <div className="mt-1 text-2xl font-semibold">{daily.data?.visitCount ?? 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Toplam gelir</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatCurrency(daily.data?.totalRevenue ?? 0)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Nakit</div>
          <div className="mt-1 text-2xl font-semibold">{formatCurrency(daily.data?.cash ?? 0)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Kart</div>
          <div className="mt-1 text-2xl font-semibold">{formatCurrency(daily.data?.card ?? 0)}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Ziyaret Gecmisi</h2>
        {daily.isLoading ? (
          <p className="text-sm text-slate-500">Yukleniyor...</p>
        ) : daily.data && daily.data.visits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-4">Cocuk</th>
                  <th className="py-2 pr-4">Veli</th>
                  <th className="py-2 pr-4">Bileklik</th>
                  <th className="py-2 pr-4">Cikis</th>
                  <th className="py-2 pr-4">Sure</th>
                  <th className="py-2 pr-4">Odeme</th>
                  <th className="py-2 pr-4 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {daily.data.visits.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{v.child?.fullName}</td>
                    <td className="py-2 pr-4 text-slate-500">{v.guardian?.fullName}</td>
                    <td className="py-2 pr-4">#{v.wristbandNo}</td>
                    <td className="py-2 pr-4">{formatDateTime(v.checkOutAt)}</td>
                    <td className="py-2 pr-4">{formatDuration(v.durationMin)}</td>
                    <td className="py-2 pr-4">{v.paymentMethod === "KART" ? "Kart" : "Nakit"}</td>
                    <td className="py-2 pr-4 text-right font-semibold">
                      {formatCurrency(v.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Bu tarihte tamamlanmis ziyaret yok.</p>
        )}
      </div>
    </div>
  );
}
