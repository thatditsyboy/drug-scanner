export interface DrugResult {
  brand_name: string;
  manufacturer: string;
  dose: string | null;
  selling_price_inr: number | null;
  listed_price_inr: number | null;
  discount_percent: number | null;
  in_stock: boolean;
  source_url: string;
  image_url: string | null;
  type?: "Indian Generic" | "Branded Import";
}

export interface KnownDrug {
  name: string;
  mfr: string;
  type: "Indian Generic" | "Branded Import";
}

export interface TrendingItem {
  name: string;
  count: number;
}
