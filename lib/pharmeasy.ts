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

interface OpenAIExtractionRow {
  brand_name: string;
  manufacturer: string;
  dose: string | null;
  selling_price_inr: number | null;
  listed_price_inr: number | null;
  discount_percent: number | null;
  in_stock: boolean;
}

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

const findNumberByKeys = (
  value: unknown,
  keys: string[],
  depth = 0
): number | null => {
  if (depth > 4 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberByKeys(item, keys, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;

  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k.toLowerCase())) {
      const parsed = safeNumber(v);
      if (parsed !== null) return parsed;
    }
  }

  for (const nested of Object.values(obj)) {
    const found = findNumberByKeys(nested, keys, depth + 1);
    if (found !== null) return found;
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

const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizeCompact = (value: string) =>
  normalizeText(value).replace(/[^a-z0-9]/g, "");

const fetchPharmEasyProducts = async (query: string): Promise<any[]> => {
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

  return products.slice(0, 15);
};

const mapProductDeterministically = (product: any, query: string): DrugResult => {
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
    product?.priceDetails?.price,
    findNumberByKeys(product, ["mrp", "listedprice", "strikedprice", "originalprice"])
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
    product?.bestPrice,
    findNumberByKeys(product, [
      "discountedprice",
      "offerprice",
      "sellingprice",
      "saleprice",
      "finalprice",
      "ourprice",
      "bestprice"
    ])
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

const sanitizeExtractionRow = (row: any, manufacturerHint?: string | null): OpenAIExtractionRow => {
  const listedPrice = safeNumber(row?.listed_price_inr);
  let sellingPrice = safeNumber(row?.selling_price_inr);
  let discountPercent = safeNumber(row?.discount_percent);

  if (sellingPrice === null && listedPrice !== null && discountPercent !== null) {
    sellingPrice = Number((listedPrice * (1 - discountPercent / 100)).toFixed(2));
  }

  if (
    discountPercent === null &&
    listedPrice !== null &&
    sellingPrice !== null &&
    listedPrice > 0 &&
    sellingPrice <= listedPrice
  ) {
    discountPercent = Math.round((1 - sellingPrice / listedPrice) * 100);
  }

  const normalizedDose =
    typeof row?.dose === "string" && normalizeText(row.dose) !== "not found"
      ? row.dose.trim()
      : null;

  return {
    brand_name:
      typeof row?.brand_name === "string" && row.brand_name.trim().length > 0
        ? row.brand_name.trim()
        : "",
    manufacturer:
      typeof row?.manufacturer === "string" && row.manufacturer.trim().length > 0
        ? row.manufacturer.trim()
        : manufacturerHint ?? "Unknown manufacturer",
    dose: normalizedDose,
    selling_price_inr: sellingPrice,
    listed_price_inr: listedPrice,
    discount_percent: discountPercent,
    in_stock: Boolean(row?.in_stock)
  };
};

const extractRowsWithOpenAI = async (
  query: string,
  products: any[],
  manufacturerHint?: string | null
): Promise<OpenAIExtractionRow[]> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const systemPrompt = [
    "You are a pharmaceutical price extraction engine.",
    `Drug query: ${query}`,
    manufacturerHint ? `Manufacturer hint: ${manufacturerHint}` : "",
    "You are given PharmEasy search JSON products.",
    "Extract only products genuinely matching the intended drug query and its dose variants.",
    "Reject unrelated products even if text looks similar.",
    "Return strictly the requested JSON schema fields."
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `PharmEasy products JSON:\n${JSON.stringify(products)}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
        }
      ],
      temperature: 0.1,
      text: {
        format: {
          type: "json_schema",
          name: "pharmeasy_price_rows",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              rows: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    brand_name: { type: "string" },
                    manufacturer: { type: "string" },
                    dose: { type: ["string", "null"] },
                    selling_price_inr: { type: ["number", "null"] },
                    listed_price_inr: { type: ["number", "null"] },
                    discount_percent: { type: ["number", "null"] },
                    in_stock: { type: "boolean" }
                  },
                  required: [
                    "brand_name",
                    "manufacturer",
                    "dose",
                    "selling_price_inr",
                    "listed_price_inr",
                    "discount_percent",
                    "in_stock"
                  ]
                }
              }
            },
            required: ["rows"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI extraction failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as any;
  const outputText =
    json?.output_text ??
    json?.output?.flatMap((block: any) => block.content ?? []).find((part: any) => part.type === "output_text")
      ?.text;

  if (!outputText || typeof outputText !== "string") {
    return [];
  }

  const parsed = JSON.parse(outputText);
  const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => sanitizeExtractionRow(row, manufacturerHint))
    .filter((row) => row.brand_name.length > 0);
};

const mergeAIWithProductContext = (
  query: string,
  aiRows: OpenAIExtractionRow[],
  products: any[]
): DrugResult[] => {
  const deterministicRows = products.map((product) => mapProductDeterministically(product, query));

  const byBrand = new Map<string, DrugResult>();
  for (const row of deterministicRows) {
    byBrand.set(normalizeText(row.brand_name), row);
  }

  return aiRows.map((row) => {
    const matched = byBrand.get(normalizeText(row.brand_name));
    const fallbackSelling = row.selling_price_inr ?? matched?.selling_price_inr ?? null;
    const fallbackListed = row.listed_price_inr ?? matched?.listed_price_inr ?? null;
    const fallbackDiscount =
      row.discount_percent ??
      matched?.discount_percent ??
      (fallbackListed && fallbackSelling && fallbackListed > 0 && fallbackSelling <= fallbackListed
        ? Math.round((1 - fallbackSelling / fallbackListed) * 100)
        : null);

    return {
      brand_name: row.brand_name,
      manufacturer: row.manufacturer || matched?.manufacturer || "Unknown manufacturer",
      dose: row.dose ?? matched?.dose ?? null,
      selling_price_inr: fallbackSelling,
      listed_price_inr: fallbackListed,
      discount_percent: fallbackDiscount,
      in_stock: row.in_stock,
      source_url: `https://pharmeasy.in/search/all?name=${encodeURIComponent(query)}`,
      image_url: matched?.image_url ?? null
    };
  });
};

const isRelevantBrandForQuery = (
  brandName: string,
  query: string,
  knownName?: string
): boolean => {
  const brandCompact = normalizeCompact(brandName);
  const queryCompact = normalizeCompact(query);
  if (!brandCompact || !queryCompact) return false;

  if (knownName) {
    const knownCompact = normalizeCompact(knownName);
    return brandCompact.includes(knownCompact);
  }

  return brandCompact.includes(queryCompact);
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
  const products = await fetchPharmEasyProducts(query);
  const known = matchKnownDrug(query);

  if (!products.length) return [];

  try {
    const aiRows = await extractRowsWithOpenAI(query, products, known?.mfr ?? null);
    if (aiRows.length > 0) {
      return mergeAIWithProductContext(query, aiRows, products).filter((item) =>
        isRelevantBrandForQuery(item.brand_name, query, known?.name)
      );
    }
  } catch (error) {
    console.error("OpenAI extraction failed, using deterministic fallback", error);
  }

  return products
    .map((product) => mapProductDeterministically(product, query))
    .filter((item) => isRelevantBrandForQuery(item.brand_name, query, known?.name));
};
