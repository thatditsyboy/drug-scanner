"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { TrendingSection } from "@/components/TrendingSection";
import { TrendingBarChart } from "@/components/TrendingBarChart";
import { AppHeader } from "@/components/AppHeader";
import { KnownDrug, TrendingItem } from "@/types";
import { KNOWN_DRUGS } from "@/lib/drugs";

export default function HomePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSearch = (term: string) => {
    setLoading(true);
    setSearchTerm(term);
    router.push(`/drug/${encodeURIComponent(term)}`);
  };

  const handleTrendingSelect = (name: string) => {
    setSearchTerm(name);
    router.push(`/drug/${encodeURIComponent(name)}`);
  };

  const handleAddDrug = async (name: string) => {
    try {
      await fetch("/api/drugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      await fetchDrugs();
      setSearchTerm(name);
      router.push(`/drug/${encodeURIComponent(name)}`);
    } catch (err) {
      console.error("Failed to add user drug", err);
    }
  };

  const showTrendChart = useMemo(() => {
    const positive = trending.filter((item) => item.count > 0);
    return positive.length >= 3;
  }, [trending]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-20 h-72 w-72 rounded-full bg-teal-200/35 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-sky-200/35 blur-3xl dark:bg-indigo-500/10" />
      </div>

      <AppHeader />

      <main className="relative mx-auto w-full max-w-6xl px-6 py-14">
        <section className="rounded-3xl border border-zinc-200 bg-white/75 px-6 py-12 text-center shadow-soft backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white md:text-5xl">
            Find the best price for your medicine
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-500 dark:text-zinc-400">
            Search any GLP-1 or metabolic health drug and we run tracker-style extraction on
            PharmEasy data for better dose and discount precision.
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Tip: Pick an autocomplete suggestion like Wegovy to get cleaner results.
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
