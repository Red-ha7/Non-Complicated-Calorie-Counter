-- Global food database: reference data, readable by any signed-in user, writable by nobody
-- through the API (it is loaded with the service role / the Supabase CLI).
-- All nutrition values are per 100 g of edible portion and may be NULL when unknown.

create extension if not exists pg_trgm with schema extensions;

create table public.foods (
  id                bigint generated always as identity primary key,
  food_id           text not null unique,            -- stable slug, e.g. usda_sr_173944
  name              text not null,                   -- canonical English name
  local_names       text[] not null default '{}',
  cuisine           text,
  region            text,
  food_type         text not null,
  category          text,
  description       text,
  preparation       text,
  ingredients       text[] not null default '{}',

  kcal              numeric(8,2),
  protein_g         numeric(8,2),
  carbs_g           numeric(8,2),
  fiber_g           numeric(8,2),
  sugar_g           numeric(8,2),
  fat_g             numeric(8,2),
  saturated_fat_g   numeric(8,2),
  trans_fat_g       numeric(8,2),
  cholesterol_mg    numeric(8,2),
  sodium_mg         numeric(8,2),
  potassium_mg      numeric(8,2),
  calcium_mg        numeric(8,2),
  iron_mg           numeric(8,2),
  vitamin_c_mg      numeric(8,2),
  vitamin_a_ug      numeric(8,2),

  -- [{"description": "1 medium", "grams": 118}, ...]
  portions          jsonb not null default '[]'::jsonb,
  allergens         text[] not null default '{}',
  dietary_tags      text[] not null default '{}',
  glycemic_index    numeric(5,1),

  data_source       text not null,
  source_confidence numeric(3,2),
  review_status     text not null default 'needs_review',
  created_at        timestamptz not null default now(),

  constraint foods_name_len     check (char_length(btrim(name)) between 1 and 200),
  constraint foods_type_values  check (food_type in ('raw_ingredient', 'cooked_dish', 'packaged_product', 'restaurant_item', 'recipe_meal')),
  constraint foods_review_values check (review_status in ('ai_generated', 'needs_review', 'verified')),
  constraint foods_confidence   check (source_confidence is null or source_confidence between 0 and 1),
  constraint foods_kcal_range   check (kcal is null or kcal between 0 and 950),
  constraint foods_macro_range  check (
    coalesce(protein_g, 0) between 0 and 100 and coalesce(carbs_g, 0) between 0 and 100
    and coalesce(fat_g, 0) between 0 and 100
  )
);

create index foods_name_trgm_idx on public.foods using gin (lower(name) extensions.gin_trgm_ops);
create index foods_review_idx on public.foods (review_status);

alter table public.foods enable row level security;
revoke all on public.foods from anon, authenticated;
grant select on public.foods to authenticated;
create policy "foods_read_all" on public.foods for select to authenticated using (true);

-- Fuzzy search: matches whole words and typos, ranks prefix matches and shorter
-- (more generic) names first. Verified rows win ties over AI-written ones.
create function public.search_foods(q text, lim integer default 20)
returns table (
  id bigint, food_id text, name text, food_type text, category text, cuisine text, region text,
  review_status text, kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
  fiber_g numeric, sugar_g numeric, sodium_mg numeric, portions jsonb, score real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with term as (select lower(btrim(left(q, 60))) as t)
  select f.id, f.food_id, f.name, f.food_type, f.category, f.cuisine, f.region,
         f.review_status, f.kcal, f.protein_g, f.carbs_g, f.fat_g, f.fiber_g, f.sugar_g, f.sodium_mg, f.portions,
         (greatest(word_similarity(term.t, lower(f.name)), similarity(term.t, lower(f.name)))
          + case when lower(f.name) like term.t || '%' then 0.30 else 0 end
          + case when lower(f.name) like '%' || term.t || '%' then 0.15 else 0 end
          + case when f.review_status = 'verified' then 0.05 else 0 end)::real as score
  from public.foods f, term
  where char_length(term.t) >= 2
    and (lower(f.name) like '%' || term.t || '%' or word_similarity(term.t, lower(f.name)) > 0.35)
  order by score desc, char_length(f.name) asc
  limit least(greatest(lim, 1), 50);
$$;

revoke execute on function public.search_foods(text, integer) from public, anon;
grant execute on function public.search_foods(text, integer) to authenticated, service_role;
