// Builds SQL INSERT files for public.foods from the USDA FoodData Central CSV downloads
// (SR Legacy 2018-04 and Foundation Foods). Nothing is invented: a nutrient USDA does not
// report stays NULL.
//
//   node scripts/build-foods-from-usda.mjs <sr_legacy_dir> <foundation_dir> <out_dir>
//
// USDA FoodData Central data is public domain (CC0): https://fdc.nal.usda.gov/
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const [, , srDir, foundationDir, outDir] = process.argv;
if (!srDir || !foundationDir || !outDir) {
  console.error("usage: node build-foods-from-usda.mjs <sr_legacy_dir> <foundation_dir> <out_dir>");
  process.exit(1);
}

/** Minimal CSV line parser: handles quoted fields and "" escapes. */
function parseLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function readCsv(path, onRow) {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    if (!line) continue;
    const cells = parseLine(line);
    if (!header) { header = cells; continue; }
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = cells[i] ?? "";
    onRow(row);
  }
}

// USDA nutrient ids -> our columns (energy and sugar have fallbacks, see below).
const N = {
  1008: "kcal", 2048: "kcal_atwater_specific", 2047: "kcal_atwater_general",
  1003: "protein_g", 1005: "carbs_g", 1004: "fat_g", 1079: "fiber_g",
  2000: "sugar_g", 1063: "sugar_nlea_g", 1258: "saturated_fat_g", 1257: "trans_fat_g",
  1253: "cholesterol_mg", 1093: "sodium_mg", 1092: "potassium_mg", 1087: "calcium_mg",
  1089: "iron_mg", 1162: "vitamin_c_mg", 1106: "vitamin_a_ug",
};

async function loadDataset(dir, dataType, label, idPrefix, sourceName) {
  const cats = new Map();
  await readCsv(join(dir, "food_category.csv"), (r) => cats.set(r.id, r.description));

  const foods = new Map();
  await readCsv(join(dir, "food.csv"), (r) => {
    if (r.data_type !== dataType) return;
    foods.set(r.fdc_id, { fdc: r.fdc_id, name: r.description.trim(), category: cats.get(r.food_category_id) ?? null, n: {}, portions: [] });
  });

  await readCsv(join(dir, "food_nutrient.csv"), (r) => {
    const f = foods.get(r.fdc_id);
    const col = N[r.nutrient_id];
    if (!f || !col || r.amount === "") return;
    f.n[col] = Number(r.amount);
  });

  const units = new Map();
  await readCsv(join(dir, "measure_unit.csv"), (r) => units.set(r.id, r.name));
  await readCsv(join(dir, "food_portion.csv"), (r) => {
    const f = foods.get(r.fdc_id);
    const grams = Number(r.gram_weight);
    if (!f || !(grams > 0)) return;
    const amount = Number(r.amount) || 1;
    const unit = r.measure_unit_id !== "9999" ? units.get(r.measure_unit_id) : "";
    const text = [amount === 1 ? "1" : String(amount), unit, r.portion_description, r.modifier]
      .filter((s) => s && s !== "undetermined")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) f.portions.push({ description: text.slice(0, 80), grams: Math.round(grams * 10) / 10 });
  });

  return [...foods.values()].map((f) => ({ ...f, idPrefix, sourceName, label }));
}

const sr = await loadDataset(srDir, "sr_legacy_food", "SR Legacy", "usda_sr", "USDA FoodData Central, SR Legacy (2018-04)");
const fd = await loadDataset(foundationDir, "foundation_food", "Foundation", "usda_foundation", "USDA FoodData Central, Foundation Foods (2025-12)");

// Prefer the newer Foundation record when both datasets describe the same food.
const seen = new Set();
const all = [];
for (const f of [...fd, ...sr]) {
  const key = f.name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  all.push(f);
}

const COOKED = /\b(cooked|baked|fried|roasted|boiled|grilled|broiled|steamed|stewed|braised|toasted|microwaved|pan-fried|scrambled|poached)\b/i;
function foodType(f) {
  if (f.category === "Fast Foods" || f.category === "Restaurant Foods") return "restaurant_item";
  if (f.category === "Meals, Entrees, and Side Dishes") return "recipe_meal";
  if (COOKED.test(f.name)) return "cooked_dish";
  return "raw_ingredient";
}
function preparation(name) {
  const m = name.match(COOKED);
  return m ? m[1].toLowerCase() : name.match(/\braw\b/i) ? "raw" : null;
}

const q = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const num = (v) => (v == null || Number.isNaN(v) ? "NULL" : String(Math.round(v * 100) / 100));

const rows = [];
for (const f of all) {
  const n = f.n;
  const kcal = n.kcal ?? n.kcal_atwater_specific ?? n.kcal_atwater_general;
  // A food without calories is useless for this app, and nothing is guessed.
  if (kcal == null || kcal < 0 || kcal > 950) continue;
  const protein = n.protein_g, carbs = n.carbs_g, fat = n.fat_g;
  if ([protein, carbs, fat].some((v) => v != null && (v < 0 || v > 100))) continue;
  const tags = [];
  if (protein != null && protein >= 20) tags.push("high_protein");
  if (carbs != null && carbs <= 5) tags.push("low_carb");
  const portions = f.portions.slice(0, 12);
  rows.push(
    `(${[
      q(`${f.idPrefix}_${f.fdc}`), q(f.name), "'{}'", "NULL", "NULL", q(foodType(f)), q(f.category), "NULL", q(preparation(f.name)), "'{}'",
      num(kcal), num(protein), num(carbs), num(n.fiber_g), num(n.sugar_g ?? n.sugar_nlea_g), num(fat), num(n.saturated_fat_g), num(n.trans_fat_g),
      num(n.cholesterol_mg), num(n.sodium_mg), num(n.potassium_mg), num(n.calcium_mg), num(n.iron_mg), num(n.vitamin_c_mg), num(n.vitamin_a_ug),
      `${q(JSON.stringify(portions))}::jsonb`,
      "'{}'", tags.length ? `ARRAY[${tags.map(q).join(",")}]` : "'{}'", "NULL",
      q(f.sourceName), "0.95", "'verified'",
    ].join(",")})`,
  );
}

const COLS =
  "food_id,name,local_names,cuisine,region,food_type,category,description,preparation,ingredients," +
  "kcal,protein_g,carbs_g,fiber_g,sugar_g,fat_g,saturated_fat_g,trans_fat_g,cholesterol_mg,sodium_mg,potassium_mg,calcium_mg,iron_mg,vitamin_c_mg,vitamin_a_ug," +
  "portions,allergens,dietary_tags,glycemic_index,data_source,source_confidence,review_status";

mkdirSync(outDir, { recursive: true });
const CHUNK = 150;
let files = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const sql = `insert into public.foods (${COLS}) values\n${rows.slice(i, i + CHUNK).join(",\n")}\non conflict (food_id) do nothing;\n`;
  writeFileSync(join(outDir, `foods_${String(files).padStart(3, "0")}.sql`), sql);
  files++;
}
console.log(`foods kept: ${rows.length} of ${all.length} (SR ${sr.length}, Foundation ${fd.length}); wrote ${files} files to ${outDir}`);
