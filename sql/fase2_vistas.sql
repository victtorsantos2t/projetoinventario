-- Vista para calcular a saúde dos ativos baseada no histórico de movimentações de manutenção
CREATE OR REPLACE VIEW v_ativos_saude AS
WITH contagem_manutencao AS (
    SELECT 
        ativo_id,
        COUNT(*) as total_manutencoes,
        MAX(data_movimentacao) as ultima_manutencao
    FROM movimentacoes
    WHERE tipo_movimentacao IN ('Manutenção', 'Em Manutenção')
    GROUP BY ativo_id
)
SELECT 
    a.id,
    a.nome,
    a.patrimonio,
    a.status,
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
FROM ativos a
LEFT JOIN contagem_manutencao cm ON a.id = cm.ativo_id;

-- Permissões para a nova vista
GRANT SELECT ON v_ativos_saude TO authenticated;
GRANT SELECT ON v_ativos_saude TO anon;
GRANT SELECT ON v_ativos_saude TO service_role;
