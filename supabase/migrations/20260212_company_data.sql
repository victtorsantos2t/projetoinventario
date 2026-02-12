-- Migration to add Company Data and extend Profiles

-- 1. Create Empresa table (singleton-like, though we use a table for flexibility)
CREATE TABLE IF NOT EXISTS public.empresa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    inscricao_municipal TEXT,
    cnae TEXT,
    -- Address
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    -- Contact
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    website TEXT,
    -- Branding
    logo_url TEXT,
    cor_primaria TEXT DEFAULT '#4F46E5', -- Indigo-600
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Empresa
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;

-- Policies for Empresa
CREATE POLICY "Public can view company data" ON public.empresa FOR SELECT USING (true);
CREATE POLICY "Only admins can update company data" ON public.empresa FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 2. Extend Profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo TEXT;
-- Link to setor is already there as setor_id

-- 3. Trigger for Empresa updated_at
CREATE TRIGGER update_empresa_updated_at BEFORE UPDATE ON public.empresa
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
