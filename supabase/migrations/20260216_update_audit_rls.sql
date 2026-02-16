-- Add RLS policies for Sector Responsibles (is_setor_responsavel = true)

-- Allow sector responsibles to create audits
CREATE POLICY "Auditorias criáveis por responsáveis de setor" ON public.auditorias FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_setor_responsavel = true
    )
);

-- Allow sector responsibles to update their own audits
CREATE POLICY "Auditorias editáveis por seus criadores" ON public.auditorias FOR UPDATE USING (
    criado_por = auth.uid()
);

-- Allow sector responsibles to insert items into audits
CREATE POLICY "Itens de auditoria criáveis por responsáveis" ON public.auditoria_itens FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_setor_responsavel = true
    )
);

-- Allow sector responsibles to update items in audits (e.g. status_conferido)
-- We can reuse the same check or be more specific checking if they created the audit/item
CREATE POLICY "Itens de auditoria editáveis por responsáveis" ON public.auditoria_itens FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_setor_responsavel = true
    )
);
