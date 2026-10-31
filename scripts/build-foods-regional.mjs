// Regional foods that USDA does not cover (Saudi / Gulf / wider Middle East), written as SQL for public.foods.
//
// IMPORTANT: these values are APPROXIMATE, derived from typical home recipes, not lab measurements.
// Every record is marked review_status = 'ai_generated' with low confidence, and the app labels them
// "estimated, unverified". Fields we cannot state sensibly (micronutrients, GI, trans fat...) are NULL.
// Replace a record with a measured value (national food composition table or manufacturer label)
// and set review_status = 'verified' when you have a source.
//
//   node scripts/build-foods-regional.mjs <out_dir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node build-foods-regional.mjs <out_dir>");
  process.exit(1);
}

// [slug, name, [arabic, transliteration], cuisine, food_type, category, preparation, ingredients,
//  kcal, protein, carbs, fat, fiber, portions[[desc, grams]], allergens, vegetarian]
const FOODS = [
  ["chicken_kabsa", "Chicken kabsa", ["كبسة دجاج", "kabsa dajaj"], "Saudi", "cooked_dish", "rice dish", "steamed with spices", ["basmati rice", "chicken", "tomato", "onion", "kabsa spice mix", "vegetable oil"], 165, 9, 20, 5.5, 1, [["1 plate", 400], ["1 cup", 160]], [], false],
  ["lamb_kabsa", "Lamb kabsa", ["كبسة لحم", "kabsa lahm"], "Saudi", "cooked_dish", "rice dish", "steamed with spices", ["basmati rice", "lamb", "tomato", "onion", "kabsa spice mix", "ghee"], 190, 9, 19, 8, 1, [["1 plate", 400], ["1 cup", 160]], ["milk"], false],
  ["chicken_mandi", "Chicken mandi", ["مندي دجاج", "mandi dajaj"], "Saudi", "cooked_dish", "rice dish", "slow-cooked", ["basmati rice", "chicken", "spices", "ghee"], 170, 10, 19, 6, 0.8, [["1 plate", 400]], ["milk"], false],
  ["machboos_chicken", "Chicken machboos", ["مجبوس دجاج", "machboos dajaj"], "Gulf", "cooked_dish", "rice dish", "steamed with spices", ["basmati rice", "chicken", "dried lime", "tomato", "onion", "spices"], 155, 8, 20, 4.5, 1, [["1 plate", 400]], [], false],
  ["chicken_biryani_gulf", "Chicken biryani, Gulf style", ["برياني دجاج", "biryani dajaj"], "Gulf", "cooked_dish", "rice dish", "layered and steamed", ["basmati rice", "chicken", "onion", "yogurt", "spices", "oil"], 170, 8, 24, 4.5, 1, [["1 plate", 400]], ["milk"], false],
  ["saleeg", "Saleeg (rice cooked in milk with chicken)", ["سليق", "saleeg"], "Saudi", "cooked_dish", "rice dish", "simmered in milk", ["rice", "milk", "chicken", "butter"], 150, 8, 18, 5, 0.3, [["1 bowl", 350]], ["milk"], false],
  ["jareesh", "Jareesh (cracked wheat porridge)", ["جريش", "jareesh"], "Saudi", "cooked_dish", "porridge", "slow-cooked", ["cracked wheat", "yogurt or milk", "meat or chicken", "onion", "ghee"], 120, 6, 14, 4, 2.5, [["1 bowl", 300]], ["wheat", "milk"], false],
  ["harees", "Harees (wheat and meat porridge)", ["هريس", "harees"], "Saudi", "cooked_dish", "porridge", "slow-cooked", ["wheat", "lamb or chicken", "ghee", "salt"], 130, 8, 14, 4.5, 2, [["1 bowl", 300]], ["wheat", "milk"], false],
  ["mataziz", "Mataziz (meat and vegetable stew with dough)", ["مطازيز", "mataziz"], "Saudi", "cooked_dish", "stew", "simmered", ["lamb", "tomato", "squash", "potato", "wheat dough sheets", "spices"], 140, 7, 16, 5, 1.5, [["1 plate", 350]], ["wheat"], false],
  ["qursan", "Qursan (bread soaked in meat and vegetable stew)", ["قرصان", "qursan"], "Saudi", "cooked_dish", "stew", "simmered", ["thin wheat bread", "lamb", "tomato", "squash", "spices"], 150, 7, 17, 5.5, 1.5, [["1 plate", 350]], ["wheat"], false],
  ["thareed", "Thareed (bread soaked in stew)", ["ثريد", "thareed"], "Saudi", "cooked_dish", "stew", "simmered", ["bread", "lamb or chicken", "vegetables", "broth"], 150, 7, 17, 5.5, 1.5, [["1 plate", 350]], ["wheat"], false],
  ["asida", "Asida (dough porridge with date syrup)", ["عصيدة", "aseeda"], "Saudi", "cooked_dish", "porridge", "cooked and stirred", ["wheat flour", "date syrup", "ghee"], 280, 4, 45, 9, 2, [["1 serving", 200]], ["wheat", "milk"], true],
  ["mutabbaq_meat", "Mutabbaq (stuffed pan-fried pastry), meat", ["مطبق", "mutabbaq"], "Saudi", "cooked_dish", "pastry", "pan-fried", ["wheat dough", "minced meat", "egg", "onion", "oil"], 250, 9, 25, 13, 1.2, [["1 piece", 180]], ["wheat", "egg"], false],
  ["samboosa_meat", "Samboosa, fried, meat", ["سمبوسة", "sambousek"], "Gulf", "cooked_dish", "pastry", "deep-fried", ["wheat pastry", "minced meat", "onion", "oil"], 290, 8, 28, 16, 1.5, [["1 piece", 40]], ["wheat"], false],
  ["fatayer_spinach", "Fatayer, spinach", ["فطاير سبانخ", "fatayer sabanekh"], "Levantine", "cooked_dish", "pastry", "baked", ["wheat dough", "spinach", "onion", "olive oil", "sumac"], 240, 6, 30, 10, 3, [["1 piece", 70]], ["wheat"], true],
  ["manakish_zaatar", "Manakish with zaatar", ["مناقيش زعتر", "manakish zaatar"], "Levantine", "cooked_dish", "flatbread", "baked", ["wheat dough", "zaatar", "olive oil"], 280, 7, 40, 10, 2.5, [["1 piece", 120]], ["wheat", "sesame"], true],
  ["arabic_bread", "Arabic flatbread (khubz)", ["خبز عربي", "khubz arabi"], "Middle Eastern", "cooked_dish", "bread", "baked", ["wheat flour", "water", "yeast", "salt"], 265, 8.5, 52, 2, 2.5, [["1 piece", 60]], ["wheat"], true],
  ["ful_medames", "Ful medames (fava beans)", ["فول مدمس", "ful medames"], "Egyptian", "cooked_dish", "legume dish", "stewed", ["fava beans", "olive oil", "lemon", "garlic", "cumin"], 110, 7, 15, 2.5, 5, [["1 bowl", 250]], [], true],
  ["balila", "Balila (warm spiced chickpeas)", ["بليلة", "baleela"], "Saudi", "cooked_dish", "legume dish", "boiled", ["chickpeas", "salt", "cumin", "lemon"], 140, 7, 20, 3, 6, [["1 bowl", 200]], [], true],
  ["shakshuka", "Shakshuka", ["شكشوكة", "shakshuka"], "Middle Eastern", "cooked_dish", "egg dish", "simmered", ["eggs", "tomato", "onion", "pepper", "olive oil", "spices"], 100, 6, 6, 6, 1.2, [["1 serving", 250]], ["egg"], true],
  ["mujaddara", "Mujaddara (lentils and rice)", ["مجدرة", "mujaddara"], "Levantine", "cooked_dish", "legume dish", "simmered", ["lentils", "rice", "fried onion", "olive oil"], 150, 5, 24, 4, 3.5, [["1 plate", 300]], [], true],
  ["maqluba_chicken", "Maqluba, chicken", ["مقلوبة", "maqluba"], "Levantine", "cooked_dish", "rice dish", "layered and flipped", ["rice", "chicken", "eggplant", "cauliflower", "tomato", "spices"], 160, 8, 18, 6, 1.5, [["1 plate", 400]], [], false],
  ["mansaf", "Mansaf (lamb with rice and jameed yogurt sauce)", ["منسف", "mansaf"], "Levantine", "cooked_dish", "rice dish", "slow-cooked", ["lamb", "rice", "jameed", "pine nuts", "ghee"], 190, 10, 17, 9, 0.8, [["1 plate", 450]], ["milk", "tree_nuts"], false],
  ["tabbouleh", "Tabbouleh", ["تبولة", "tabbouleh"], "Levantine", "cooked_dish", "salad", "raw", ["parsley", "tomato", "bulgur", "mint", "lemon", "olive oil"], 100, 2, 9, 7, 3, [["1 bowl", 150]], ["wheat"], true],
  ["fattoush", "Fattoush", ["فتوش", "fattoush"], "Levantine", "cooked_dish", "salad", "raw with fried bread", ["lettuce", "tomato", "cucumber", "fried pita", "sumac", "olive oil"], 90, 2, 10, 5, 2, [["1 bowl", 200]], ["wheat"], true],
  ["baba_ganoush", "Baba ganoush", ["بابا غنوج", "baba ghanoush"], "Levantine", "cooked_dish", "dip", "roasted", ["eggplant", "tahini", "lemon", "olive oil", "garlic"], 130, 2.5, 7, 10, 3, [["2 tbsp", 40]], ["sesame"], true],
  ["labneh", "Labneh (strained yogurt)", ["لبنة", "labneh"], "Levantine", "raw_ingredient", "dairy", "strained", ["yogurt", "salt"], 160, 6, 4, 14, 0, [["2 tbsp", 40], ["1 serving", 100]], ["milk"], true],
  ["laban_drink", "Laban (salted yogurt drink)", ["لبن", "laban"], "Middle Eastern", "raw_ingredient", "beverage", "raw", ["yogurt", "water", "salt"], 45, 3, 4, 2, 0, [["1 cup", 245]], ["milk"], true],
  ["camel_milk", "Camel milk", ["حليب الإبل", "haleeb ibil"], "Gulf", "raw_ingredient", "beverage", "raw", ["camel milk"], 54, 3, 5, 3, 0, [["1 cup", 244]], ["milk"], true],
  ["shish_tawook", "Shish tawook (grilled chicken skewers)", ["شيش طاووق", "shish tawook"], "Levantine", "cooked_dish", "grilled meat", "grilled", ["chicken breast", "yogurt", "garlic", "lemon", "spices"], 170, 25, 2, 7, 0.2, [["1 skewer", 100], ["1 serving", 200]], ["milk"], false],
  ["kofta_grilled", "Kofta (grilled minced meat)", ["كفتة", "kofta"], "Middle Eastern", "cooked_dish", "grilled meat", "grilled", ["minced beef or lamb", "onion", "parsley", "spices"], 230, 18, 3, 16, 0.5, [["1 skewer", 90]], [], false],
  ["grilled_chicken_charcoal", "Charcoal-grilled chicken (dajaj mashwi)", ["دجاج مشوي", "dajaj mashwi"], "Gulf", "cooked_dish", "grilled meat", "grilled", ["chicken", "spices", "oil"], 180, 25, 0.5, 8, 0, [["1 quarter chicken", 220]], [], false],
  ["shawarma_chicken_wrap", "Chicken shawarma wrap", ["شاورما دجاج", "shawarma dajaj"], "Levantine", "restaurant_item", "sandwich", "grilled and wrapped", ["chicken", "flatbread", "garlic sauce", "pickles", "fries"], 220, 14, 22, 9, 1.5, [["1 wrap", 250]], ["wheat", "egg"], false],
  ["chicken_broast", "Broasted chicken (fried), Gulf fast-food style", ["بروستد", "broasted"], "Gulf", "restaurant_item", "fried chicken", "pressure-fried", ["chicken", "seasoned flour", "oil"], 260, 20, 10, 16, 0.5, [["1 piece", 130]], ["wheat"], false],
  ["luqaimat", "Luqaimat (sweet fried dumplings with syrup)", ["لقيمات", "luqaimat"], "Gulf", "cooked_dish", "dessert", "deep-fried", ["flour", "yeast", "date syrup", "oil"], 370, 4, 55, 15, 1.2, [["5 pieces", 75]], ["wheat"], true],
  ["kunafa", "Kunafa (cheese pastry with syrup)", ["كنافة", "knafeh"], "Levantine", "cooked_dish", "dessert", "baked", ["shredded pastry", "cheese", "butter", "sugar syrup"], 340, 6, 40, 18, 1, [["1 piece", 120]], ["wheat", "milk"], true],
  ["basbousa", "Basbousa (semolina cake)", ["بسبوسة", "basbousa"], "Egyptian", "cooked_dish", "dessert", "baked", ["semolina", "sugar syrup", "butter", "yogurt"], 330, 4, 52, 12, 1, [["1 piece", 80]], ["wheat", "milk"], true],
  ["umm_ali", "Umm Ali (bread pudding)", ["أم علي", "umm ali"], "Egyptian", "cooked_dish", "dessert", "baked", ["pastry", "milk", "cream", "sugar", "nuts", "raisins"], 230, 6, 28, 11, 0.8, [["1 bowl", 200]], ["wheat", "milk", "tree_nuts"], true],
  ["maamoul_dates", "Maamoul (date-filled cookie)", ["معمول", "maamoul"], "Levantine", "cooked_dish", "dessert", "baked", ["semolina", "butter", "dates", "sugar"], 400, 5, 55, 18, 3, [["1 piece", 35]], ["wheat", "milk"], true],
  ["kleija", "Kleija (date-filled Qassim cookie)", ["كليجا", "kleija"], "Saudi", "cooked_dish", "dessert", "baked", ["flour", "ghee", "dates", "cardamom"], 440, 6, 60, 19, 3, [["1 piece", 30]], ["wheat", "milk"], true],
  ["balaleet", "Balaleet (sweet vermicelli with egg)", ["بلاليط", "balaleet"], "Gulf", "cooked_dish", "breakfast", "sweet and savory", ["vermicelli", "sugar", "saffron", "cardamom", "egg omelette"], 230, 5, 33, 9, 1, [["1 plate", 250]], ["wheat", "egg"], true],
  ["dates_ajwa", "Dates, Ajwa", ["تمر عجوة", "tamr ajwa"], "Saudi", "raw_ingredient", "fruit", "dried", ["ajwa dates"], 277, 2, 75, 0.2, 6.7, [["1 date", 8]], [], true],
  ["dates_sukkari", "Dates, Sukkari", ["تمر سكري", "tamr sukkari"], "Saudi", "raw_ingredient", "fruit", "dried", ["sukkari dates"], 282, 2.2, 75, 0.3, 6.5, [["1 date", 10]], [], true],
  ["dates_khalas", "Dates, Khalas", ["تمر خلاص", "tamr khalas"], "Saudi", "raw_ingredient", "fruit", "dried", ["khalas dates"], 280, 2, 75, 0.3, 6.5, [["1 date", 10]], [], true],
  ["arabic_coffee", "Arabic coffee (gahwa) with cardamom, unsweetened", ["قهوة عربية", "gahwa"], "Gulf", "cooked_dish", "beverage", "brewed", ["lightly roasted coffee", "cardamom", "water"], 2, 0.1, 0.4, 0, 0, [["1 small cup", 50]], [], true],
  ["karak_tea", "Karak tea (spiced milk tea), sweetened", ["شاي كرك", "chai karak"], "Gulf", "cooked_dish", "beverage", "simmered", ["black tea", "evaporated milk", "sugar", "cardamom"], 60, 2, 9, 2, 0, [["1 cup", 200]], ["milk"], true],
  ["tamr_hindi_drink", "Tamarind drink (tamr hindi)", ["تمر هندي", "tamr hindi"], "Middle Eastern", "cooked_dish", "beverage", "steeped", ["tamarind", "sugar", "water"], 35, 0.2, 9, 0, 0.2, [["1 glass", 250]], [], true],
];

