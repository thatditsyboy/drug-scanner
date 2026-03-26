"use client";

import { DrugResult } from "@/types";
import { DrugResultCard } from "@/components/DrugResultCard";
import { SkeletonCard } from "@/components/SkeletonCard";

interface ResultsGridProps {
  results: DrugResult[];
  loading: boolean;
  query: string;
  error?: string | null;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
    <div className="rounded-full bg-white p-3 text-zinc-400 shadow-soft dark:bg-zinc-950">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M4 20h16M8 20V8a4 4 0 1 1 8 0v12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
  </div>
);

export const ResultsGrid = ({ results, loading, query, error }: ResultsGridProps) => {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (!loading && query && (error || results.length === 0)) {
    return <EmptyState message="No results found. Try a different medicine." />;
  }

  if (!results.length) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {results.map((result) => (
        <DrugResultCard key={`${result.brand_name}-${result.manufacturer}`} result={result} />
      ))}
    </div>
  );
};
