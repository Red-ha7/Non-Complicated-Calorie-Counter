# NC³ backend (Supabase)

Project: `NC3` (`trqewxyytjazlkkdvjeh`, ap-northeast-1).

## What is here
- `migrations/` – the schema, in the order they were applied.
  1. `core_tables` – profiles, snack_logs, weight_entries, saved_snacks, signup trigger
  2. `row_level_security` – RLS + per-user policies on every table
  3. `totals_and_insights` – `daily_totals` view, `insights_overview()`, `current_streak()`
  4. `rate_limits` – per-user limiter used by the Edge Functions
- `functions/` – Edge Functions (all require a signed-in user's JWT)
  - `estimate-snack` – calories/macros from a photo or description (Claude)
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
3. **Edge Functions → Secrets**: add `ANTHROPIC_API_KEY`. Optional: `ESTIMATE_MODEL`
   (defaults to `claude-opus-5-5`; set `claude-haiku-4-5` for a cheaper estimator).
4. **Auth → SMTP** (before launch): the built-in mailer is heavily rate-limited; add your own SMTP.

## Frontend env
Copy `.env.example` to `.env`. Only the project URL and the **publishable** key belong there.
Never put a service-role key or the Anthropic key in a `VITE_` variable.
