-- ============================================
-- Migration 007: Agent tracking, payment logs,
--               tools rental income
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PAYMENT AUDIT LOG
-- Tracks every insert/update/delete on payments
-- ============================================
create table public.payment_logs (
  id uuid default uuid_generate_v4() primary key,
  payment_id uuid,                        -- original payment id (null if deleted)
  action text not null check (action in ('created', 'updated', 'deleted')),
  member_id text,
  month text,
  amount numeric,
  method text,
  payment_type text,
  payment_date date,
  notes text,
  changed_by uuid references public.profiles(id),
  changed_by_name text,                   -- denormalised for easy display
  changed_at timestamptz default now(),
  old_data jsonb,                         -- previous values (for updates/deletes)
  new_data jsonb                          -- new values
);

-- RLS
alter table public.payment_logs enable row level security;
create policy "Admins can view all logs" on public.payment_logs
  for select using (public.is_admin());
create policy "System can insert logs" on public.payment_logs
  for insert with check (true);

-- ============================================
-- 2. TRIGGER: auto-log payment changes
-- ============================================
create or replace function public.log_payment_change()
returns trigger language plpgsql security definer as $$
declare
  actor_name text;
begin
  -- Get name of who made the change
  select coalesce(full_name, email) into actor_name
  from public.profiles
  where id = auth.uid();

  if TG_OP = 'INSERT' then
    insert into public.payment_logs (
      payment_id, action, member_id, month, amount, method,
      payment_type, payment_date, notes,
      changed_by, changed_by_name, new_data
    ) values (
      NEW.id, 'created', NEW.member_id, NEW.month, NEW.amount, NEW.method,
      NEW.payment_type, NEW.payment_date, NEW.notes,
      auth.uid(), actor_name, to_jsonb(NEW)
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    insert into public.payment_logs (
      payment_id, action, member_id, month, amount, method,
      payment_type, payment_date, notes,
      changed_by, changed_by_name, old_data, new_data
    ) values (
      NEW.id, 'updated', NEW.member_id, NEW.month, NEW.amount, NEW.method,
      NEW.payment_type, NEW.payment_date, NEW.notes,
      auth.uid(), actor_name, to_jsonb(OLD), to_jsonb(NEW)
    );
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into public.payment_logs (
      payment_id, action, member_id, month, amount, method,
      payment_type, payment_date, notes,
      changed_by, changed_by_name, old_data
    ) values (
      OLD.id, 'deleted', OLD.member_id, OLD.month, OLD.amount, OLD.method,
      OLD.payment_type, OLD.payment_date, OLD.notes,
      auth.uid(), actor_name, to_jsonb(OLD)
    );
    return OLD;
  end if;

  return null;
end;
$$;

create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute procedure public.log_payment_change();

-- ============================================
-- 3. TOOLS RENTAL INCOME
-- Separate from member payments, payers can be
-- non-members (just name + amount + date)
-- ============================================
create table public.rental_income (
  id uuid default uuid_generate_v4() primary key,
  payer_name text not null,               -- any name, member or not
  payer_mobile text,
  amount numeric not null,
  income_date date not null default current_date,
  description text,                       -- what was rented
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- RLS
alter table public.rental_income enable row level security;

create policy "Admins can do everything with rental" on public.rental_income
  for all using (public.is_admin())
  with check (public.is_admin());

create policy "Agents can insert rental income" on public.rental_income
  for insert with check (
    public.is_agent() and recorded_by = auth.uid()
  );

create policy "Agents can view all rental income" on public.rental_income
  for select using (public.is_agent());

-- ============================================
-- 4. AGENT COLLECTION SUMMARY VIEW
-- Makes per-agent totals easy to query
-- ============================================
create or replace view public.agent_collection_summary as
select
  p.recorded_by,
  pr.full_name as agent_name,
  pr.email as agent_email,
  to_char(p.payment_date, 'YYYY-MM-DD') as collection_date,
  to_char(p.payment_date, 'YYYY-MM') as collection_month,
  count(p.id) as payment_count,
  sum(p.amount) as total_amount,
  count(case when p.method = 'cash' then 1 end) as cash_count,
  count(case when p.method = 'online' then 1 end) as online_count,
  count(case when p.method = 'bank' then 1 end) as bank_count
from public.payments p
left join public.profiles pr on pr.id = p.recorded_by
group by p.recorded_by, pr.full_name, pr.email, p.payment_date
order by p.payment_date desc;

grant select on public.agent_collection_summary to authenticated;

-- ============================================
-- 5. DAY-WISE COLLECTION VIEW
-- ============================================
create or replace view public.daily_collection_summary as
select
  to_char(payment_date, 'YYYY-MM-DD') as day,
  to_char(payment_date, 'YYYY-MM') as month,
  count(id) as payment_count,
  sum(amount) as total_amount,
  count(case when method = 'cash' then 1 end) as cash_count,
  count(case when method = 'online' then 1 end) as online_count,
  sum(case when method = 'cash' then amount else 0 end) as cash_amount,
  sum(case when method = 'online' then amount else 0 end) as online_amount
from public.payments
group by payment_date
order by payment_date desc;

grant select on public.daily_collection_summary to authenticated;
