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
      <div className="mt-4 flex flex-wrap gap-3">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() => onSelect(item.name)}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 transition-all duration-150 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {item.name}
          </button>
        ))}
        {!items.length && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            No trending data yet.
          </span>
        )}
      </div>
    </section>
  );
};
