"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { KnownDrug } from "@/types";

interface SearchBarProps {
  value: string;
  drugs: KnownDrug[];
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  onAddDrug: (value: string) => Promise<void>;
  loading?: boolean;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-zinc-400">
    <path
      d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin text-zinc-400">
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      opacity="0.25"
    />
    <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

export const SearchBar = ({
  value,
  drugs,
  onChange,
  onSearch,
  onAddDrug,
  loading
}: SearchBarProps) => {
  const [debounced, setDebounced] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fuse = useMemo(
    () =>
      new Fuse(drugs, {
        keys: ["name", "mfr"],
        threshold: 0.4
      }),
    [drugs]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const suggestions = useMemo(() => {
    if (!debounced.trim()) return [] as KnownDrug[];
    return fuse.search(debounced).map((result) => result.item);
  }, [debounced, fuse]);

  const canAddCurrentValue = useMemo(() => {
    const normalized = debounced.trim().toLowerCase();
    if (normalized.length < 2) return false;
    return !drugs.some((drug) => drug.name.toLowerCase() === normalized);
  }, [debounced, drugs]);

  useEffect(() => {
    setIsOpen((suggestions.length > 0 || canAddCurrentValue) && debounced.trim().length > 0);
  }, [suggestions, debounced, canAddCurrentValue]);

  const handleSubmit = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch(trimmed);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const hasSuggestions = suggestions.length > 0;

    if (!isOpen) {
      if (event.key === "Enter") handleSubmit(value);
      return;
    }

    if (event.key === "ArrowDown" && hasSuggestions) {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && hasSuggestions) {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      handleSubmit(selected ? selected.name : value);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-3 shadow-soft transition-all duration-150 focus-within:border-indigo-600 focus-within:shadow-lift dark:border-zinc-800 dark:bg-zinc-900">
        <SearchIcon />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Ozempic, Semanext, Wegovy..."
          className="flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400"
        />
        {loading ? (
          <Spinner />
        ) : value ? (
          <button
            onClick={() => {
              onChange("");
              setIsOpen(false);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-all duration-150 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400"
            aria-label="Clear search"
            type="button"
          >
            x
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <ul className="max-h-72 overflow-y-auto py-2">
            {suggestions.map((item, index) => {
              const active = index === activeIndex;
              return (
                <li key={`${item.name}-${item.mfr}`}>
                  <button
                    onClick={() => handleSubmit(item.name)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition-all duration-150 ${
                      active
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                    type="button"
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">{item.name}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.mfr}</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        item.type === "Indian Generic"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : item.type === "User Added"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                      }`}
                    >
                      {item.type}
                    </span>
                  </button>
                </li>
              );
            })}

            {canAddCurrentValue && (
              <li>
                <button
                  onClick={() => onAddDrug(debounced.trim())}
                  className="flex w-full items-center justify-between border-t border-zinc-200 px-4 py-3 text-left text-zinc-700 transition-all duration-150 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  type="button"
                >
                  <span className="text-sm font-medium">Add "{debounced.trim()}" to suggestions</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    User Added
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
