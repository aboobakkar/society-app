-- ============================================
-- Migration 005: Add Advance Balance to Members
-- Run this in Supabase SQL Editor
-- ============================================

-- advance_balance: excess payment stored here for future deduction
alter table public.members
  add column if not exists advance_balance numeric not null default 0;
