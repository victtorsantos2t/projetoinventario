-- Migration to fix 'notificacoes' table constraint errors
-- This table is likely being populated by a database trigger that doesn't provide all mandatory fields

DO $$
BEGIN
    -- Check if 'notificacoes' table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notificacoes') THEN
        
        -- Fix 'titulo'
        ALTER TABLE notificacoes ALTER COLUMN titulo DROP NOT NULL;
        ALTER TABLE notificacoes ALTER COLUMN titulo SET DEFAULT 'Notificação de Sistema';
        
        -- Fix 'mensagem'
        ALTER TABLE notificacoes ALTER COLUMN mensagem DROP NOT NULL;
        ALTER TABLE notificacoes ALTER COLUMN mensagem SET DEFAULT 'Novo evento registrado no sistema.';
        
        -- Fix 'tipo' (prevents next possible error)
        ALTER TABLE notificacoes ALTER COLUMN tipo DROP NOT NULL;
        ALTER TABLE notificacoes ALTER COLUMN tipo SET DEFAULT 'info';
        
    END IF;
END $$;
