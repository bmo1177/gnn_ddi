interface Interaction {
  drug_a: string;
  drug_b: string;
  probability: number;
  risk_level: string;
  risk_color: string;
  advice: string;
  drug_a_matched_as?: string;
  drug_b_matched_as?: string;
}

interface ResultCardProps {
  interaction: Interaction;
  index: number;
}

export default function ResultCard({ interaction, index }: ResultCardProps) {
  const {
    drug_a, drug_b, probability, risk_level, risk_color, advice,
    drug_a_matched_as, drug_b_matched_as,
  } = interaction;

  const pct = Math.round(probability * 100);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (probability * circumference);

  const riskBadgeBg =
    risk_level === "HIGH"
      ? "bg-[var(--color-red)]/15 text-[var(--color-red)]"
      : risk_level === "MODERATE"
        ? "bg-[var(--color-amber)]/15 text-[var(--color-amber)]"
        : "bg-[var(--color-green)]/15 text-[var(--color-green)]";

  return (
    <div
      className="group glass border border-[var(--color-border)] rounded-2xl p-5 
                 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-card-hover)]/50
                 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-5">
        {/* Circular probability ring with glow */}
        <div className="relative shrink-0">
          {/* Glow effect */}
          <div 
            className="absolute inset-0 rounded-full blur-lg opacity-40"
            style={{ backgroundColor: risk_color }}
          />
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle 
                cx="40" cy="40" r="36" 
                fill="none" 
                stroke="var(--color-border)" 
                strokeWidth="4" 
              />
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke={risk_color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-lg font-bold font-[family-name:var(--font-mono)]"
                style={{ color: risk_color }}
              >
                {pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Drug pair info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]">
              {drug_a}
            </span>
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <span className="w-4 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="w-4 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
            </div>
            <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]">
              {drug_b}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${riskBadgeBg} border`}>
              {risk_level}
            </span>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{advice}</p>

          {/* Fuzzy match warnings */}
          {(drug_a_matched_as || drug_b_matched_as) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {drug_a_matched_as && (
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-amber)] bg-[var(--color-amber)]/5 px-2 py-1 rounded-md border border-[var(--color-amber)]/10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  &quot;{drug_a}&quot; → &quot;{drug_a_matched_as}&quot;
                </div>
              )}
              {drug_b_matched_as && (
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-amber)] bg-[var(--color-amber)]/5 px-2 py-1 rounded-md border border-[var(--color-amber)]/10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  &quot;{drug_b}&quot; → &quot;{drug_b_matched_as}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
