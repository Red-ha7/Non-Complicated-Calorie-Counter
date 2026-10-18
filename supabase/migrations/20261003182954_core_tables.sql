-- NC3 core schema: profiles, snack_logs, weight_entries, saved_snacks.
-- Every table is owned by one auth user and deleted with them (ON DELETE CASCADE).

-- ───────── profiles ─────────
-- One row per auth user. Columns are nullable until onboarding is complete,
-- then the check at the bottom requires them all.
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  age                 smallint,
  sex                 text,
  height_cm           numeric(5,1),
  weight_kg           numeric(5,1),             -- weight when the goal was set
  goal_weight_kg      numeric(5,1),
  sleep_hrs           numeric(3,1),
  activity_level      text,
  workouts_per_week   text,
  appetite            text not null default 'Not set',
  pace_kg_per_week    numeric(3,2),
  -- The app is gain-only and metric-only today; the checks allow exactly that.
  goal_type           text not null default 'gain',
  units               text not null default 'metric',
  -- Daily extra calories from snacks. This is both the "daily calorie goal"
  -- and the "surplus target": the app has a single number for both.
  daily_calorie_goal  integer not null default 0,
  onboarding_completed boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint profiles_display_name_len check (display_name is null or char_length(btrim(display_name)) between 1 and 40),
  constraint profiles_age_range        check (age between 10 and 100),
  constraint profiles_sex_values       check (sex in ('male', 'female')),
  constraint profiles_height_range     check (height_cm between 100 and 230),
  constraint profiles_weight_range     check (weight_kg between 20 and 300),
  constraint profiles_goal_range       check (goal_weight_kg between 20 and 300),
  constraint profiles_goal_above_start check (goal_weight_kg is null or weight_kg is null or goal_weight_kg > weight_kg),
  constraint profiles_sleep_range      check (sleep_hrs between 3 and 14),
  constraint profiles_activity_values  check (activity_level in ('Sedentary', 'Lightly active', 'Active', 'Very active')),
  constraint profiles_workouts_values  check (workouts_per_week in ('0', '1–2', '3–4', '5+')),
  constraint profiles_appetite_values  check (appetite in ('Not set', 'Small', 'Average', 'Big')),
  constraint profiles_pace_values      check (pace_kg_per_week in (0.25, 0.50, 0.75)),
  constraint profiles_goal_type_values check (goal_type in ('gain')),
  constraint profiles_units_values     check (units in ('metric')),
  constraint profiles_goal_cal_range   check (daily_calorie_goal between 0 and 5000),
  constraint profiles_onboarded_complete check (
    not onboarding_completed or (
      display_name is not null and age is not null and sex is not null
      and height_cm is not null and weight_kg is not null and goal_weight_kg is not null
      and sleep_hrs is not null and activity_level is not null and workouts_per_week is not null
      and pace_kg_per_week is not null and daily_calorie_goal > 0
    )
  )
);

-- ───────── snack_logs ─────────
create table public.snack_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name        text not null,
  calories    integer not null,
  protein_g   numeric(6,1) not null default 0,
  carbs_g     numeric(6,1) not null default 0,
  fat_g       numeric(6,1) not null default 0,
  source      text not null default 'manual',
  logged_at   timestamptz not null default now(),
  -- The calendar day the user logged it against, in their own timezone.
  -- Sent by the client so day totals never shift when the timezone changes.
  logged_on   date not null,
  created_at  timestamptz not null default now(),

  constraint snack_logs_name_len     check (char_length(btrim(name)) between 1 and 80),
  constraint snack_logs_calories     check (calories between 1 and 5000),
  constraint snack_logs_protein      check (protein_g between 0 and 1000),
  constraint snack_logs_carbs        check (carbs_g between 0 and 1000),
  constraint snack_logs_fat          check (fat_g between 0 and 1000),
  constraint snack_logs_source       check (source in ('manual', 'text', 'photo', 'barcode'))
);

-- ───────── weight_entries ─────────
create table public.weight_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  weight_kg    numeric(5,1) not null,
  recorded_on  date not null,
  created_at   timestamptz not null default now(),

  constraint weight_entries_range check (weight_kg between 20 and 300)
);

-- ───────── saved_snacks (the Snack library) ─────────
create table public.saved_snacks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name        text not null,
  calories    integer not null,
  protein_g   numeric(6,1) not null default 0,
  carbs_g     numeric(6,1) not null default 0,
  fat_g       numeric(6,1) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint saved_snacks_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint saved_snacks_calories check (calories between 1 and 5000),
  constraint saved_snacks_protein  check (protein_g between 0 and 1000),
  constraint saved_snacks_carbs    check (carbs_g between 0 and 1000),
  constraint saved_snacks_fat      check (fat_g between 0 and 1000)
);

-- ───────── indexes ─────────
-- Foreign keys are not indexed automatically in Postgres, so each table gets
-- a (user_id, …) index that also serves the app's range queries.
create index snack_logs_user_logged_at_idx on public.snack_logs (user_id, logged_at desc);
create index snack_logs_user_logged_on_idx on public.snack_logs (user_id, logged_on);
create index weight_entries_user_recorded_idx on public.weight_entries (user_id, recorded_on desc);
create index saved_snacks_user_created_idx on public.saved_snacks (user_id, created_at desc);

-- ───────── updated_at ─────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger saved_snacks_set_updated_at before update on public.saved_snacks
  for each row execute function public.set_updated_at();

-- ───────── auto-create a profile on signup ─────────
-- SECURITY DEFINER because it runs as the auth system, not as the new user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nobody should be able to call the trigger function directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
