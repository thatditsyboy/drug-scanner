"use client";

import { TrendingItem } from "@/types";

interface TrendingBarChartProps {
  items: TrendingItem[];
}

export const TrendingBarChart = ({ items }: TrendingBarChartProps) => {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Search Trends
        </h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Auto-updates from live searches</span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const width = Math.max((item.count / maxCount) * 100, 6);
          return (
            <div key={`${item.name}-${item.count}`}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{item.name}</span>
                <span className="text-zinc-500 dark:text-zinc-400">{item.count}</span>
              </div>
              <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-500 transition-all duration-300"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
