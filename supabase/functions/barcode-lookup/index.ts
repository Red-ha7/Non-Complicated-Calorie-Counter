// Looks up a packaged snack by barcode using Open Food Facts (free, no API key).
import { allowed, getUser, json, preflight } from "./common.ts";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: "Please sign in again." }, 401);

  // 60 lookups per user per hour.
  if (!(await allowed(user.id, "barcode-lookup", 60, 3600))) {
    return json({ error: "Too many lookups. Try again in a bit." }, 429, { "Retry-After": "300" });
  }

  let barcode = "";
  try {
    barcode = String((await req.json()).barcode ?? "").trim();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  // EAN-8, UPC-A, EAN-13, GTIN-14. Digits only, so nothing user-supplied reaches the URL path unchecked.
  if (!/^\d{8,14}$/.test(barcode)) return json({ error: "Enter the 8 to 14 digits under the barcode." }, 400);

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size`,
      { headers: { "User-Agent": "NC3-SnackTracker/1.0 (edge-function)" }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return json({ error: "Barcode lookup is unavailable right now." }, 502);
    const data = await res.json();
    const p = data?.product;
    if (data?.status !== 1 || !p) return json({ error: "We couldn't find that barcode. Add it manually." }, 404);

    // Prefer per-serving values; fall back to per 100 g.
    const n = p.nutriments ?? {};
    const perServing = num(n["energy-kcal_serving"]) !== null;
    const suffix = perServing ? "_serving" : "_100g";
    const calories = num(n[`energy-kcal${suffix}`]);
    if (calories === null || calories < 1) return json({ error: "That product has no calorie info. Add it manually." }, 404);

    const brand = String(p.brands ?? "").split(",")[0].trim();
    const title = String(p.product_name ?? "").trim() || "Packaged snack";
    return json({
      name: (brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${title}` : title).slice(0, 80),
      calories: Math.min(5000, Math.round(calories)),
      protein_g: Math.min(1000, Math.round(num(n[`proteins${suffix}`]) ?? 0)),
      carbs_g: Math.min(1000, Math.round(num(n[`carbohydrates${suffix}`]) ?? 0)),
      fat_g: Math.min(1000, Math.round(num(n[`fat${suffix}`]) ?? 0)),
      basis: perServing ? `per serving${p.serving_size ? ` (${p.serving_size})` : ""}` : "per 100 g",
    });
  } catch (e) {
    console.error("barcode-lookup failed", e instanceof Error ? e.message : e);
    return json({ error: "Barcode lookup is unavailable right now." }, 502);
  }
});
