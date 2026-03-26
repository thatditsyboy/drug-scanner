import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { KNOWN_DRUGS } from "@/lib/drugs";
import { TrendingItem } from "@/types";

export const revalidate = 60;
const isKvConfigured = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

const fallbackTrending = (): TrendingItem[] => {
  return [...KNOWN_DRUGS]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((drug) => ({ name: drug.name, count: 0 }));
};

export const GET = async () => {
  if (!isKvConfigured) {
    return NextResponse.json({ trending: fallbackTrending() });
  }

  try {
    const entries = (await kv.zrange("search_counts", 0, 4, {
      rev: true,
      withScores: true
    })) as Array<string | number>;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ trending: fallbackTrending() });
    }

    const trending: TrendingItem[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const name = String(entries[i]);
      const count = Number(entries[i + 1] ?? 0);
      if (name) trending.push({ name, count });
    }

    return NextResponse.json({ trending });
  } catch (error) {
    console.error("Trending fetch failed", error);
    return NextResponse.json({ trending: fallbackTrending() });
  }
};
