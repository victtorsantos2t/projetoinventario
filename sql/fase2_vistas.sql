-- Re-criar a vista de saúde com security_invoker para respeitar RLS
DROP VIEW IF EXISTS v_ativos_saude CASCADE;

CREATE OR REPLACE VIEW v_ativos_saude 
WITH (security_invoker = true)
AS
WITH contagem_manutencao AS (
    SELECT 
        ativo_id,
        COUNT(*) as total_manutencoes,
        MAX(data_movimentacao) as ultima_manutencao
    FROM public.movimentacoes
    WHERE tipo_movimentacao IN ('Manutenção', 'Em Manutenção', 'MANUTENÇÃO')
    GROUP BY ativo_id
)
SELECT 
    a.id,
    COALESCE(cm.total_manutencoes, 0) as count_manutencao,
    cm.ultima_manutencao,
    CASE 
        WHEN COALESCE(cm.total_manutencoes, 0) <= 1 THEN 'Excelente'
        WHEN COALESCE(cm.total_manutencoes, 0) <= 4 THEN 'Alerta'
        ELSE 'Crítico'
    END as status_saude,
    CASE
        WHEN a.tem_garantia = true AND (a.created_at + (a.garantia_meses || ' months')::interval) < (CURRENT_DATE + INTERVAL '30 days') 
             AND (a.created_at + (a.garantia_meses || ' months')::interval) >= CURRENT_DATE THEN true
        ELSE false
    END as garantia_vencendo,
    CASE
        WHEN a.tem_garantia = true AND (a.created_at + (a.garantia_meses || ' months')::interval) < CURRENT_DATE THEN true
        ELSE false
    END as garantia_vencida
FROM public.ativos a
LEFT JOIN contagem_manutencao cm ON a.id = cm.ativo_id;

-- Nova vista para unificar tudo e evitar erros de join no POSTGREST
CREATE OR REPLACE VIEW v_inventario_geral
WITH (security_invoker = true)
AS
SELECT 
    a.*,
    vs.status_saude,
    vs.garantia_vencendo,
    vs.garantia_vencida,
    vs.count_manutencao as saude_count_manutencao,
    vs.ultima_manutencao as saude_ultima_manutencao,
    p.full_name as dono_nome,
    p.avatar_url as dono_avatar
FROM public.ativos a
LEFT JOIN public.v_ativos_saude vs ON a.id = vs.id
LEFT JOIN public.profiles p ON a.dono_id = p.id;

-- Garantir permissões
GRANT SELECT ON v_ativos_saude TO authenticated;
GRANT SELECT ON v_inventario_geral TO authenticated;
GRANT SELECT ON v_ativos_saude TO anon;
GRANT SELECT ON v_inventario_geral TO anon;
GRANT SELECT ON v_ativos_saude TO service_role;
GRANT SELECT ON v_inventario_geral TO service_role;
