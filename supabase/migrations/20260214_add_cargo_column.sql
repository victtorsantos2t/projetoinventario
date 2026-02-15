-- Migration: Garantir coluna cargo em profiles
-- Data: 2026-02-14

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cargo') THEN
        ALTER TABLE public.profiles ADD COLUMN cargo TEXT;
    END IF;
END $$;
