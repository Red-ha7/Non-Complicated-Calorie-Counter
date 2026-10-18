-- Daily totals, weekly insights and streak, computed in SQL instead of the client.
-- Everything runs as the caller (security invoker), so RLS still applies.

-- One row per user per day.
create view public.daily_totals
with (security_invoker = true) as
select
  user_id,
  logged_on                       as day,
  sum(calories)::integer          as calories,
  sum(protein_g)                  as protein_g,
  sum(carbs_g)                    as carbs_g,
  sum(fat_g)                      as fat_g,
  count(*)::integer               as snack_count
from public.snack_logs
group by user_id, logged_on;

revoke all on public.daily_totals from anon;
grant select on public.daily_totals to authenticated;

-- Insights tab: this week (Sunday → today) plus a history window.
-- p_today is the caller's local date, so "today" matches what they see.
create function public.insights_overview(p_range_days integer default 7, p_today date default current_date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select coalesce((select daily_calorie_goal from public.profiles where id = auth.uid()), 0) as goal
  ),
  bounds as (
    select (p_today - extract(dow from p_today)::integer) as week_start
  ),
  week as (
    select d.day, d.calories
    from public.daily_totals d, bounds b
    where d.user_id = auth.uid() and d.day between b.week_start and p_today
  ),
  hist as (
    select d.day, d.calories
    from public.daily_totals d
    where d.user_id = auth.uid()
      and d.day between (p_today - (greatest(least(p_range_days, 365), 1) - 1)) and p_today
  )
  select jsonb_build_object(
    'goal',            (select goal from me),
    'week_start',      (select week_start from bounds),
    'week_calories',   coalesce((select sum(calories) from week), 0),
    'week_days_logged', (select count(*) from week),
    'days_on_goal',    (select count(*) from week, me where me.goal > 0 and week.calories >= me.goal),
    'history_days_logged', (select count(*) from hist),
    'history_avg_calories', coalesce((select round(avg(calories)) from hist), 0),
    'history', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'calories', calories) order by day desc) from hist), '[]'::jsonb)
  );
$$;

-- Streak: consecutive days with at least one snack, ending today. A day with
-- nothing logged yet doesn't break the streak until it is over.
create function public.current_streak(p_today date default current_date)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  with anchor as (
    select case
      when exists (select 1 from public.daily_totals where user_id = auth.uid() and day = p_today)
        then p_today else p_today - 1 end as s
  ),
  days as (
    select day, row_number() over (order by day desc) as rn
    from public.daily_totals, anchor
    where user_id = auth.uid() and day <= anchor.s
  )
  select count(*)::integer from days, anchor where day + rn::integer = anchor.s + 1;
$$;

revoke execute on function public.insights_overview(integer, date) from public, anon;
revoke execute on function public.current_streak(date) from public, anon;
grant execute on function public.insights_overview(integer, date) to authenticated;
grant execute on function public.current_streak(date) to authenticated;
