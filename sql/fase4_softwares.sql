-- FASE 4: ETAPA 3 - GESTÃO DE SOFTWARES E LICENÇAS
-- Data: 2026-02-13
-- Autor: Antigravity

-- 1. Tabela de Softwares (Catálogo)
CREATE TABLE IF NOT EXISTS public.softwares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    desenvolvedor TEXT, -- Microsoft, Adobe, JetBrains, etc
    versao TEXT, -- 2021, v14, 365, etc
    categoria TEXT, -- Sistema Operacional, Office, Design, Utilitário, Antivirus, Dev, Outro
    descricao TEXT,
    site_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Softwares
ALTER TABLE public.softwares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Softwares visíveis para todos" ON public.softwares FOR SELECT USING (true);
CREATE POLICY "Softwares editáveis apenas por admins e técnicos" ON public.softwares FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'tecnico'))
);

-- 2. Tabela de Licenças
CREATE TABLE IF NOT EXISTS public.licencas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    software_id UUID REFERENCES public.softwares(id) ON DELETE CASCADE NOT NULL,
    chave_licenca TEXT, -- Pode ser NULL se for licença de volume/site, mas geralmente tem
    tipo TEXT NOT NULL DEFAULT 'Perpétua', -- Perpétua, Assinatura Anual, Mensal, Trial, Volume, OEM
    qtd_adquirida INTEGER DEFAULT 1, -- Quantas instalações permite
    data_compra DATE,
    data_expiracao DATE, -- NULL se perpétua
    custo NUMERIC(10,2),
    fornecedor TEXT,
    numero_nota_fiscal TEXT,
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Licenças
ALTER TABLE public.licencas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Licenças visíveis para todos" ON public.licencas FOR SELECT USING (true);
CREATE POLICY "Licenças editáveis apenas por admins e técnicos" ON public.licencas FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'tecnico'))
);

-- 3. Tabela de Instalações (Vínculo Licença <-> Ativo)
CREATE TABLE IF NOT EXISTS public.licencas_ativos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    licenca_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE NOT NULL,
    ativo_id UUID REFERENCES public.ativos(id) ON DELETE CASCADE NOT NULL,
    data_instalacao TIMESTAMPTZ DEFAULT NOW(),
    usuario_instalou UUID REFERENCES public.profiles(id), -- Quem registrou a instalação
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(licenca_id, ativo_id) -- Evita duplicar a mesma licença no mesmo ativo
);

-- RLS Instalações
ALTER TABLE public.licencas_ativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instalações visíveis para todos" ON public.licencas_ativos FOR SELECT USING (true);
CREATE POLICY "Instalações editáveis apenas por admins e técnicos" ON public.licencas_ativos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'tecnico'))
);

-- 4. View de Resumo
CREATE OR REPLACE VIEW public.v_softwares_overview
WITH (security_invoker = true)
AS
SELECT 
    s.id as software_id,
    s.nome,
    s.versao,
    s.desenvolvedor,
    s.categoria,
    COUNT(DISTINCT l.id) as total_licencas,
    COALESCE(SUM(l.qtd_adquirida), 0) as total_instancias_permitidas,
    (
        SELECT COUNT(*) 
        FROM public.licencas_ativos la 
        JOIN public.licencas l2 ON la.licenca_id = l2.id 
        WHERE l2.software_id = s.id
    ) as total_instalado,
    (
        COALESCE(SUM(l.qtd_adquirida), 0) - 
        (
            SELECT COUNT(*) 
            FROM public.licencas_ativos la 
            JOIN public.licencas l2 ON la.licenca_id = l2.id 
            WHERE l2.software_id = s.id
        )
    ) as licencas_disponiveis
FROM public.softwares s
LEFT JOIN public.licencas l ON s.id = l.software_id
GROUP BY s.id, s.nome, s.versao, s.desenvolvedor, s.categoria;

-- Trigger update 'updated_at'
CREATE TRIGGER handle_updated_at_softwares BEFORE UPDATE ON public.softwares FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_licencas BEFORE UPDATE ON public.licencas FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
