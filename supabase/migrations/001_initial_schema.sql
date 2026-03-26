-- ============================================
-- Society Management System - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('superadmin', 'admin', 'member')),
  member_id text unique, -- links to members table (for member role)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- MEMBERS
-- ============================================
create table public.members (
  id text primary key, -- e.g. SCY001
  name text not null,
  name_ml text, -- Malayalam name
  mobile text not null unique,
  monthly_amount numeric not null default 500,
  status text not null default 'active' check (status in ('active', 'inactive')),
  address text,
  joined_month text not null, -- format: YYYY-MM
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PAYMENTS
-- ============================================
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  member_id text not null references public.members(id) on delete restrict,
  month text not null, -- format: YYYY-MM
  amount numeric not null,
  method text not null check (method in ('cash', 'online', 'bank')),
  payment_date date not null default current_date,
  reference_no text, -- UPI ref, cheque no, etc.
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  -- prevent duplicate payment for same member+month
  unique(member_id, month)
);

-- ============================================
-- EXPENSES
-- ============================================
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  category text not null check (category in ('salary', 'utility', 'maintenance', 'event', 'other')),
  description text not null,
  amount numeric not null,
  expense_date date not null default current_date,
  paid_to text,
  reference_no text,
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ============================================
-- MEMBER ID SEQUENCE TRACKER
-- ============================================
create table public.member_id_sequence (
  id integer primary key default 1,
  last_number integer not null default 0,
  constraint single_row check (id = 1)
);
insert into public.member_id_sequence (id, last_number) values (1, 0);

-- ============================================
-- SOCIETY SETTINGS
-- ============================================
create table public.settings (
  id integer primary key default 1,
  society_name text not null default 'Al-Ameen Society',
  society_name_ml text default 'അൽ-അമീൻ സൊസൈറ്റി',
  default_monthly_amount numeric not null default 500,
  current_fiscal_year text default '2025',
  address text,
  phone text,
  constraint single_row check (id = 1)
);
insert into public.settings (id) values (1);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;
alter table public.member_id_sequence enable row level security;

-- Helper: check if current user is admin/superadmin
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'superadmin'
  );
$$;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());
create policy "Admins can update profiles" on public.profiles
  for update using (public.is_admin());
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Members policies
create policy "Admins can do everything with members" on public.members
  for all using (public.is_admin());
create policy "Members can view own record" on public.members
  for select using (
    id = (select member_id from public.profiles where id = auth.uid())
  );

-- Payments policies
create policy "Admins can do everything with payments" on public.payments
  for all using (public.is_admin());
create policy "Members can view own payments" on public.payments
  for select using (
    member_id = (select member_id from public.profiles where id = auth.uid())
  );

-- Expenses policies
create policy "Admins can do everything with expenses" on public.expenses
  for all using (public.is_admin());
create policy "Members can view expenses" on public.expenses
  for select using (auth.uid() is not null);

-- Settings policies
create policy "Anyone authenticated can view settings" on public.settings
  for select using (auth.uid() is not null);
create policy "Only superadmin can update settings" on public.settings
  for update using (public.is_superadmin());

-- Sequence policies (admin only)
create policy "Admins can use sequence" on public.member_id_sequence
  for all using (public.is_admin());

-- ============================================
-- FUNCTION: Generate next member ID
-- ============================================
create or replace function public.generate_member_id()
returns text language plpgsql security definer as $$
declare
  next_num integer;
  new_id text;
begin
  update public.member_id_sequence
  set last_number = last_number + 1
  where id = 1
  returning last_number into next_num;

  new_id := 'SCY' || lpad(next_num::text, 3, '0');
  return new_id;
end;
$$;

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger members_updated_at before update on public.members
  for each row execute procedure public.handle_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- VIEWS: Useful for reports
-- ============================================

-- Monthly summary view
create or replace view public.monthly_summary as
select
  p.month,
  count(p.id) as payment_count,
  sum(p.amount) as total_collected,
  coalesce((
    select sum(e.amount)
    from public.expenses e
    where to_char(e.expense_date, 'YYYY-MM') = p.month
  ), 0) as total_expenses
from public.payments p
group by p.month
order by p.month desc;

-- Grant view access
grant select on public.monthly_summary to authenticated;
