import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { fetchDrugPrices, matchKnownDrug } from "@/lib/pharmeasy";

export const revalidate = 0;
const isKvConfigured = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").toString().trim();

  if (!query) {
    return NextResponse.json({
      results: [],
      query,
      count: 0,
      error: "No results found"
    });
  }

  const normalizedQuery = query.toLowerCase().trim();

  try {
    const results = await fetchDrugPrices(query);

    const enriched = results.map((item) => {
      const match = matchKnownDrug(item.brand_name) ?? matchKnownDrug(query);
      if (match) return { ...item, type: match.type };
      return { ...item, type: "User Added" as const };
    });

    if (isKvConfigured) {
      try {
        await kv.zincrby("search_counts", 1, normalizedQuery);
      } catch (kvError) {
        console.error("KV update failed", kvError);
      }
    }

    if (!enriched.length) {
      return NextResponse.json({
        results: [],
        query,
        count: 0,
        error: "No results found"
      });
    }

    return NextResponse.json({
      results: enriched,
      query,
      count: enriched.length
    });
  } catch (error) {
    console.error("Search failed", error);
    return NextResponse.json({
      results: [],
      query,
      count: 0,
      error: "No results found"
    });
  }
};
