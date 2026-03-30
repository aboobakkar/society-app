-- ============================================
-- Migration 006: Add 'agent' role for collection agents
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop & recreate the role check constraint to include 'agent'
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('superadmin', 'admin', 'member', 'agent'));

-- 2. Helper: check if current user is an agent
create or replace function public.is_agent()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'agent'
  );
$$;

-- 3. Members: agents can SELECT all active members (to show due list)
create policy "Agents can view active members" on public.members
  for select using (public.is_agent() and status = 'active');

-- 4. Payments: agents can INSERT payments (recorded_by = their uid)
create policy "Agents can record payments" on public.payments
  for insert with check (
    public.is_agent()
    and recorded_by = auth.uid()
  );

-- 5. Payments: agents can SELECT only payments they recorded today
create policy "Agents can view own today payments" on public.payments
  for select using (
    public.is_agent()
    and recorded_by = auth.uid()
    and payment_date = current_date
  );

-- 6. Settings: agents can view settings (society name etc.)
create policy "Agents can view settings" on public.settings
  for select using (public.is_agent());
