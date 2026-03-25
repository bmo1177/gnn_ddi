"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DrugSearchInput from "@/components/DrugSearchInput";
import DrugTag from "@/components/DrugTag";
import ResultCard from "@/components/ResultCard";
import SummaryBanner from "@/components/SummaryBanner";
import DrugDetailsModal from "@/components/DrugDetailsModal";
import ThemeToggle from "@/components/ThemeToggle";
import { API_BASE_URL } from "@/lib/api-config";

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

interface Summary {
  total_pairs: number;
  high_risk: number;
  moderate_risk: number;
  low_risk: number;
  overall_risk: string;
  max_probability: number;
}

interface CheckResponse {
  interactions: Interaction[];
  summary: Summary;
  errors: string[];
}

const PRESETS = [
  { label: "High Risk (Cardiac)", drugs: ["Amiodarone", "Digoxin", "Warfarin"] },
  { label: "Moderate Risk", drugs: ["Bumetanide", "Pegfilgrastim", "Magnesium sulfate"] },
  { label: "Low Risk", drugs: ["Batimastat", "Opnurasib", "Niprofazone"] },
  { label: "Mixed Risk", drugs: ["Aspirin", "Ibuprofen", "Batimastat"] },
];

function combinationsCount(n: number): number {
  if (n < 2) return 0;
  return (n * (n - 1)) / 2;
}

const HISTORY_KEY = "druggraph_history";
const MAX_HISTORY = 10;

interface HistoryItem {
  id: string;
  drugs: string[];
  timestamp: number;
  summary?: Summary;
}

