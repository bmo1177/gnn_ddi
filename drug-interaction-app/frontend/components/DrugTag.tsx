interface DrugTagProps {
  name: string;
  onRemove: () => void;
  onClick?: () => void;
}

export default function DrugTag({ name, onRemove, onClick }: DrugTagProps) {
  return (
    <div 
      className="group animate-fade-in inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg
                 bg-[var(--color-bg-primary)] border border-[var(--color-border)]
                 hover:border-[var(--color-purple)]/50 hover:bg-[var(--color-purple)]/5
                 transition-all duration-200 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-green)] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-green)]"></span>
      </span>
      <span className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
        {name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-md
                   text-[var(--color-text-muted)] hover:text-[var(--color-red)] hover:bg-[var(--color-red)]/10
                   opacity-0 group-hover:opacity-100 transition-all duration-150"
        aria-label={`Remove ${name}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
