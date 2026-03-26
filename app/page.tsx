"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { TrendingSection } from "@/components/TrendingSection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DrugResult, TrendingItem } from "@/types";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trending, setTrending] = useState<TrendingItem[]>([]);

  const fetchTrending = useCallback(async () => {
    try {
      const response = await fetch("/api/trending");
      const data = await response.json();
      setTrending(data.trending ?? []);
    } catch (err) {
      console.error("Failed to load trending", err);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleSearch = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    setQuery(term);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      const data = await response.json();
      setResults(data.results ?? []);
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Search failed", err);
      setError("No results found");
      setResults([]);
    } finally {
      setLoading(false);
      fetchTrending();
    }
  }, [fetchTrending]);

  const handleTrendingSelect = (name: string) => {
    setSearchTerm(name);
    handleSearch(name);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
              DrugScanner
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Live medicine prices across India
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-14">
        <section className="text-center">
          <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white md:text-4xl">
            Find the best price for your medicine
          </h2>
          <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400">
            Search any GLP-1 or metabolic health drug — live prices from PharmEasy
          </p>

          <div className="mx-auto mt-8 max-w-2xl">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={handleSearch}
              loading={loading}
            />
          </div>
        </section>

        <section className="mt-14">
          <ResultsGrid results={results} loading={loading} query={query} error={error} />
        </section>

        <TrendingSection items={trending} onSelect={handleTrendingSelect} />
      </main>
    </div>
  );
}
