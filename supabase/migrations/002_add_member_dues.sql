-- ============================================
-- Migration 002: Add Previous Dues to Members
-- Run this in Supabase SQL Editor
-- ============================================

-- Add opening_balance: total amount of previous dues
-- Add due_from_month: YYYY-MM of the earliest due month
alter table public.members
  add column if not exists opening_balance numeric not null default 0,
  add column if not exists due_from_month text; -- format: YYYY-MM, null = no previous dues
