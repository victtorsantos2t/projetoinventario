-- Add restaurar_saude column to manutencoes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manutencoes' AND column_name = 'restaurar_saude') THEN
        ALTER TABLE manutencoes ADD COLUMN restaurar_saude BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
