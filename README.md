# NC³ — Non-Complicated Calorie Counter

A snack-only calorie tracker for people who want to gain weight. Log what you snack on, hit a daily surplus goal, track weigh-ins, and browse easy high-calorie snack recipes.

**Stack:** React + Vite + TypeScript · Supabase (Postgres with Row Level Security, Auth, Edge Functions)

## Features

- Daily surplus ring, macros and an intake list
- Log by photo or text (AI estimate), barcode scan, search, or manual entry
- Snack library of saved favourites
- Insights (weekly surplus, days on goal, history) computed in the database
- Weight tracking with a trend chart and a pick-any-date weigh-in calendar
- Ideas: 10 snack recipes with ingredients, steps and sources
- Email, Google and Apple sign-in, plus guest mode

## Run it

```bash
npm install
cp .env.example .env     # add your Supabase URL and publishable key
npm run dev
```

The publishable key is safe in the browser because every table is protected by Row Level Security. Never put a `service_role` key or any AI key in a `VITE_` variable.

## Backend

Everything under `supabase/` (migrations and the `estimate-snack`, `barcode-lookup` and `delete-account` Edge Functions) is documented in [supabase/README.md](supabase/README.md). The AI estimate needs an `ANTHROPIC_API_KEY` secret set on the Edge Functions; it never reaches the browser.
