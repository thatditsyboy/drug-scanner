"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ResultsGrid } from "@/components/ResultsGrid";
import { SearchBar } from "@/components/SearchBar";
import { SearchProgressOverlay } from "@/components/SearchProgressOverlay";
import { KnownDrug, DrugResult, TrendingItem } from "@/types";
import { KNOWN_DRUGS } from "@/lib/drugs";

const parseQueryFromParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return decodeURIComponent(value[0] ?? "");
  return decodeURIComponent(value ?? "");
};

export default function DrugResultsPage() {
  const router = useRouter();
  const params = useParams();

  const queryFromUrl = parseQueryFromParam(params.name);

  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [query, setQuery] = useState(queryFromUrl);
  const [results, setResults] = useState<DrugResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drugs, setDrugs] = useState<KnownDrug[]>(KNOWN_DRUGS);
  const [trending, setTrending] = useState<TrendingItem[]>([]);

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

  const fetchTrending = useCallback(async () => {
    try {
      const response = await fetch("/api/trending");
      const data = await response.json();
      setTrending(data.trending ?? []);
    } catch (err) {
      console.error("Failed to load trending", err);
    }
  }, []);

  const runSearch = useCallback(
    async (term: string) => {
      setLoading(true);
      setError(null);
      setQuery(term);
      setSearchTerm(term);

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

  useEffect(() => {
    fetchDrugs();
    fetchTrending();
  }, [fetchDrugs, fetchTrending]);

  useEffect(() => {
    if (!queryFromUrl) return;
    runSearch(queryFromUrl);
  }, [queryFromUrl, runSearch]);

  const handleSearch = (term: string) => {
    const destination = `/drug/${encodeURIComponent(term)}`;
    if (term === queryFromUrl) {
      runSearch(term);
      return;
    }
    router.push(destination);
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

    handleSearch(name);
  };

  const topTrending = useMemo(() => trending.slice(0, 5), [trending]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-20 h-72 w-72 rounded-full bg-teal-200/35 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-sky-200/35 blur-3xl dark:bg-indigo-500/10" />
      </div>

      <AppHeader showBack onBack={() => router.push("/")} />

      <main className="relative mx-auto w-full max-w-6xl px-6 py-12">
        <section className="rounded-3xl border border-zinc-200 bg-white/75 p-6 shadow-soft backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white md:text-3xl">
            Results for {query}
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Tracker-style extraction in progress for each query using PharmEasy data and AI parsing.
          </p>

          <div className="mt-6">
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

        {!!topTrending.length && (
          <div className="mt-8 flex flex-wrap gap-3">
            {topTrending.map((item) => (
              <button
                key={item.name}
                onClick={() => handleSearch(item.name)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 transition-all duration-150 hover:border-cyan-500 hover:text-cyan-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                type="button"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        <section className="mt-8">
          <ResultsGrid results={results} loading={loading} query={query} error={error} />
        </section>
      </main>

      <SearchProgressOverlay visible={loading} query={query} />
    </div>
  );
}
