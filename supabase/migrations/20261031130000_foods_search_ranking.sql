-- Better search ranking: score on how well the WHOLE name matches (so "Bananas, raw" beats
-- "Bananas, dehydrated, or banana powder" for "banana"), prefer prefix matches, and rank
-- restaurant/brand items below generic foods unless the query names them.
create or replace function public.search_foods(q text, lim integer default 20)
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
         (similarity(term.t, lower(f.name))
          + case when lower(f.name) like term.t || '%' then 0.30 else 0 end
          + case when lower(f.name) like '%' || term.t || '%' then 0.15 else 0 end
          -- USDA names generic foods "Food, detail, detail": "rice, ..." is the food, "rice crackers" is a product.
          + case when lower(f.name) like term.t || ',%' or lower(f.name) like term.t || 's,%' or lower(f.name) = term.t then 0.40 else 0 end
          -- People eat rice, pasta, beans and lentils cooked; 100 g dry is ~3x the calories of 100 g cooked.
          + case when f.category in ('Cereal Grains and Pasta', 'Legumes and Legume Products')
                      and lower(f.name) like '%cooked%' and lower(f.name) not like '%uncooked%' then 0.50 else 0 end
          + case when f.review_status = 'verified' then 0.05 else 0 end
          - case when f.food_type = 'restaurant_item' then 0.10 else 0 end)::real as score
  from public.foods f, term
  where char_length(term.t) >= 2
    and (lower(f.name) like '%' || term.t || '%' or word_similarity(term.t, lower(f.name)) > 0.35)
  order by score desc, char_length(f.name) asc
  limit least(greatest(lim, 1), 50);
$$;

revoke execute on function public.search_foods(text, integer) from public, anon;
grant execute on function public.search_foods(text, integer) to authenticated, service_role;
