-- Migration: Adicionar actor_id em notificacoes para evitar self-notifications
-- Data: 2026-02-14

-- 1. Adicionar coluna actor_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'actor_id') THEN
        ALTER TABLE public.notificacoes 
        ADD COLUMN actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Função para capturar o autor da ação (Trigger Function)
CREATE OR REPLACE FUNCTION public.fn_set_notification_actor()
RETURNS TRIGGER AS $$
BEGIN
    -- Captura o ID do usuário logado que disparou a ação (INSERT)
    -- Se for uma ação de sistema (sem sessão), auth.uid() retornará NULL
    NEW.actor_id := auth.uid();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, segue sem actor_id
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar Trigger para preencher automaticamente antes de inserir
DROP TRIGGER IF EXISTS tr_set_notification_actor ON public.notificacoes;

CREATE TRIGGER tr_set_notification_actor
BEFORE INSERT ON public.notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_notification_actor();

-- Comentário: A partir de agora, toda nova notificação terá o ID de quem a gerou.
-- O frontend deve filtrar: WHERE actor_id IS NULL OR actor_id != current_user_id
