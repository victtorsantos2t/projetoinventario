"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Movimentacao } from "@/types"
import { DashboardCards } from "@/components/dashboard-cards"
import { DashboardHero } from "@/components/dashboard-hero"
import { AssetDistributionChart, SectorRanking } from "@/components/dashboard-bi"
import { AlertCenter } from "@/components/alert-center"
import { logger } from "@/lib/logger"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import {
  Laptop, Monitor, Server, Box as BoxIcon,
  Users, HardDrive, History, ArrowUpRight, Edit3, ArrowDownLeft, ShieldCheck, Loader2, Sparkles, CheckCircle2, AlertCircle
} from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  FailureTrendCard,
  MTTRCard,
  SectorRiskScore,
  LifecyclePrediction,
  InfrastructureHealthScore,
  TeamProductivity,
  AutomaticRecommendations
} from "@/components/dashboard-analytics"

interface DashboardStats {
  total: number
  emUso: number
  manutencao: number
  disponivel: number
  riscoCritico: number
  garantiaVencendo: number
  emRisco: number
  operacionais: number
}

export default function DashboardPage() {
  const { profile, role } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({ total: 0, emUso: 0, manutencao: 0, disponivel: 0, riscoCritico: 0, garantiaVencendo: 0, emRisco: 0, operacionais: 0 })
  const [extraStats, setExtraStats] = useState({ colaboradores: 0, tipos: 0 })
  const [categoryStats, setCategoryStats] = useState<any[]>([])
  const [sectorStats, setSectorStats] = useState<any[]>([])
  const [historico, setHistorico] = useState<Movimentacao[]>([])
  const [analytics, setAnalytics] = useState({
    failureTrend: { percent: 0, type: '---', sector: '---' },
    mttr: { current: '0h', target: '6h', trend: 'down' as 'up' | 'down', bottleneck: 'Aguardando dados' },
    riskSectors: [] as any[],
    lifecycle: { warranties: 0, endOfLife: 0 },
    health: { score: 0, trend: 0 },
    productivity: { avgResolutionTime: '0h', resolvedCount: 0, reopenRate: 0 },
    recommendations: [] as any[]
  })
  const [loading, setLoading] = useState(true)

  const isViewer = role === 'Visualizador'

  const getDashboardData = async () => {
    try {
      let query = supabase.from('v_inventario_geral').select('*')

      // Buscar movimentações de manutenção para cálculos reais
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const { data: manutRecent } = await supabase
        .from('movimentacoes')
        .select('id, tipo_movimentacao, data_movimentacao, ativo_id, observacao')
        .or('tipo_movimentacao.eq.MANUTENÇÃO,tipo_movimentacao.ilike.%manutenção%')
        .gte('data_movimentacao', sixtyDaysAgo.toISOString())
        .order('data_movimentacao', { ascending: false })

      const manutLast30 = (manutRecent || []).filter(m => new Date(m.data_movimentacao) >= thirtyDaysAgo)
      const manutPrev30 = (manutRecent || []).filter(m => new Date(m.data_movimentacao) < thirtyDaysAgo)

      // Buscar todas as edições (para cálculo de produtividade)
      const { count: resolvedThisMonth } = await supabase
        .from('movimentacoes')
        .select('*', { count: 'exact', head: true })
        .gte('data_movimentacao', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

      if (isViewer) {
        const filters = []
        if (profile?.setor_id) filters.push(`setor_id.eq.${profile.setor_id}`)
        if (profile?.full_name) filters.push(`colaborador.eq.${profile.full_name}`)
        if (filters.length > 0) query = query.or(filters.join(','))
        else { setLoading(false); return; }
      }

      const { data: ativos, error: ativosError } = await query
      if (ativosError) throw ativosError

      if (ativos) {
        const today = new Date()
        const nextMonth = new Date()
        nextMonth.setDate(today.getDate() + 30)

        const counts = ativos.reduce((acc, a) => {
          acc.total++
          if (a.status === 'Em uso') acc.emUso++
          else if (a.status === 'Manutenção') acc.manutencao++
          else if (a.status === 'Disponível') acc.disponivel++

          if (a.status === 'Em uso') acc.operacionais++
          if (a.saude && a.saude < 50 && a.status !== 'Baixado') acc.emRisco++

          const rawDate = a.data_vencimento_garantia || a.data_garantia
          if (rawDate) {
            const warrantyDate = new Date(rawDate)
            if (warrantyDate > today && warrantyDate <= nextMonth) acc.garantiaVencendo++
          }
          return acc
        }, { total: 0, emUso: 0, manutencao: 0, disponivel: 0, riscoCritico: 0, garantiaVencendo: 0, emRisco: 0, operacionais: 0 })

        // BI & Hero Data Aggregation — Usando campo 'tipo' (real)
        const typeMap: any = {}
        const secMap: any = {}
        ativos.forEach(a => {
          typeMap[a.tipo || 'Outros'] = (typeMap[a.tipo || 'Outros'] || 0) + 1
          secMap[a.setor || 'Sem Setor'] = (secMap[a.setor || 'Sem Setor'] || 0) + 1
        })

        // Mapear ícones por tipo real no banco
        const typeIcons: Record<string, any> = {
          'Notebook': Laptop,
          'Computador': Monitor,
          'Monitor': Monitor,
          'Celular': BoxIcon,
          'Servidor': Server,
          'Switch': Server,
        }
        const typeColors: Record<string, string> = {
          'Notebook': 'bg-indigo-500',
          'Computador': 'bg-blue-500',
          'Monitor': 'bg-cyan-500',
          'Celular': 'bg-violet-500',
          'Servidor': 'bg-amber-500',
          'Switch': 'bg-amber-500',
        }

        setCategoryStats(
          Object.entries(typeMap)
            .map(([label, value]) => ({
              label,
              value: value as number,
              color: typeColors[label] || 'bg-emerald-500',
              icon: typeIcons[label] || BoxIcon,
            }))
            .filter(i => i.value > 0)
            .sort((a, b) => b.value - a.value)
        )

        setSectorStats(Object.entries(secMap)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count).slice(0, 5))

        const { count: riskCount } = await supabase.from('v_ativos_saude').select('*', { count: 'exact', head: true }).eq('status_saude', 'Crítico')
        counts.riscoCritico = riskCount || 0
        setStats(counts)
        setExtraStats({ colaboradores: 0, tipos: new Set(ativos.map(a => a.tipo)).size })

        // Predições Operacionais (Cálculos de Inteligência)
        const healthScore = Math.round(((counts.total - counts.manutencao - counts.riscoCritico) / (counts.total || 1)) * 100)

        // Cálculo de Risco por Setor (Foco em Manutenção / Paradas)
        const sectorRiskList = Object.entries(secMap)
          .map(([name, count]) => {
            const sectorAtivos = ativos.filter(a => a.setor === name)
            const total = sectorAtivos.length
            const maintenance = sectorAtivos.filter(a => a.status === 'Manutenção').length

            // Se não tem ativos, ignora ou retorna dados zerados
            if (total === 0) return { name, total: 0, maintenance: 0, percentage: 0, isCritical: false }

            const percentage = Math.round((maintenance / total) * 100)
            const isCritical = percentage === 100 && total > 0 // 100% parado

            return {
              name,
              total,
              maintenance,
              percentage,
              isCritical
            }
          })
          .filter(s => s.maintenance > 0) // Mostrar apenas setores com problemas
          .sort((a, b) => {
            // Critério 1: Criticalidade (100% parado primeiro)
            if (a.isCritical && !b.isCritical) return -1
            if (!a.isCritical && b.isCritical) return 1

            // Critério 2: Quantidade absoluta de máquinas paradas (maior impacto operacional)
            if (b.maintenance !== a.maintenance) return b.maintenance - a.maintenance

            // Critério 3: Porcentagem
            return b.percentage - a.percentage
          })
          .slice(0, 5)

        const endOfLife = ativos.filter(a => {
          const createdDate = a.created_at ? new Date(a.created_at) : null
          if (!createdDate) return false
          const age = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
          return age > 4.5
        }).length

        // Cálculos REAIS de analytics baseados em movimentações
        const manutCount30 = manutLast30.length
        const manutCountPrev = manutPrev30.length
        const failurePercent = manutCountPrev > 0
          ? Math.round(((manutCount30 - manutCountPrev) / manutCountPrev) * 100)
          : (manutCount30 > 0 ? 100 : 0)

        // Encontrar tipo mais afetado nas manutenções recentes
        const manutByAtivoId = manutLast30.map(m => m.ativo_id)
        const ativosManut = ativos.filter(a => manutByAtivoId.includes(a.id))
        const typeCountManut: Record<string, number> = {}
        ativosManut.forEach(a => { typeCountManut[a.tipo || 'Outros'] = (typeCountManut[a.tipo || 'Outros'] || 0) + 1 })
        const mainFailureType = Object.entries(typeCountManut).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem dados'

        // MTTR estimado (tempo médio entre manutenções do mesmo ativo)
        const mttrHours = manutCount30 > 0 ? Math.round((30 * 24) / manutCount30) : 0
        const mttrLabel = mttrHours > 0 ? `${mttrHours}h` : 'Sem dados'

        // Gargalo real: identificar qual ação é mais frequente nas manutenções
        const bottleneck = manutCount30 > 3 ? 'Volume alto de manutenções' : (manutCount30 > 0 ? 'Monitorando' : 'Nenhum identificado')

        // Produtividade real (MTTR - Tempo Médio de Reparo)
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        // Buscar TODAS as movimentações recentes para reconstruir o histórico de status
        const { data: allMovements } = await supabase
          .from('movimentacoes')
          .select('id, tipo_movimentacao, data_movimentacao, ativo_id, observacao')
          .gte('data_movimentacao', ninetyDaysAgo.toISOString())
          .order('data_movimentacao', { ascending: true }) // Importante: Ordem cronológica

        let totalRepairHours = 0
        let repairCount = 0
        let reopenCount = 0

        if (allMovements) {
          // Agrupar por ativo
          const movesByAsset: Record<string, typeof allMovements> = {}
          allMovements.forEach(m => {
            if (!movesByAsset[m.ativo_id]) movesByAsset[m.ativo_id] = []
            movesByAsset[m.ativo_id].push(m)
          })

          // Analisar ciclos para cada ativo
          Object.values(movesByAsset).forEach(moves => {
            let maintenanceStart: Date | null = null
            let lastRepairEnd: Date | null = null

            moves.forEach(m => {
              const obs = (m.observacao || "").toUpperCase()
              const tipo = (m.tipo_movimentacao || "").toUpperCase()
              const date = new Date(m.data_movimentacao)

              // Detector de INÍCIO de Manutenção
              // 1. Tipo explícito MANUTENÇÃO
              // 2. Mudança de Status para Manutenção na observação
              const isMaintenanceStart =
                tipo.includes('MANUTENÇÃO') ||
                obs.includes('-> MANUTENÇÃO') ||
                obs.includes('-> MANUTENCAO')

              // Detector de FIM de Manutenção (Volta para Em uso/Disponível)
              const isMaintenanceEnd =
                (obs.includes('MANUTENÇÃO -> EM USO') ||
                  obs.includes('MANUTENÇÃO -> DISPONÍVEL') ||
                  obs.includes('MANUTENCAO -> EM USO') ||
                  obs.includes('MANUTENCAO -> DISPONIVEL'))

              if (isMaintenanceStart) {
                if (!maintenanceStart) maintenanceStart = date

                // Checar Reabertura (Se voltou pra manutenção < 7 dias após conserto)
                if (lastRepairEnd) {
                  const hoursSinceLastRepair = (date.getTime() - lastRepairEnd.getTime()) / (1000 * 60 * 60)
                  if (hoursSinceLastRepair < (24 * 7)) {
                    reopenCount++
                  }
                  lastRepairEnd = null // Reset após contar reabertura
                }
              } else if (isMaintenanceEnd) {
                if (maintenanceStart) {
                  const durationHours = (date.getTime() - maintenanceStart.getTime()) / (1000 * 60 * 60)
                  totalRepairHours += durationHours
                  repairCount++

                  maintenanceStart = null // Fechou o ciclo
                  lastRepairEnd = date
                }
              }
            })
          })
        }

        const avgHours = repairCount > 0 ? Math.round(totalRepairHours / repairCount) : 0
        const avgResolutionLabel = avgHours > 0 ? (avgHours > 48 ? `${Math.round(avgHours / 24)}d` : `${avgHours}h`) : '0h'

        // Taxa de Reabertura (Manutenções recorrentes / Total de manutenções com sucesso)
        const parsedReopenRate = repairCount > 0 ? Math.round((reopenCount / repairCount) * 100) : 0

        const resolvedCount = repairCount // Usar contagem real de ciclos fechados ou manter resolvedThisMonth? 
        // O KPI pede "chamados resolvidos este mês". repairCount é dos últimos 90 dias.
        // Vamos manter resolvedThisMonth para o volume, mas usar as métricas calculadas para performance.


        // Recomendações dinâmicas
        // Recomendações dinâmicas aprimoradas
        const recommendations: any[] = []

        // 1. Checar Setores Críticos (100% Parados) - PRIORIDADE MÁXIMA
        const criticalSector = sectorRiskList.find(s => s.isCritical)
        if (criticalSector) {
          recommendations.push({
            title: `⚠ Atenção: Setor ${criticalSector.name} Inoperante`,
            reason: `100% dos ativos (${criticalSector.total}) parados. Verificar rede elétrica, switch e conexões de rede local imediatamente.`,
            priority: 'Alta'
          })
        }
        // 2. Checar Setores com Alta Taxa de Parada (> 50% mas não 100%)
        else if (sectorRiskList.length > 0 && sectorRiskList[0].percentage > 50) {
          recommendations.push({
            title: `Instabilidade no Setor ${sectorRiskList[0].name}`,
            reason: `${sectorRiskList[0].maintenance} de ${sectorRiskList[0].total} ativos parados. Investigar causa raiz (hardware ou software).`,
            priority: 'Alta'
          })
        }

        // 3. Checar Volume Global de Manutenção
        if (counts.manutencao >= 5) {
          recommendations.push({
            title: 'Alto Volume de Manutenções',
            reason: `${counts.manutencao} equipamentos aguardando reparo. Impacto potencial na produtividade global.`,
            priority: 'Média'
          })
        }

        // 4. Checar Garantias Vencendo
        if (counts.garantiaVencendo > 0) {
          recommendations.push({
            title: 'Renovação de Garantias',
            reason: `${counts.garantiaVencendo} ativo(s) perdem cobertura em 30 dias.`,
            priority: 'Média'
          })
        }

        // 5. Checar Ativos em Estado Crítico - MÁXIMA PRIORIDADE TÉCNICA
        const criticalAssets = ativos.filter(a => a.status_saude === 'Crítico' && a.status !== 'Baixado')
        if (criticalAssets.length > 0) {
          const types = Array.from(new Set(criticalAssets.map(a => a.tipo || 'Equipamento'))).slice(0, 2).join(' e ')
          recommendations.push({
            title: `🚨 Substituição Crítica: ${types}`,
            reason: `${criticalAssets.length} ativo(s) em estado crítico. Recomendamos a substituição imediata para evitar paradas não planejadas.`,
            priority: 'Alta'
          })
        }

        // 6. Checar Ativos em Alerta (Saúde < 50%)
        const atRiskCount = ativos.filter(a => a.status_saude === 'Alerta' && a.status !== 'Baixado').length
        if (atRiskCount > 0) {
          recommendations.push({
            title: 'Manutenção Preditiva Necessária',
            reason: `${atRiskCount} ativo(s) apresentam sinais de desgaste (Estado: Alerta). Agende revisões preventivas.`,
            priority: 'Média'
          })
        }

        // 6. Fallback: Saudável (Apenas se nenhuma das anteriores for acionada)
        if (recommendations.length === 0) {
          recommendations.push({
            title: 'Infraestrutura Saudável',
            reason: 'Nenhuma ação urgente necessária no momento.',
            priority: 'Baixa'
          })
        }

        // Identificar o setor para o card de tendência (Prioridade: 100% parado > Maior volume de manutenção)
        const focusSector = sectorRiskList.find(s => s.isCritical) || sectorRiskList[0]

        setAnalytics({
          failureTrend: {
            percent: failurePercent,
            type: mainFailureType,
            sector: focusSector?.name || 'Nenhum',
            isCritical: !!focusSector?.isCritical
          },
          mttr: { current: mttrLabel, target: '6h', trend: failurePercent > 0 ? 'up' : 'down', bottleneck },
          riskSectors: sectorRiskList,
          lifecycle: { warranties: counts.garantiaVencendo, endOfLife },
          health: { score: healthScore, trend: manutCount30 < manutCountPrev ? 2 : (manutCount30 > manutCountPrev ? -2 : 0) },
          productivity: { avgResolutionTime: avgResolutionLabel, resolvedCount: resolvedThisMonth || 0, reopenRate: parsedReopenRate },
          recommendations
        } as any)
      }

      const { count: collabCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      setExtraStats(prev => ({ ...prev, colaboradores: collabCount || 0 }))

    } catch (error: unknown) { logger.error(error); }
  }

  const getHistorico = async () => {
    const { data } = await supabase.from('movimentacoes').select('*, ativo:ativos!inner(nome, setor), usuario:profiles(full_name)').order('data_movimentacao', { ascending: false }).limit(5)
    setHistorico((data || []) as Movimentacao[])
  }

  useEffect(() => {
    const load = async () => { setLoading(true); await Promise.all([getDashboardData(), getHistorico()]); setLoading(false); }
    load()
    const channel = supabase.channel('realtime_dashboard_v4').on('postgres_changes', { event: '*', schema: 'public', table: 'ativos' }, () => getDashboardData()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 lg:space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold tracking-tight text-xs lg:text-lg italic">Relatório em Tempo Real do Parque Tecnológico</p>
        </div>
      </div>

      {/* BLOCO 7 — INTELIGÊNCIA OPERACIONAL (PREDITIVO) - AGORA NO TOPO */}
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] pl-1">Inteligência Operacional & Predições</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FailureTrendCard data={analytics.failureTrend} />
              <MTTRCard data={analytics.mttr} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectorRiskScore sectors={analytics.riskSectors} />
              <div className="space-y-6">
                <LifecyclePrediction data={analytics.lifecycle} />
                <TeamProductivity data={analytics.productivity} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <InfrastructureHealthScore score={analytics.health.score} trend={analytics.health.trend} />
            <AutomaticRecommendations recommendations={analytics.recommendations} />

            <div className={cn(
              "p-4 rounded-3xl flex items-center gap-4 border transition-all duration-500",
              stats.riscoCritico > 0
                ? "bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10"
                : "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0",
                stats.riscoCritico > 0 ? "bg-red-500" : "bg-emerald-500"
              )}>
                {stats.riscoCritico > 0 ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <p className={cn(
                "text-xs font-bold leading-snug",
                stats.riscoCritico > 0 ? "text-red-800 dark:text-red-400" : "text-emerald-800 dark:text-emerald-400"
              )}>
                {stats.manutencao === 0 && stats.riscoCritico === 0
                  ? 'Todos os ativos estão operacionais. Nenhuma manutenção pendente detectada.'
                  : `${stats.manutencao} ativo(s) em manutenção e ${stats.riscoCritico} em estado crítico. Ação recomendada.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-100 dark:bg-white/5 my-4" />

      {/* BLOCO 1 — HERO OPERACIONAL */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 h-48 lg:h-64 animate-pulse bg-slate-100 dark:bg-white/5 rounded-[1.5rem] lg:rounded-[2.5rem]" />
      ) : (
        <DashboardHero stats={{ criticos: stats.riscoCritico, emRisco: stats.emRisco, operacionais: stats.operacionais }} />
      )}

      {/* BLOCO 2 — MÉTRICAS RESUMO */}
      <div className="space-y-2 lg:space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] pl-1">Métricas e Volume</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-[2rem]" />
        ) : (
          <DashboardCards stats={stats} />
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL (GRIDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

        {/* COLUNA ESQUERDA (ESTRATÉGICO) */}
        <div className="lg:col-span-8 space-y-4 lg:space-y-10">
          {/* BLOCO 3 — AÇÕES PRIORITÁRIAS */}
          {!isViewer && (
            <div className="space-y-2 lg:space-y-4">
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] pl-1">Prioridades de Decisão</h2>
              <AlertCenter />
            </div>
          )}

          {/* BLOCO 4 — DISTRIBUIÇÃO OPERACIONAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <AssetDistributionChart data={categoryStats} total={stats.total} />
            <SectorRanking sectors={sectorStats} />
          </div>
        </div>

        {/* COLUNA DIREITA (CONTEXTO & HISTÓRICO) */}
        <div className="lg:col-span-4 space-y-4 lg:space-y-10">
          {/* BLOCO 5 — STATUS GLOBAL */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[1.5rem] lg:rounded-[3rem] p-4 lg:p-10 flex flex-col justify-between min-h-[220px] lg:min-h-[350px] relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4 lg:p-10 opacity-5">
              <ShieldCheck className="h-24 w-24 lg:h-32 lg:w-32 text-primary-500" />
            </div>
            <div>
              <h3 className="text-[10px] lg:text-xs font-black text-primary-600 uppercase tracking-[0.4em] mb-2 lg:mb-4">Status Global</h3>
              <div className="flex items-center gap-2 mb-2 lg:mb-4">
                <div className="h-2 w-2 lg:h-3 lg:w-3 rounded-full bg-success-500 animate-pulse" />
                <span className="text-xl lg:text-2xl font-black text-text-primary dark:text-white">Operação Estável</span>
              </div>
              <p className="text-text-secondary dark:text-slate-400 text-sm font-semibold leading-relaxed">
                A infraestrutura está operando em alta eficiência. {stats.riscoCritico > 0 ? `Avaliar prioridades críticas de hardware.` : 'Sem interrupções detectadas.'}
              </p>
            </div>

            <div className="mt-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 shadow-sm flex items-center justify-center"><Users className="h-6 w-6 text-indigo-500" /></div>
                  <span className="text-sm font-bold text-text-secondary dark:text-slate-300">Colaboradores</span>
                </div>
                <span className="text-xl font-black text-text-primary dark:text-white">{extraStats.colaboradores}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-success-50 dark:bg-success-900/20 shadow-sm flex items-center justify-center"><HardDrive className="h-6 w-6 text-success-500" /></div>
                  <span className="text-sm font-bold text-text-secondary dark:text-slate-300">Categorias</span>
                </div>
                <span className="text-xl font-black text-text-primary dark:text-white">{extraStats.tipos}</span>
              </div>
            </div>
          </div>

          {/* BLOCO 6 — ATIVIDADE RECENTE */}
          <div className="space-y-6 pl-2">
            <h2 className="text-xs font-black text-text-muted dark:text-slate-500 uppercase tracking-[0.3em]">Timeline de Atividade</h2>
            <div className="space-y-6">
              {historico.map((h, i) => (
                <div key={i} className="flex gap-4 group cursor-default">
                  <div className="relative flex flex-col items-center">
                    <div className="h-10 w-10 rounded-xl bg-neutral-subtle dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:bg-primary-50 group-hover:border-primary-200 transition-all duration-200">
                      <History className="h-5 w-5 text-text-muted group-hover:text-primary-600 transition-colors" />
                    </div>
                    {i !== historico.length - 1 && <div className="w-px h-full bg-slate-100 dark:bg-white/5 mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-black text-text-primary dark:text-white group-hover:text-primary-700 transition-colors">{h.ativo?.nome}</p>
                    <p className="text-[10px] font-bold text-text-muted mt-0.5">{h.tipo_movimentacao} por {h.usuario?.full_name}</p>
                    <p className="text-[9px] font-medium text-slate-300 dark:text-slate-600 mt-1 uppercase tracking-wider">{new Date(h.data_movimentacao).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  )
}
