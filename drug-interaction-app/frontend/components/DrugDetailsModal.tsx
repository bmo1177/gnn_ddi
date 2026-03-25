"use client";

import { useEffect, useRef } from "react";

interface DrugDetailsModalProps {
  drugName: string | null;
  onClose: () => void;
}

export default function DrugDetailsModal({ drugName, onClose }: DrugDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (drugName) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      previousFocusRef.current?.focus();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drugName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drugName) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drugName, onClose]);

  if (!drugName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="relative card border rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg 
                     text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] 
                     hover:bg-[var(--color-bg-card-hover)] transition-all duration-200 cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-xl blur-lg" />
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.136a18.024 18.024 0 01-6.363 0l-.772-.136c-1.717-.293-2.3-2.379-1.067-3.611L5 14.5" />
              </svg>
            </div>
          </div>
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-mono)]">
              {drugName}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">Drug Information</p>
          </div>
        </div>

        <div className="space-y-3">
          <InfoRow label="Database Source" value="DrugBank v5.1.15" />
          <InfoRow label="Total Known Interactions" value="1,455,278" />
          <InfoRow label="Model Performance" value="AUC 0.9933" />
        </div>

        <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Click any interaction card to see detailed risk analysis with other medications in your list.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-amber)]/5 border border-[var(--color-amber)]/10">
          <svg className="w-4 h-4 text-[var(--color-amber)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] text-[var(--color-amber)]">This is research data, not clinical advice.</span>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] 
                     text-white font-medium text-sm rounded-xl py-3 px-4 transition-all duration-200
                     hover:shadow-lg hover:shadow-[var(--color-primary-glow)] cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-primary)]">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm font-medium font-[family-name:var(--font-mono)] text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}