interface SummaryData {
  total_pairs: number;
  high_risk: number;
  moderate_risk: number;
  low_risk: number;
  overall_risk: string;
  max_probability: number;
}

interface SummaryBannerProps {
  summary: SummaryData;
}

export default function SummaryBanner({ summary }: SummaryBannerProps) {
  const { total_pairs, high_risk, moderate_risk, low_risk, overall_risk, max_probability } = summary;

  const bgGradient =
    overall_risk === "HIGH"
      ? "from-[var(--color-red)]/10 to-transparent"
      : overall_risk === "MODERATE"
        ? "from-[var(--color-amber)]/10 to-transparent"
        : "from-[var(--color-green)]/10 to-transparent";

  const borderColor =
    overall_risk === "HIGH"
      ? "border-[var(--color-red)]/30"
      : overall_risk === "MODERATE"
        ? "border-[var(--color-amber)]/30"
        : "border-[var(--color-green)]/30";

  const riskColor =
    overall_risk === "HIGH"
      ? "var(--color-red)"
      : overall_risk === "MODERATE"
        ? "var(--color-amber)"
        : "var(--color-green)";

  return (
    <div className={`animate-slide-up rounded-2xl border p-5 bg-gradient-to-br ${bgGradient} ${borderColor}`}>
      <div className="flex items-center justify-between flex-wrap gap-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-xl blur-lg opacity-30"
              style={{ backgroundColor: riskColor }}
            />
            <div
              className="relative w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${riskColor}20` }}
            >
              {overall_risk === "HIGH" ? (
                <svg className="w-6 h-6" style={{ color: riskColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : overall_risk === "MODERATE" ? (
                <svg className="w-6 h-6" style={{ color: riskColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" style={{ color: riskColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                Overall Risk Level
              </span>
              <span
                className="text-sm font-bold font-[family-name:var(--font-mono)] px-2.5 py-1 rounded-lg"
                style={{ color: riskColor, backgroundColor: `${riskColor}20` }}
              >
                {overall_risk}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Max probability: <span className="font-[family-name:var(--font-mono)]" style={{ color: riskColor }}>{(max_probability * 100).toFixed(1)}%</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <StatBlock label="Total" value={total_pairs} color="var(--color-text-secondary)" />
          <div className="w-px h-8 bg-[var(--color-border)]" />
          <StatBlock label="High" value={high_risk} color="var(--color-red)" />
          <StatBlock label="Moderate" value={moderate_risk} color="var(--color-amber)" />
          <StatBlock label="Low" value={low_risk} color="var(--color-green)" />
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center min-w-[48px]">
      <div 
        className="text-2xl font-bold font-[family-name:var(--font-mono)]"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium mt-0.5">
        {label}
      </div>
    </div>
  );
}
