"use client";

import Image from "next/image";
import { DrugResult } from "@/types";

const ExternalIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
    <path
      d="M14 4h6v6m0-6-9 9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatPrice = (value: number | null) => {
  if (value === null || value === undefined) return "Not available";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
};

interface DrugResultCardProps {
  result: DrugResult;
}

export const DrugResultCard = ({ result }: DrugResultCardProps) => {
  const hasDiscount = result.discount_percent !== null && result.discount_percent > 0;
  const showListed =
    result.listed_price_inr !== null &&
    (result.selling_price_inr === null || result.listed_price_inr >= result.selling_price_inr);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift dark:border-zinc-800 dark:bg-zinc-900">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-100/40 blur-2xl dark:bg-cyan-500/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <a
            href={result.source_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-lg font-semibold text-zinc-900 transition-colors duration-150 hover:text-indigo-600 dark:text-white"
          >
            {result.brand_name}
            <ExternalIcon />
          </a>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {result.manufacturer || "Unknown manufacturer"}
          </p>
        </div>
        {result.type && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              result.type === "Indian Generic"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : result.type === "User Added"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
            }`}
          >
            {result.type}
          </span>
        )}
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {result.dose && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {result.dose}
          </span>
        )}
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${result.in_stock ? "bg-emerald-500" : "bg-red-500"}`}
          />
          {result.in_stock ? "In Stock" : "Out of Stock"}
        </span>
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
          {formatPrice(result.selling_price_inr)}
        </div>
        {showListed && (
          <div className="text-sm text-zinc-400 line-through">
            {formatPrice(result.listed_price_inr)}
          </div>
        )}
        {hasDiscount && (
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {result.discount_percent}% off
          </span>
        )}
      </div>

      {result.image_url && (
        <div className="relative mt-4">
          <div className="relative h-20 w-full overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            <Image
              src={result.image_url}
              alt={result.brand_name}
              fill
              className="object-contain p-3"
            />
          </div>
        </div>
      )}

      <div className="relative mt-6">
        <a
          href={result.source_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-all duration-150 hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-200"
        >
          View on PharmEasy {"->"}
        </a>
      </div>
    </div>
  );
};
