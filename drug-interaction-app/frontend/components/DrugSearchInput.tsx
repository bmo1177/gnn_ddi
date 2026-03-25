"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { API_BASE_URL } from "@/lib/api-config";

interface DrugSearchInputProps {
  onSelect: (drug: string) => void;
  addedDrugs: string[];
}

export default forwardRef<{ focus: () => void }, DrugSearchInputProps>(
  function DrugSearchInput({ onSelect, addedDrugs }, ref) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const fetchSuggestions = useCallback(
      async (q: string) => {
        if (q.trim().length < 1) {
          setSuggestions([]);
          setIsOpen(false);
          return;
        }
        try {
          const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}&limit=8`);
          const data = await res.json();
          const filtered = (data.results || []).filter(
            (name: string) => !addedDrugs.includes(name)
          );
          setSuggestions(filtered);
          setIsOpen(filtered.length > 0);
          setHighlightIdx(-1);
        } catch {
          setSuggestions([]);
        }
      },
      [addedDrugs]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
    };

    const selectDrug = (name: string) => {
      onSelect(name);
      setQuery("");
      setSuggestions([]);
      setIsOpen(false);
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
          selectDrug(suggestions[highlightIdx]);
        } else if (query.trim()) {
          selectDrug(query.trim());
        }
      }
    };

    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
      <div className="relative">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder="Search medications..."
            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl
                       pl-10 pr-4 py-3 text-sm text-[var(--color-text-primary)]
                       placeholder:text-[var(--color-text-muted)]
                       focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20
                       transition-all duration-200"
            aria-label="Search medications"
            aria-describedby="search-hint"
            aria-autocomplete="list"
            aria-controls="drug-suggestions"
            aria-expanded={isOpen}
          />
        </div>
        <span id="search-hint" className="sr-only">
          Type to search for medications. Use arrow keys to navigate results and Enter to select.
        </span>

        {isOpen && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            id="drug-suggestions"
            role="listbox"
            className="absolute z-50 w-full mt-2 card border rounded-xl shadow-lg overflow-hidden animate-fade-in"
            aria-label="Medication suggestions"
          >
            {suggestions.map((name, idx) => (
              <button
                key={name}
                onClick={() => selectDrug(name)}
                role="option"
                aria-selected={idx === highlightIdx}
                className={`w-full px-4 py-3 text-left text-sm font-[family-name:var(--font-mono)]
                           transition-all duration-100 flex items-center gap-3 cursor-pointer
                           ${
                             idx === highlightIdx
                               ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                               : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)]"
                           }`}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--color-green)] shrink-0" aria-hidden="true" />
                <span className="flex-1">{name}</span>
                {idx === highlightIdx && (
                  <span className="text-[10px] text-[var(--color-primary)] opacity-60">Enter to select</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);