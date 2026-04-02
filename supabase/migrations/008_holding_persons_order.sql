-- ============================================
-- Migration 008: Cash holding persons + member collection order
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Add holding persons list to settings (JSON array of names)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS holding_persons jsonb DEFAULT '[]'::jsonb;

-- 2. Add collection_order to members (admin sets the route order)
--    Lower number = earlier in collection route
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS collection_order integer DEFAULT 999;

-- Update existing members to have order based on their ID sequence
UPDATE public.members
SET collection_order = CAST(REGEXP_REPLACE(id, '[^0-9]', '', 'g') AS integer)
WHERE id ~ '[0-9]';
