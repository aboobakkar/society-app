-- ============================================
-- Migration 009: Cash Transfer Log
-- Run in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.cash_transfers (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_person   text NOT NULL,
  to_person     text NOT NULL,
  amount        numeric NOT NULL CHECK (amount > 0),
  transfer_date date NOT NULL DEFAULT current_date,
  notes         text,
  recorded_by   uuid REFERENCES public.profiles(id),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cash transfers" ON public.cash_transfers
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
