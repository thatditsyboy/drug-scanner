import { NextResponse } from "next/server";
import { KNOWN_DRUGS } from "@/lib/drugs";
import { kv } from "@/lib/kv";
import { KnownDrug } from "@/types";

export const revalidate = 60;
const isKvConfigured = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

const COMMUNITY_KEY = "community_drugs";

const normalize = (value: string) => value.trim().toLowerCase();

const mergeWithKnown = (community: KnownDrug[]): KnownDrug[] => {
  const map = new Map<string, KnownDrug>();
  for (const drug of KNOWN_DRUGS) map.set(normalize(drug.name), drug);
  for (const drug of community) {
    if (!map.has(normalize(drug.name))) map.set(normalize(drug.name), drug);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const GET = async () => {
  if (!isKvConfigured) {
    return NextResponse.json({
      drugs: [...KNOWN_DRUGS].sort((a, b) => a.name.localeCompare(b.name))
    });
  }

  try {
    const raw = (await kv.smembers(COMMUNITY_KEY)) as string[];
    const community: KnownDrug[] = (raw || [])
      .map((item) => {
        try {
          return JSON.parse(item) as KnownDrug;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as KnownDrug[];

    return NextResponse.json({ drugs: mergeWithKnown(community) });
  } catch {
    return NextResponse.json({ drugs: [...KNOWN_DRUGS].sort((a, b) => a.name.localeCompare(b.name)) });
  }
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as Partial<KnownDrug>;
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }

    const item: KnownDrug = {
      name,
      mfr: (body.mfr ?? "Community") as string,
      type: "User Added"
    };

    if (isKvConfigured) {
      try {
        await kv.sadd(COMMUNITY_KEY, JSON.stringify(item));
      } catch (err) {
        console.error("Could not persist community drug", err);
      }
    }

    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
};
