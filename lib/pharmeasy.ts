import Fuse from "fuse.js";
import { KNOWN_DRUGS } from "@/lib/drugs";
import { DrugResult, KnownDrug } from "@/types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const doseRegex = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu)\b/i;
const packRegex = /\b(?:pen|capsule|tablet|syringe|vial|injection|solution)\b/i;

const knownDrugFuse = new Fuse(KNOWN_DRUGS, {
  keys: ["name"],
  threshold: 0.4,
  includeScore: true
});

const safeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const inferDose = (name: string, packForm?: string | null): string | null => {
  if (packForm && packForm.trim().length > 0) return packForm.trim();
  const doseMatch = name.match(doseRegex);
  if (doseMatch) return doseMatch[0];
  const packMatch = name.match(packRegex);
  return packMatch ? packMatch[0] : null;
};

export const matchKnownDrug = (name: string): KnownDrug | undefined => {
  const normalized = name.trim();
  if (!normalized) return undefined;
  const exact = KNOWN_DRUGS.find(
    (drug) => drug.name.toLowerCase() === normalized.toLowerCase()
  );
  if (exact) return exact;
  const result = knownDrugFuse.search(normalized)[0];
  return result ? result.item : undefined;
};

export const fetchDrugPrices = async (query: string): Promise<DrugResult[]> => {
  const url = `https://pharmeasy.in/api/search/search/?q=${encodeURIComponent(
    query
  )}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PharmEasy request failed: ${response.status}`);
  }

  const json = (await response.json()) as any;
  const products: any[] =
    json?.data?.products || json?.data?.data?.products || json?.data?.data || [];

  return products.slice(0, 15).map((product) => {
    const brandName = (product?.name ?? "").toString().trim();
    const manufacturer = (product?.manufacturer ?? "").toString().trim();
    const listedPrice = safeNumber(product?.price);
    const sellingPrice = safeNumber(product?.discountedPrice);

    const discountPercent =
      listedPrice && sellingPrice && listedPrice > 0
        ? Math.round((1 - sellingPrice / listedPrice) * 100)
        : null;

    return {
      brand_name: brandName,
      manufacturer,
      dose: inferDose(brandName, product?.packForm),
      selling_price_inr: sellingPrice,
      listed_price_inr: listedPrice,
      discount_percent: discountPercent,
      in_stock: Boolean(product?.stockAvailability),
      source_url: `https://pharmeasy.in/search/all?name=${encodeURIComponent(
        query
      )}`,
      image_url: product?.productImage ?? null
    } satisfies DrugResult;
  }).filter((item) => item.brand_name.length > 0);
};