export default function Home() {
  const [drugs, setDrugs] = useState<string[]>([]);
  const [results, setResults] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelOk, setModelOk] = useState<boolean | null>(null);
  const [drugCount, setDrugCount] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const searchInputRef = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveToHistory = useCallback((drugList: string[], result: CheckResponse) => {
    const item: HistoryItem = {
      id: Date.now().toString(),
      drugs: drugList,
      timestamp: Date.now(),
      summary: result.summary,
    };
    setHistory(prev => {
      const updated = [item, ...prev.filter(h => h.drugs.join() !== drugList.join())].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const loadFromHistory = (item: HistoryItem) => {
    setDrugs(item.drugs);
    setResults(null);
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  };

  const copyResults = () => {
    if (!results) return;
    const text = [
      `DrugGraph Analysis - ${new Date().toLocaleDateString()}`,
      `Overall Risk: ${results.summary.overall_risk}`,
      `Pairs analyzed: ${results.summary.total_pairs}`,
      "",
      ...results.interactions.map(i => 
        `[${i.risk_level}] ${i.drug_a} + ${i.drug_b}: ${(i.probability * 100).toFixed(0)}% - ${i.advice}`
      ),
      "",
      "For research use only. Not clinical advice.",
    ].join("\n");
    
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((r) => {
        if (!r.ok) throw new Error("Service unavailable");
        return r.json();
      })
      .then((data) => {
        setModelOk(data.model_loaded ?? false);
        setDrugCount(data.n_drugs ?? 0);
      })
      .catch(() => setModelOk(false));
  }, []);

  const addDrug = useCallback(
    (name: string) => {
      if (!drugs.includes(name) && drugs.length < 8) {
        setDrugs((prev) => [...prev, name]);
      }
    },
    [drugs]
  );

  const removeDrug = (name: string) => {
    setDrugs((prev) => prev.filter((d) => d !== name));
  };

  const clearAll = () => {
    setDrugs([]);
    setResults(null);
  };

  const checkInteractions = useCallback(async () => {
    if (drugs.length < 2) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugs }),
      });
      const data: CheckResponse = await res.json();
      setResults(data);
      saveToHistory(drugs, data);
    } catch (err) {
      console.error("Check failed:", err);
    } finally {
      setLoading(false);
    }
  }, [drugs, saveToHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key === "Enter" && drugs.length >= 2 && !loading) {
        e.preventDefault();
        checkInteractions();
      }
      if (modifier && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drugs.length, loading, checkInteractions]);

  const applyPreset = (preset: string[]) => {
    setDrugs(preset);
    setResults(null);
  };

  const pairsCount = combinationsCount(drugs.length);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <main id="main-content" className="min-h-screen p-4 md:p-6 lg:p-10" role="main" aria-label="Drug interaction analysis">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6 lg:gap-10">

          <div className="flex flex-col gap-6">

            <div className="animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-2xl blur-xl" />
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.136a18.024 18.024 0 01-6.363 0l-.772-.136c-1.717-.293-2.3-2.379-1.067-3.611L5 14.5" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight font-[family-name:var(--font-heading)]">
                      DrugGraph
                    </h1>
                    <p className="text-[11px] font-medium tracking-wider text-[var(--color-primary)] uppercase font-[family-name:var(--font-mono)]">
                      GNN-Powered Interaction Checker
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                  <span className="px-2 py-1 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    <kbd className="font-mono">Ctrl+K</kbd> search
                  </span>
                  <span className="px-2 py-1 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    <kbd className="font-mono">Enter</kbd> check
                  </span>
                  <ThemeToggle />
                </div>
                <div className="md:hidden">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                modelOk === true
                  ? "bg-[var(--color-green)]/10 border border-[var(--color-green)]/20 text-[var(--color-green)]"
                  : modelOk === false
                    ? "bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/20 text-[var(--color-amber)]"
                    : "bg-[var(--color-text-muted)]/10 border border-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]"
              }`}>
                <span
                  className={`w-2 h-2 rounded-full ${
                    modelOk === true
                      ? "bg-[var(--color-green)] animate-pulse-dot"
                      : modelOk === false
                        ? "bg-[var(--color-amber)] animate-pulse-dot"
                        : "bg-[var(--color-text-muted)]"
                  }`}
                />
                {modelOk === true
                  ? `${drugCount.toLocaleString()} drugs indexed`
                  : modelOk === false
                    ? "Demo mode"
                    : "Connecting..."}
              </div>
            </div>

            <div className="card p-5 space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Patient Medications
                {drugs.length > 0 && (
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                    {drugs.length}/8
                  </span>
                )}
              </h2>

              <DrugSearchInput ref={searchInputRef} onSelect={addDrug} addedDrugs={drugs} />

              {drugs.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  {drugs.map((d) => (
                    <DrugTag key={d} name={d} onRemove={() => removeDrug(d)} onClick={() => setSelectedDrug(d)} />
                  ))}
                </div>
              )}

              {drugs.length === 0 && (
                <div className="text-center py-3">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Type to search medications
                  </p>
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="space-y-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {history.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="w-full text-left card border rounded-xl px-4 py-3 hover:border-[var(--color-primary)]/40 transition-all group card-hover"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.drugs.slice(0, 2).map((drug, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-[var(--color-bg-primary)] text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)]">
                              {drug}
                            </span>
                          ))}
                          {item.drugs.length > 2 && (
                            <span className="text-[10px] text-[var(--color-text-muted)]">+{item.drugs.length - 2}</span>
                          )}
                        </div>
                        {item.summary && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.summary.overall_risk === "HIGH" ? "bg-[var(--color-red)]/15 text-[var(--color-red)]" :
                            item.summary.overall_risk === "MODERATE" ? "bg-[var(--color-amber)]/15 text-[var(--color-amber)]" :
                            "bg-[var(--color-green)]/15 text-[var(--color-green)]"
                          }`}>
                            {item.summary.overall_risk}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 animate-slide-up" style={{ animationDelay: history.length > 0 ? '200ms' : '150ms' }}>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Quick Start
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset.drugs)}
                    className="text-left card border rounded-xl px-4 py-3 hover:border-[var(--color-primary)]/50 hover:shadow-md transition-all duration-300 group card-hover"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {preset.drugs.slice(0, 2).map((drug, i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60" />
                      ))}
                      <span className={`w-2 h-2 rounded-full ${
                        preset.label.includes('High') ? 'bg-[var(--color-red)]/60' :
                        preset.label.includes('Moderate') ? 'bg-[var(--color-amber)]/60' :
                        preset.label.includes('Low') ? 'bg-[var(--color-green)]/60' :
                        'bg-[var(--color-primary)]/60'
                      }`} />
                    </div>
                    <span className="font-medium text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] block mb-1 transition-colors">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">
                      {preset.drugs.length} drugs
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '250ms' }}>
              <button
                onClick={checkInteractions}
                disabled={drugs.length < 2 || loading}
                className="flex-1 relative overflow-hidden group"
              >
                <div className={`relative px-4 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                  drugs.length >= 2 && !loading
                    ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-[var(--color-primary-glow)]"
                    : "bg-[var(--color-primary)]/40 text-white/60 cursor-not-allowed"
                }`}>
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Analyze {pairsCount} {pairsCount === 1 ? "Pair" : "Pairs"}
                    </>
                  )}
                </div>
              </button>
              {drugs.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-4 py-3.5 rounded-xl border border-[var(--color-border)] text-sm
                             text-[var(--color-text-muted)] hover:text-[var(--color-red)] hover:border-[var(--color-red)]/30
                             transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-[var(--color-border)]/50 space-y-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                <div className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                <span>GraphSAGE | DrugBank v5.1.15</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                <div className="w-1 h-1 rounded-full bg-[var(--color-green)]" />
                <span>{drugCount.toLocaleString()} drugs | 1.45M interactions</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                <div className="w-1 h-1 rounded-full bg-[var(--color-amber)]" />
                <span>AUC: 0.9933</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-[var(--color-amber)]/5 border border-[var(--color-amber)]/10">
                <svg className="w-3 h-3 text-[var(--color-amber)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-[10px] text-[var(--color-amber)]">For research only. Not clinical advice.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">

            <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Interaction Analysis
              </h2>
              {results && (
                <button
                  onClick={copyResults}
                  className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all px-3 py-1.5 rounded-lg hover:bg-[var(--color-primary)]/10"
                >
                  {copyFeedback ? (
                    <>
                      <svg className="w-4 h-4 text-[var(--color-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[var(--color-green)]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Export
                    </>
                  )}
                </button>
              )}
            </div>

            {loading && (
              <div className="space-y-4 stagger-children">
                {Array.from({ length: Math.min(pairsCount, 6) }).map((_, i) => (
                  <div key={i} className="glass border border-[var(--color-border)] rounded-2xl p-6">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-xl shimmer shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <div className="h-5 w-28 rounded-lg shimmer" />
                          <div className="h-5 w-5 rounded shimmer" />
                          <div className="h-5 w-24 rounded-lg shimmer" />
                        </div>
                        <div className="h-4 w-3/4 rounded-lg shimmer" />
                        <div className="h-4 w-1/2 rounded-lg shimmer" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results && (
              <div className="space-y-5">
                <SummaryBanner summary={results.summary} />

                {results.errors.length > 0 && (
                  <div className="card border border-[var(--color-red)]/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-[var(--color-red)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="space-y-1">
                        {results.errors.map((err, i) => (
                          <p key={i} className="text-sm text-[var(--color-red)]">{err}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 stagger-children">
                  {results.interactions.map((interaction, i) => (
                    <ResultCard key={`${interaction.drug_a}-${interaction.drug_b}`} interaction={interaction} index={i} />
                  ))}
                </div>
              </div>
            )}

            {!loading && !results && (
              <div className="flex-1 flex items-center justify-center min-h-[450px]">
                <div className="text-center space-y-6 animate-fade-in max-w-sm">
                  <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-full blur-2xl" />
                    <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-[var(--color-primary)]/20 animate-float" style={{ animationDelay: '0ms' }} />
                    <div className="absolute top-8 right-6 w-4 h-4 rounded-full bg-[var(--color-green)]/20 animate-float" style={{ animationDelay: '500ms' }} />
                    <div className="absolute bottom-6 left-8 w-5 h-5 rounded-full bg-[var(--color-amber)]/20 animate-float" style={{ animationDelay: '1000ms' }} />
                    <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-[var(--color-red)]/20 animate-float" style={{ animationDelay: '1500ms' }} />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl card border flex items-center justify-center">
                        <svg className="w-10 h-10 text-[var(--color-primary)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] font-[family-name:var(--font-heading)]">
                      Ready to Analyze
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">
                      Add at least 2 medications to check for potential interactions using our Graph Neural Network
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-medium">1</span>
                      <span>Search drugs</span>
                    </div>
                    <div className="w-8 h-px bg-[var(--color-border)]" />
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-medium">2</span>
                      <span>Analyze</span>
                    </div>
                    <div className="w-8 h-px bg-[var(--color-border)]" />
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-medium">3</span>
                      <span>Review</span>
                    </div>
                  </div>

                  <div className="px-4 py-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 text-xs text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-primary)]">Tip:</span> Try one of the Quick Start presets above to see it in action
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DrugDetailsModal drugName={selectedDrug} onClose={() => setSelectedDrug(null)} />
    </main>
    </>
  );
}