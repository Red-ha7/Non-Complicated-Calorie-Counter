# NC³ backend (Supabase)

Project: `NC3` (`trqewxyytjazlkkdvjeh`, ap-northeast-1).

## What is here
- `migrations/` – the schema, in the order they were applied.
  1. `core_tables` – profiles, snack_logs, weight_entries, saved_snacks, signup trigger
  2. `row_level_security` – RLS + per-user policies on every table
  3. `totals_and_insights` – `daily_totals` view, `insights_overview()`, `current_streak()`
  4. `rate_limits` – per-user limiter used by the Edge Functions
  5. `foods` – the food database (`public.foods`, read-only for signed-in users) and `search_foods()`
  6. `foods_search_ranking` – ranking tweaks for `search_foods()` (generic and cooked foods first)
- `functions/` – Edge Functions (all require a signed-in user's JWT)
  - `estimate-snack` – calories/macros from a photo or description (Gemini or Claude). The model
    lists each item with a weight; each item is then looked up in the verified food database and
    its calories are computed from real per-100 g values. Items without a confident match keep the
    model's own numbers, and the response says how many items were matched (`basis`).
  - `barcode-lookup` – Open Food Facts lookup by barcode
  - `delete-account` – deletes the caller's account and, by cascade, all their rows

## Manual setup in the dashboard
1. **Auth → URL Configuration**: set *Site URL* to your app's address and add every address you
   use (for example `http://localhost:5173`) to *Redirect URLs*. Confirmation emails and
   Google/Apple sign-in return here.
2. **Auth → Sign In / Providers**:
   - *Email*: on. Decide whether to require email confirmation.
   - *Anonymous sign-ins*: turn **on**. Guest mode uses these.
   - *Google* and *Apple*: enable and paste the client IDs/secrets from Google Cloud / Apple
     Developer. Use the callback URL shown on each provider's page.
3. **Edge Functions → Secrets** (AI estimates need one of these keys):
   - `GEMINI_API_KEY` (free key from Google AI Studio; used first when present). Optional
     `GEMINI_MODEL` (defaults to `gemini-flash-lite-latest`, the fast tier that Google keeps pointing at the newest model). The free tier may let Google use the
     submitted food text/photos to improve its products, and has low rate limits.
   - `ANTHROPIC_API_KEY` (paid). Optional `ESTIMATE_MODEL` (defaults to `claude-haiku-5-5`).
   - `ESTIMATE_PROVIDER` = `gemini` or `claude` forces one when both keys exist.
4. **Auth → SMTP** (before launch): the built-in mailer is heavily rate-limited; add your own SMTP.

## Frontend env
Copy `.env.example` to `.env`. Only the project URL and the **publishable** key belong there.
Never put a service-role key or the Anthropic key in a `VITE_` variable.

## Food database
`public.foods` holds nutrition per 100 g (calories, macros, fibre, sugar, fat types, cholesterol,
sodium, potassium, calcium, iron, vitamins C and A), portion weights, allergens and dietary tags.
Anything a source does not report is `NULL`; nothing is guessed.

| Source | Rows | `review_status` | Notes |
|---|---|---|---|
| USDA FoodData Central: SR Legacy (2018-04) and Foundation Foods (2025-12) | ~8,000 | `verified` | Public domain. Built by `scripts/build-foods-from-usda.mjs`. |
| Regional foods (Saudi, Gulf, Levantine, Egyptian) | 47 | `ai_generated` | Approximate values from typical recipes. Built by `scripts/build-foods-regional.mjs`. Shown as "estimated, unverified" and **never** used to override the AI estimate. Replace with measured values and set `verified` when you have a source. |

Rebuild and load (download the two USDA CSV zips from https://fdc.nal.usda.gov/download-datasets/ first):

```bash
node scripts/build-foods-from-usda.mjs <sr_legacy_dir> <foundation_dir> out/usda
node scripts/build-foods-regional.mjs out/regional
for f in out/usda/*.sql out/regional/*.sql; do supabase db query --linked --file "$f"; done
```
