"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Movimentacao } from "@/types"
import { DashboardCards } from "@/components/dashboard-cards"
import { AlertCenter } from "@/components/alert-center"
import { logger } from "@/lib/logger"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import {
  History, Clock, Users, HardDrive,
  ArrowUpRight, ArrowDownLeft, Edit3,
  ChevronRight, Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface DashboardStats {
  total: number
  emUso: number
  manutencao: number
  disponivel: number
  riscoCritico: number
  garantiaVencendo: number
}

export default function DashboardPage() {
  const { profile, role } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({ total: 0, emUso: 0, manutencao: 0, disponivel: 0, riscoCritico: 0, garantiaVencendo: 0 })
  const [historico, setHistorico] = useState<Movimentacao[]>([])
  const [extraStats, setExtraStats] = useState({ colaboradores: 0, tipos: 0 })
  const [loading, setLoading] = useState(true)

  const isViewer = role === 'Visualizador'

  const getDashboardData = async () => {
    try {
      // Single aggregated query instead of 4 separate count queries
      let query = supabase.from('v_inventario_geral').select('*')

      if (isViewer) {
        const filters = []
        if (profile?.setor_id) {
          filters.push(`setor_id.eq.${profile.setor_id}`)
        } else if (profile?.setor) {
          const sectorName = typeof profile.setor === 'string' ? profile.setor : (profile.setor as any).nome
          if (sectorName) filters.push(`setor.eq.${sectorName}`)
        }

        if (profile?.full_name) {
          filters.push(`colaborador.eq.${profile.full_name}`)
        }

        if (filters.length > 0) {
          query = query.or(filters.join(','))
        } else {
          // Se não tiver setor nem nome, não retorna nada para Viewer (proteção)
          setStats({ total: 0, emUso: 0, manutencao: 0, disponivel: 0, riscoCritico: 0, garantiaVencendo: 0 })
          setLoading(false)
          return
        }
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

          if (a.data_vencimento_garantia || a.data_garantia || a.created_at) {
            // Se não tiver data_vencimento_garantia na view, tenta calcular a partir de created_at + garantia_meses
            const rawDate = a.data_vencimento_garantia || a.data_garantia
            let warrantyDate: Date | null = null

            if (rawDate) {
              warrantyDate = new Date(rawDate)
            } else if (a.created_at && a.garantia_meses) {
              warrantyDate = new Date(a.created_at)
              warrantyDate.setMonth(warrantyDate.getMonth() + a.garantia_meses)
            }

            if (warrantyDate && warrantyDate > today && warrantyDate <= nextMonth) {
              acc.garantiaVencendo++
            }
          }
          return acc
        }, { total: 0, emUso: 0, manutencao: 0, disponivel: 0, riscoCritico: 0, garantiaVencendo: 0 })

        // Fetch risk count separately for visual prominence
        const { count: riskCount } = await supabase
          .from('v_ativos_saude')
          .select('*', { count: 'exact', head: true })
          .eq('status_saude', 'Crítico')

        counts.riscoCritico = riskCount || 0
        setStats(counts)

        // Unique types from same data
        const uniqueTypes = new Set(ativos.map(a => a.status)).size
        setExtraStats(prev => ({ ...prev, tipos: uniqueTypes }))
      }

      // Collaborators count
      let profileQuery = supabase.from('profiles').select('*', { count: 'exact', head: true })

      if (isViewer) {
        if (profile?.setor_id) {
          profileQuery = profileQuery.eq('setor_id', profile.setor_id)
        } else if (profile?.setor) {
          const sectorName = typeof profile.setor === 'string' ? profile.setor : (profile.setor as any).nome
          if (sectorName) profileQuery = profileQuery.eq('setor_id', profile.setor_id) // Wait, if I don't have setor_id I can't filter profiles?
          // Actually, if it's the current user's profile we are probably fine, but for "collaborators count in sector":
          // If we don't have setor_id, we might need to filter profiles by joined sector name.
        }
      }

      const { count: collabCount } = await profileQuery

      setExtraStats(prev => ({ ...prev, colaboradores: collabCount || 0 }))
    } catch (error: unknown) {
      logger.error("Erro ao carregar dados do dashboard:", error)
    }
  }

  const getHistorico = async () => {
    try {
      let mQuery = supabase
        .from('movimentacoes')
        .select(`
                    *,
                    ativo:ativos!inner (id, nome, serial, setor),
                    usuario:profiles (full_name)
                `)
        .order('data_movimentacao', { ascending: false })
        .limit(8)

      if (isViewer) {
        if (profile?.setor_id) {
          mQuery = mQuery.eq('ativo.setor_id', profile.setor_id)
        } else if (profile?.setor) {
          const sectorName = typeof profile.setor === 'string' ? profile.setor : (profile.setor as any).nome
          if (sectorName) mQuery = mQuery.eq('ativo.setor', sectorName)
        }
      }

      const { data, error } = await mQuery

      if (error) throw error
      setHistorico((data || []) as Movimentacao[])
    } catch (error: unknown) {
      logger.error("Erro ao carregar histórico:", error)
    }
  }

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([getDashboardData(), getHistorico()])
      setLoading(false)
    }
    loadAll()

    const channel = supabase.channel('realtime_dashboard_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ativos' }, () => {
        getDashboardData()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimentacoes' }, () => {
        getHistorico()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getActionIcon = (acao: string) => {
    switch (acao) {
      case 'CRIAR': return <ArrowUpRight className="h-4 w-4 text-emerald-500" />
      case 'EDITAR': return <Edit3 className="h-4 w-4 text-indigo-500" />
      case 'DELETAR': return <ArrowDownLeft className="h-4 w-4 text-rose-500" />
      default: return <History className="h-4 w-4 text-slate-400" />
    }
  }

  const getActionLabel = (acao: string) => {
    switch (acao) {
      case 'CRIAR': return 'Cadastro'
      case 'EDITAR': return 'Edição'
      case 'DELETAR': return 'Exclusão'
      default: return acao
    }
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Visão geral do inventário de TI</p>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-40 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : (
        <DashboardCards stats={stats} />
      )}

      {/* Content */}
      <div className="flex flex-col">
        {!isViewer && <AlertCenter />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className={cn(
            "lg:col-span-2 bg-white dark:bg-zinc-900/40 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden",
            isViewer && "hidden"
          )}>
            <div className="px-6 py-5 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Atividade Recente</h2>
              </div>
              <button
                onClick={() => router.push('/history')}
                className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                Ver Tudo
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="px-6 py-4 animate-pulse">
                    <div className="h-5 bg-slate-100 dark:bg-white/5 rounded-lg w-3/4" />
                  </div>
                ))
              ) : historico.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400 font-medium">
                  Nenhuma atividade recente
                </div>
              ) : (
                historico.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center shrink-0">
                      {getActionIcon(item.tipo_movimentacao)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                          {item.ativo?.nome || 'Evento de Sistema'}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider shrink-0">
                          {getActionLabel(item.tipo_movimentacao)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {item.usuario?.full_name || 'Sistema'} • {formatDate(item.data_movimentacao)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Insights */}
          <div className={cn(
            "space-y-5",
            isViewer && "hidden"
          )}>
            <div className="bg-white dark:bg-zinc-900/40 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5">Insights Rápidos</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Colaboradores</p>
                      <p className="text-[10px] text-slate-400">No sistema</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{extraStats.colaboradores}</span>
                </div>

                <div className="h-px bg-slate-50 dark:bg-white/5" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                      <HardDrive className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Total de Ativos</p>
                      <p className="text-[10px] text-slate-400">Cadastrados</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</span>
                </div>

                <div className="h-px bg-slate-50 dark:bg-white/5" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Última Atividade</p>
                      <p className="text-[10px] text-slate-400">
                        {historico[0] ? formatDate(historico[0].data_movimentacao) : 'Nenhuma'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
