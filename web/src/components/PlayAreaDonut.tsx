const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#64748b"];

export interface PlayAreaSegment {
  area: string;
  count: number;
  color: string;
}

export function withPlayAreaColors(
  areas: { area: string; count: number }[]
): PlayAreaSegment[] {
  return areas.map((a, i) => ({ ...a, color: COLORS[i % COLORS.length] }));
}

function DonutChart({ segments, total }: { segments: PlayAreaSegment[]; total: number }) {
  const r = 15.915;
  let rotation = -90;

  return (
    <svg viewBox="0 0 36 36" className="h-44 w-44 shrink-0" role="img" aria-label="Oyun alanı dağılım grafiği">
      {segments.map((seg) => {
        const pct = total > 0 ? seg.count / total : 0;
        const dash = pct * 100;
        const el = (
          <circle
            key={seg.area}
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="4.2"
            strokeDasharray={`${dash} ${100 - dash}`}
            strokeLinecap="butt"
            transform={`rotate(${rotation} 18 18)`}
          />
        );
        rotation += pct * 360;
        return el;
      })}
      <text x="18" y="17.2" textAnchor="middle" fill="#1e293b" fontSize="5.5" fontWeight="700">
        {total}
      </text>
      <text x="18" y="21.8" textAnchor="middle" fill="#94a3b8" fontSize="2.6">
        kişi
      </text>
    </svg>
  );
}

export default function PlayAreaDonut({ segments }: { segments: PlayAreaSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  if (segments.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-slate-400">
        Henüz veri yok
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
      <DonutChart segments={segments} total={total} />
      <ul className="w-full space-y-2.5 sm:w-auto">
        {segments.map((seg) => (
          <li key={seg.area} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              {seg.area}
            </span>
            <span className="font-bold tabular-nums text-slate-800">{seg.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
