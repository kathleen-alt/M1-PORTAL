import { scoreBg, scoreColor } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-orca-300">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-orca-300">{label}</span>
        <span className={`font-semibold ${scoreColor(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-orca-800">
        <div
          className={`h-full rounded-full ${scoreBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreRing({ score, label }: { score: number; label?: string }) {
  const color =
    score >= 80 ? "#34d399" : score >= 60 ? "#3f9bcf" : score >= 40 ? "#f59e0b" : "#fb7185";
  return (
    <div
      className="relative flex h-16 w-16 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, #143a54 0deg)`,
      }}
    >
      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-orca-900">
        <span className="text-base font-bold text-white">{score}</span>
        {label && <span className="text-[9px] text-orca-300">{label}</span>}
      </div>
    </div>
  );
}
