"""
GLP-1 India Price Tracker - Python companion script

This script mirrors the high-accuracy flow used in the web backend:
1) Fetch top PharmEasy products for each drug
2) Use OpenAI to extract normalized price rows
3) Print JSON results (and optionally can be extended to email)
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request
from typing import Any

from openai import OpenAI

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

client = OpenAI(api_key=OPENAI_API_KEY)

DRUGS = [
    {"name": "Noveltreat", "mfr": "Sun Pharma", "type": "Indian Generic"},
    {"name": "Semanext", "mfr": "Lupin", "type": "Indian Generic"},
    {"name": "Sematrinity", "mfr": "Sun Pharma", "type": "Indian Generic"},
    {"name": "Livarise", "mfr": "Lupin", "type": "Indian Generic"},
    {"name": "SEMAGLYN", "mfr": "Zydus Lifesciences", "type": "Indian Generic"},
    {"name": "ALTERME", "mfr": "Zydus Lifesciences", "type": "Indian Generic"},
    {"name": "Obeda", "mfr": "Dr Reddy's Laboratories", "type": "Indian Generic"},
    {"name": "Mashlo", "mfr": "Dr Reddy's Laboratories", "type": "Indian Generic"},
    {"name": "Olympiq", "mfr": "Dr Reddy's Laboratories", "type": "Indian Generic"},
    {"name": "Semalix", "mfr": "Torrent Pharmaceuticals Ltd", "type": "Indian Generic"},
    {"name": "Hepaglide", "mfr": "Alkem Laboratories Ltd", "type": "Indian Generic"},
    {"name": "Extensior", "mfr": "Abbott India Ltd", "type": "Indian Generic"},
    {"name": "Ozempic", "mfr": "Novo Nordisk", "type": "Branded Import"},
    {"name": "Rybelsus", "mfr": "Novo Nordisk", "type": "Branded Import"},
    {"name": "Mounjaro", "mfr": "Eli Lilly", "type": "Branded Import"},
    {"name": "Wegovy", "mfr": "Novo Nordisk", "type": "Branded Import"},
]


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[^0-9.-]", "", value).strip()
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except Exception:
            return None
    return None


def fetch_pharmeasy_api(query: str) -> list[dict[str, Any]]:
    url = f"https://pharmeasy.in/api/search/search/?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("data", {}).get("products", [])[:15]
    except Exception as exc:
        print(f"[Fetch Error] {query}: {exc}")
        return []


def extract_with_openai(name: str, mfr: str, products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not products:
        return []

    system_prompt = (
        "You are a pharmaceutical price extraction engine. "
        f"Drug query: {name}. Manufacturer hint: {mfr}. "
        "Extract only matching products and dose variants from the provided PharmEasy JSON."
    )

    schema = {
        "type": "array",
        "items": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "brand_name": {"type": "string"},
                "manufacturer": {"type": "string"},
                "dose": {"type": ["string", "null"]},
                "selling_price_inr": {"type": ["number", "null"]},
                "listed_price_inr": {"type": ["number", "null"]},
                "discount_percent": {"type": ["number", "null"]},
                "in_stock": {"type": "boolean"},
            },
            "required": [
                "brand_name",
                "manufacturer",
                "dose",
                "selling_price_inr",
                "listed_price_inr",
                "discount_percent",
                "in_stock",
            ],
        },
    }

    response = client.responses.create(
        model=OPENAI_MODEL,
        temperature=0.1,
        input=[
            {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": f"PharmEasy products JSON:\n{json.dumps(products)}",
                    }
                ],
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "pharmeasy_price_rows",
                "strict": True,
                "schema": schema,
            }
        },
    )

    parsed = json.loads(response.output_text)

    normalized: list[dict[str, Any]] = []
    for row in parsed:
        listed = _safe_float(row.get("listed_price_inr"))
        selling = _safe_float(row.get("selling_price_inr"))
        discount = _safe_float(row.get("discount_percent"))

        if selling is None and listed is not None and discount is not None:
            selling = round(listed * (1 - discount / 100), 2)

        if discount is None and listed and selling is not None and listed > 0 and selling <= listed:
            discount = round((1 - selling / listed) * 100)

        normalized.append(
            {
                "brand_name": str(row.get("brand_name", name)).strip() or name,
                "manufacturer": str(row.get("manufacturer", mfr)).strip() or mfr,
                "dose": row.get("dose"),
                "selling_price_inr": selling,
                "listed_price_inr": listed,
                "discount_percent": discount,
                "in_stock": bool(row.get("in_stock", False)),
                "source_platform": "PharmEasy",
                "source_url": f"https://pharmeasy.in/search/all?name={urllib.parse.quote(name)}",
            }
        )

    return normalized


def run_tracker() -> list[dict[str, Any]]:
    all_rows: list[dict[str, Any]] = []
    print(f"Running deep search for {len(DRUGS)} drugs...")

    for idx, drug in enumerate(DRUGS, start=1):
        print(f"[{idx}/{len(DRUGS)}] {drug['name']}")
        products = fetch_pharmeasy_api(drug["name"])

        if not products:
            all_rows.append(
                {
                    "brand_name": drug["name"],
                    "manufacturer": drug["mfr"],
                    "dose": None,
                    "selling_price_inr": None,
                    "listed_price_inr": None,
                    "discount_percent": None,
                    "in_stock": False,
                    "source_platform": "PharmEasy",
                    "source_url": f"https://pharmeasy.in/search/all?name={urllib.parse.quote(drug['name'])}",
                }
            )
            continue

        try:
            rows = extract_with_openai(drug["name"], drug["mfr"], products)
            all_rows.extend(rows)
            print(f"  -> extracted {len(rows)} row(s)")
        except Exception as exc:
            print(f"  -> extraction failed: {exc}")

        time.sleep(1)

    return all_rows


if __name__ == "__main__":
    results = run_tracker()
    print(json.dumps(results, indent=2))