const q = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a) => (a.length ? `ARRAY[${a.map(q).join(",")}]` : "'{}'");
const slugSeen = new Set();

const rows = FOODS.map(([slug, name, local, cuisine, type, category, prep, ingredients, kcal, p, c, f, fiber, portions, allergens, veg]) => {
  if (slugSeen.has(slug)) throw new Error(`duplicate slug ${slug}`);
  slugSeen.add(slug);
  // Atwater sanity check: calories should be near 4P + 4C + 9F. Beverages and fibre-rich foods drift a little.
  const calc = 4 * p + 4 * c + 9 * f;
  if (kcal > 20 && Math.abs(calc - kcal) / kcal > 0.35) console.warn(`check macros: ${slug} says ${kcal} kcal, macros give ${calc.toFixed(0)}`);
  const tags = [];
  if (veg) tags.push("vegetarian");
  if (p >= 20) tags.push("high_protein");
  if (c <= 5) tags.push("low_carb");
  return `(${[
    q(`regional_${slug}`), q(name), arr(local), q(cuisine), "'Middle East'", q(type), q(category), "NULL", q(prep), arr(ingredients),
    kcal, p, c, fiber, "NULL", f, "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL", "NULL",
    `${q(JSON.stringify(portions.map(([description, grams]) => ({ description, grams }))))}::jsonb`,
    arr(allergens), arr(tags), "NULL",
    q("AI estimate from typical recipes (approximate, unverified)"), "0.40", "'ai_generated'",
  ].join(",")})`;
});

const COLS =
  "food_id,name,local_names,cuisine,region,food_type,category,description,preparation,ingredients," +
  "kcal,protein_g,carbs_g,fiber_g,sugar_g,fat_g,saturated_fat_g,trans_fat_g,cholesterol_mg,sodium_mg,potassium_mg,calcium_mg,iron_mg,vitamin_c_mg,vitamin_a_ug," +
  "portions,allergens,dietary_tags,glycemic_index,data_source,source_confidence,review_status";

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "regional.sql"), `insert into public.foods (${COLS}) values\n${rows.join(",\n")}\non conflict (food_id) do nothing;\n`);
console.log(`wrote ${rows.length} regional foods to ${join(outDir, "regional.sql")}`);
