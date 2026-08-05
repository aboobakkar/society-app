-- ============================================
-- Migration 010: Security hardening (live DB review, 2026-08-05)
-- Run this in Supabase SQL Editor
--
-- Fixes:
--  1. Summary views were SECURITY DEFINER + granted to anon, exposing
--     payments/agent/member financial data to unauthenticated requests.
--  2. profiles UPDATE policy had no WITH CHECK, letting any signed-in
--     user promote themselves (role) or relink themselves (member_id).
--  3. handle_new_user() trusted client-supplied role metadata at signup.
--  4. payment_logs accepted forged audit rows from any client (anon
--     included) via an open INSERT policy.
--  5. member_id_sequence was directly writable by any authenticated
--     user, even though only the SECURITY DEFINER generate_member_id()
--     function should ever touch it.
-- ============================================

-- 1. Summary views: switch to SECURITY INVOKER so they respect the
--    caller's RLS instead of running as the (RLS-bypassing) view owner,
--    and revoke anonymous access. Only admins query these today
--    (src/pages/admin/AgentCollections.tsx), and the "Admins can do
--    everything" policies on payments/profiles/expenses/members already
--    cover that under invoker semantics.
alter view public.monthly_summary set (security_invoker = true);
alter view public.agent_collection_summary set (security_invoker = true);
alter view public.daily_collection_summary set (security_invoker = true);
alter view public.member_due_summary set (security_invoker = true);

revoke select on public.monthly_summary from anon;
revoke select on public.agent_collection_summary from anon;
revoke select on public.daily_collection_summary from anon;
revoke select on public.member_due_summary from anon;

-- 2. profiles: lock role/member_id so a user updating their own row
--    can't change what they're privileged as. Admin promotion still
--    works via the separate "Admins can update profiles" policy.
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and member_id is not distinct from (select p.member_id from public.profiles p where p.id = auth.uid())
  );

-- 3. handle_new_user: never trust client-supplied role from signup
--    metadata. New accounts always start as 'member'; promotion to
--    admin/agent/superadmin must go through an already-privileged actor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'member'
  );
  return new;
end;
$function$;

-- 4. payment_logs: all real audit rows come from the payments_audit
--    trigger -> log_payment_change(), which is SECURITY DEFINER and
--    bypasses RLS as the function owner. No client-facing INSERT policy
--    is needed; dropping it blocks forged audit entries.
drop policy if exists "System can insert logs" on public.payment_logs;

-- 5. member_id_sequence: only generate_member_id() (SECURITY DEFINER)
--    needs to touch this table, and it bypasses RLS as the function
--    owner. Drop the broad client-facing policy.
drop policy if exists "Allow authenticated to use sequence" on public.member_id_sequence;