-- Migration: Adicionar alvos em notificações e trigger de status
-- Data: 2026-02-25

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'alvo_colaborador') THEN
        ALTER TABLE public.notificacoes ADD COLUMN alvo_colaborador TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'alvo_setor') THEN
        ALTER TABLE public.notificacoes ADD COLUMN alvo_setor TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'ativo_id') THEN
        ALTER TABLE public.notificacoes ADD COLUMN ativo_id UUID REFERENCES public.ativos(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_notificar_status_ativo()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.notificacoes (titulo, mensagem, tipo, link, ativo_id, alvo_colaborador, alvo_setor)
        VALUES (
            'Mudança de Status - ' || NEW.tipo,
            'O ativo ' || NEW.nome || ' (' || COALESCE(NEW.patrimonio, NEW.serial) || ') atualizou o status para: ' || NEW.status,
            'info',
            '/inventory?id=' || NEW.id,
            NEW.id,
            NEW.colaborador,
            NEW.setor
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notificar_status_ativo ON public.ativos;

CREATE TRIGGER tr_notificar_status_ativo
AFTER UPDATE OF status ON public.ativos
FOR EACH ROW
EXECUTE FUNCTION public.fn_notificar_status_ativo();
