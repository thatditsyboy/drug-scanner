"use client";

import { TrendingItem } from "@/types";

interface TrendingSectionProps {
  items: TrendingItem[];
  onSelect: (name: string) => void;
}

export const TrendingSection = ({ items, onSelect }: TrendingSectionProps) => {
  return (
    <section className="mt-16">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Trending Searches
      </h2>
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-500 shadow-soft dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
        Trending search chips are hidden until real usage data is collected.
      </div>
    </section>
  );
};
