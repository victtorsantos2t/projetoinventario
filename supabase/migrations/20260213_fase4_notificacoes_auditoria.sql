-- ==========================================
-- FASE 4: ETAPA 4 - ENGINE DE NOTIFICAÇÕES
-- ==========================================

-- 1. Garantir que a tabela de notificações e status existam
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'info', -- info, success, warning, error
    link TEXT, -- Link para redirecionar se clicado
    ativo_id UUID REFERENCES public.ativos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notificacoes_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    notificacao_id UUID REFERENCES public.notificacoes(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lido_at TIMESTAMPTZ,
    UNIQUE(notificacao_id, usuario_id)
);

-- RLS para Notificações
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notificações visíveis para todos" ON public.notificacoes FOR SELECT USING (true);

ALTER TABLE public.notificacoes_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status de leitura individual" ON public.notificacoes_status FOR ALL TO authenticated 
USING (usuario_id = auth.uid()) 
WITH CHECK (usuario_id = auth.uid());

-- 2. Função da Engine de Alertas
CREATE OR REPLACE FUNCTION public.fn_gerar_notificacoes_automaticas()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    -- A. Alertas de Saúde Crítica (< 30%)
    FOR rec IN 
        SELECT id, nome, saude FROM public.ativos 
        WHERE saude < 30 AND status != 'Baixado'
    LOOP
        -- Evita duplicar o alerta se já existir um igual criado nas últimas 24h
        IF NOT EXISTS (
            SELECT 1 FROM public.notificacoes 
            WHERE ativo_id = rec.id AND tipo = 'error' AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            INSERT INTO public.notificacoes (titulo, mensagem, tipo, link, ativo_id)
            VALUES (
                'Saúde Crítica: ' || rec.nome,
                'O equipamento está com saúde em ' || rec.saude || '%. Recomendado manutenção urgente.',
                'error',
                '/inventory?id=' || rec.id,
                rec.id
            );
        END IF;
    END LOOP;

    -- B. Alertas de Garantia (Próximos 30 dias)
    FOR rec IN 
        SELECT id, nome, data_garantia FROM public.ativos 
        WHERE data_garantia BETWEEN NOW() AND (NOW() + INTERVAL '30 days')
        AND status != 'Baixado'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notificacoes 
            WHERE ativo_id = rec.id AND tipo = 'warning' AND created_at > NOW() - INTERVAL '30 days'
        ) THEN
            INSERT INTO public.notificacoes (titulo, mensagem, tipo, link, ativo_id)
            VALUES (
                'Garantia Expirando: ' || rec.nome,
                'A garantia deste item vence em ' || TO_CHAR(rec.data_garantia, 'DD/MM/YYYY') || '.',
                'warning',
                '/inventory?id=' || rec.id,
                rec.id
            );
        END IF;
    END LOOP;

    -- C. Alertas de Licenças de Software (Próximos 30 dias)
    FOR rec IN 
        SELECT l.id, s.nome, l.data_expiracao 
        FROM public.licencas l
        JOIN public.softwares s ON l.software_id = s.id
        WHERE l.data_expiracao BETWEEN NOW() AND (NOW() + INTERVAL '30 days')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notificacoes 
            WHERE mensagem LIKE '%' || rec.nome || '%' AND tipo = 'warning' AND created_at > NOW() - INTERVAL '30 days'
        ) THEN
            INSERT INTO public.notificacoes (titulo, mensagem, tipo, link)
            VALUES (
                'Licença Expirando: ' || rec.nome,
                'A licença do software ' || rec.nome || ' vence em ' || TO_CHAR(rec.data_expiracao, 'DD/MM/YYYY') || '.',
                'warning',
                '/softwares'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FASE 4: ETAPA 5 - AUDITORIA
-- ==========================================

-- 3. Tabelas de Auditoria
CREATE TABLE IF NOT EXISTS public.auditorias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    criado_por UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'em_progresso', -- em_progresso, finalizada, cancelada
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finalizada_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.auditoria_itens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auditoria_id UUID REFERENCES public.auditorias(id) ON DELETE CASCADE,
    ativo_id UUID REFERENCES public.ativos(id) ON DELETE CASCADE,
    verificado_por UUID REFERENCES public.profiles(id),
    status_conferido TEXT, -- OK, Divergente, Não Encontrado
    localizacao_conferida TEXT,
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(auditoria_id, ativo_id)
);

-- RLS para Auditorias
ALTER TABLE public.auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auditorias visíveis para todos" ON public.auditorias FOR SELECT USING (true);
CREATE POLICY "Auditorias editáveis por admin e tecnico" ON public.auditorias FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'tecnico'))
);

CREATE POLICY "Itens de auditoria visíveis para todos" ON public.auditoria_itens FOR SELECT USING (true);
CREATE POLICY "Itens de auditoria editáveis por admin e tecnico" ON public.auditoria_itens FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'tecnico'))
);
