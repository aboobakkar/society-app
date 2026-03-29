-- ============================================
-- Migration 004: Fix unique constraint on payments
-- to allow both monthly + imam_food in same month
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the old constraint that only checked (member_id, month)
alter table public.payments
  drop constraint if exists payments_member_id_month_key;

-- Add new constraint: a member can have one payment per type per month
-- i.e. one monthly + one imam_food allowed in the same month
alter table public.payments
  add constraint payments_member_month_type_key
    unique (member_id, month, payment_type);
