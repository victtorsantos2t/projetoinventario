-- Migration to add advanced asset features

-- 1. Add columns to ativos
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS condicao TEXT DEFAULT 'Novo';
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS tem_garantia BOOLEAN DEFAULT FALSE;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS garantia_meses INTEGER DEFAULT 0;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS saude INTEGER DEFAULT 100;

-- 2. Add configurations for threshold and warranty
INSERT INTO configuracoes (chave, valor, updated_at)
VALUES 
    ('threshold_substituicao', '5', NOW()),
    ('garantia_padrao_meses', '12', NOW())
ON CONFLICT (chave) DO NOTHING;
