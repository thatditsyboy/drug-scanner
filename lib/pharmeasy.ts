import Fuse from "fuse.js";
import { KNOWN_DRUGS } from "@/lib/drugs";
import { DrugResult, KnownDrug } from "@/types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const doseRegex = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu)\b/i;
const packRegex = /\b(?:pre\s?filled\s?pen|pen|capsule|tablet|syringe|vial|injection|solution|strip|bottle)\b/i;

const knownDrugFuse = new Fuse(KNOWN_DRUGS, {
  keys: ["name"],
  threshold: 0.4,
  includeScore: true
});

const safeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const numberFromCandidates = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = safeNumber(value);
    if (parsed !== null) return parsed;
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

const mapProductToDrugResult = (product: any, query: string): DrugResult => {
  const brandName = (product?.name ?? product?.productName ?? "").toString().trim();
  const manufacturer =
    (product?.manufacturer ?? product?.marketerName ?? "").toString().trim() ||
    "Unknown manufacturer";

  const listedPrice = numberFromCandidates(
    product?.price,
    product?.price?.mrp,
    product?.price?.price,
    product?.mrp,
    product?.displayPrice,
    product?.pricing?.mrp,
    product?.pricing?.price,
    product?.pricing?.listedPrice,
    product?.pricing?.basePrice,
    product?.priceDetails?.mrp,
    product?.priceDetails?.price
  );

  const sellingPrice = numberFromCandidates(
    product?.discountedPrice,
    product?.price?.discountedPrice,
    product?.price?.offerPrice,
    product?.offerPrice,
    product?.finalPrice,
    product?.salePrice,
    product?.pricing?.discountedPrice,
    product?.pricing?.offerPrice,
    product?.pricing?.finalPrice,
    product?.priceDetails?.discountedPrice,
    product?.priceDetails?.offerPrice,
    product?.priceDetails?.finalPrice,
    product?.bestPrice
  );

  const fallbackSelling = sellingPrice ?? listedPrice;
  const discountPercent =
    listedPrice && fallbackSelling && listedPrice > 0 && fallbackSelling <= listedPrice
      ? Math.round((1 - fallbackSelling / listedPrice) * 100)
      : null;

  return {
    brand_name: brandName,
    manufacturer,
    dose: inferDose(brandName, product?.packForm ?? product?.packSizeLabel ?? null),
    selling_price_inr: fallbackSelling,
    listed_price_inr: listedPrice,
    discount_percent: discountPercent,
    in_stock: Boolean(
      product?.stockAvailability ??
        product?.inStock ??
        product?.isAvailable ??
        product?.availability?.inStock
    ),
    source_url: `https://pharmeasy.in/search/all?name=${encodeURIComponent(query)}`,
    image_url: product?.productImage ?? product?.image ?? product?.images?.[0] ?? null
  };
};

export const fetchDrugPrices = async (query: string): Promise<DrugResult[]> => {
  const url = `https://pharmeasy.in/api/search/search/?q=${encodeURIComponent(query)}`;

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

  return products
    .slice(0, 15)
    .map((product) => mapProductToDrugResult(product, query))
    .filter((item) => item.brand_name.length > 0);
};
