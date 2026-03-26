"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { TrendingSection } from "@/components/TrendingSection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrendingBarChart } from "@/components/TrendingBarChart";
import { DrugResult, KnownDrug, TrendingItem } from "@/types";
import { KNOWN_DRUGS } from "@/lib/drugs";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [drugs, setDrugs] = useState<KnownDrug[]>(KNOWN_DRUGS);

  const fetchTrending = useCallback(async () => {
    try {
      const response = await fetch("/api/trending");
      const data = await response.json();
      setTrending(data.trending ?? []);
    } catch (err) {
      console.error("Failed to load trending", err);
    }
  }, []);

  const fetchDrugs = useCallback(async () => {
    try {
      const response = await fetch("/api/drugs");
      if (!response.ok) return;
      const data = await response.json();
      setDrugs(data.drugs ?? KNOWN_DRUGS);
    } catch (err) {
      console.error("Failed to load community drugs", err);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
    fetchDrugs();
  }, [fetchTrending, fetchDrugs]);

  const handleSearch = useCallback(
    async (term: string) => {
      setLoading(true);
      setError(null);
      setQuery(term);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await response.json();
        setResults(data.results ?? []);
        if (data.error) setError(data.error);
      } catch (err) {
        console.error("Search failed", err);
        setError("No results found");
        setResults([]);
      } finally {
        setLoading(false);
        fetchTrending();
      }
    },
    [fetchTrending]
  );

  const handleTrendingSelect = (name: string) => {
    setSearchTerm(name);
    handleSearch(name);
  };

  const handleAddDrug = async (name: string) => {
    try {
      await fetch("/api/drugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      await fetchDrugs();
    } catch (err) {
      console.error("Failed to add user drug", err);
    }
    setSearchTerm(name);
    handleSearch(name);
  };

  const showTrendChart = useMemo(() => {
    const positive = trending.filter((item) => item.count > 0);
    return positive.length >= 3;
  }, [trending]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-20 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
      </div>

      <header className="relative border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">DrugScanner</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Live medicine prices across India</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 py-14">
        <section className="text-center">
          <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white md:text-4xl">
            Find the best price for your medicine
          </h2>
          <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400">
            Search any GLP-1 or metabolic health drug - live prices from PharmEasy
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Tip: Enter the correct full medicine name for more accurate pricing and stock results.
          </p>

          <div className="mx-auto mt-8 max-w-2xl">
            <SearchBar
              value={searchTerm}
              drugs={drugs}
              onChange={setSearchTerm}
              onSearch={handleSearch}
              onAddDrug={handleAddDrug}
              loading={loading}
            />
          </div>
        </section>

        <section className="mt-14">
          <ResultsGrid results={results} loading={loading} query={query} error={error} />
        </section>

        <TrendingSection items={trending} onSelect={handleTrendingSelect} />

        {showTrendChart ? (
          <TrendingBarChart items={trending.filter((item) => item.count > 0).slice(0, 5)} />
        ) : (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            The trends chart will appear automatically once enough searches are collected.
          </section>
        )}
      </main>
    </div>
  );
}
