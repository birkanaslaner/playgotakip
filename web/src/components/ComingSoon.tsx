interface ComingSoonProps {
  title: string;
  description: string;
  bullets?: string[];
}

export function ComingSoon({ title, description, bullets }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="card max-w-2xl space-y-4">
        <span className="badge bg-amber-100 text-amber-700">Yakinda</span>
        <p className="text-sm text-slate-600">{description}</p>
        {bullets && bullets.length > 0 && (
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-500">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
