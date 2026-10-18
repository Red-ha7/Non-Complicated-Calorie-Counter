-- Row Level Security on every table: a user can only touch their own rows.
-- `(select auth.uid())` is evaluated once per query instead of once per row.

alter table public.profiles       enable row level security;
alter table public.snack_logs     enable row level security;
alter table public.weight_entries enable row level security;
alter table public.saved_snacks   enable row level security;

-- Defence in depth: the anonymous (not-signed-in) role gets nothing.
revoke all on public.profiles, public.snack_logs, public.weight_entries, public.saved_snacks from anon;

-- profiles: id is the auth user id. No DELETE policy on purpose: the row goes
-- away with the account (see the delete-account edge function).
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- snack_logs
create policy "snack_logs_select_own" on public.snack_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "snack_logs_insert_own" on public.snack_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "snack_logs_update_own" on public.snack_logs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "snack_logs_delete_own" on public.snack_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- weight_entries
create policy "weight_entries_select_own" on public.weight_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "weight_entries_insert_own" on public.weight_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "weight_entries_update_own" on public.weight_entries
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weight_entries_delete_own" on public.weight_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- saved_snacks
create policy "saved_snacks_select_own" on public.saved_snacks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_snacks_insert_own" on public.saved_snacks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saved_snacks_update_own" on public.saved_snacks
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "saved_snacks_delete_own" on public.saved_snacks
  for delete to authenticated using ((select auth.uid()) = user_id);
