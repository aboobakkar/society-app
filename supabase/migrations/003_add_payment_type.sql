-- ============================================
-- Migration 003: Add Payment Type to Payments
-- Run this in Supabase SQL Editor
-- ============================================

-- Add payment_type: 'monthly' (default) | 'imam_food'
alter table public.payments
  add column if not exists payment_type text not null default 'monthly'
    check (payment_type in ('monthly', 'imam_food'));
