-- Per-user rate limiting for the edge functions (fixed windows).
-- Only the service role can touch this: RLS is on with no policies, and the
-- function is not executable by app users.

create table public.rate_limits (
  user_id       uuid not null references auth.users (id) on delete cascade,
  bucket        text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (user_id, bucket, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Returns true if the call is allowed, false if the user is over the limit.
create function public.check_rate_limit(
  p_user uuid,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (user_id, bucket, window_start, hits)
  values (p_user, p_bucket, w, 1)
  on conflict (user_id, bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into n;

  -- Occasional cleanup so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return n <= p_limit;
end;
$$;

revoke execute on function public.check_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(uuid, text, integer, integer) to service_role;
