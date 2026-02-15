-- Add is_setor_responsavel column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_setor_responsavel BOOLEAN DEFAULT FALSE;

-- Optional: Remove from ativos if it was added previously (clean up)
ALTER TABLE ativos DROP COLUMN IF EXISTS is_setor_responsavel;
