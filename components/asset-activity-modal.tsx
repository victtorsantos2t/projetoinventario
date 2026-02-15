"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Movimentacao } from "@/types"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { History, User, Calendar, ChevronRight, Settings2, AlertTriangle, Info, Loader2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { MaintenanceTimeline } from "@/components/maintenance-timeline"

interface AssetActivityModalProps {
    ativoId: string | null
    ativoNome: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AssetActivityModal({ ativoId, ativoNome, open, onOpenChange }: AssetActivityModalProps) {
    const [historico, setHistorico] = useState<Movimentacao[]>([])
    const [loading, setLoading] = useState(false)
    const [counts, setCounts] = useState({ saude: 0, total: 0 })
    const [dataRestauracao, setDataRestauracao] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            if (!ativoId) return
            setLoading(true)

            try {
                // 1. Buscar Histórico (Movimentações)
                const { data: histData, error: histError } = await supabase
                    .from('movimentacoes')
                    .select(`
                        *,
                        usuario:profiles (full_name, avatar_url)
                    `)
                    .eq('ativo_id', ativoId)
                    .order('data_movimentacao', { ascending: false })
                    .order('created_at', { ascending: false })

                if (histError) {
                    console.error("Erro ao buscar histórico:", histError)
                    // Fallback: tentar sem o join do usuário
                    const { data: fallbackData } = await supabase
                        .from('movimentacoes')
                        .select('*')
                        .eq('ativo_id', ativoId)
                        .order('data_movimentacao', { ascending: false })

                    if (fallbackData) setHistorico(fallbackData as any)
                } else {
                    setHistorico(histData || [])
                }

                // 2. Buscar Info de Saúde (Vista)
                const { data: saudeData, error: saudeError } = await supabase
                    .from('v_ativos_saude')
                    .select('contagem_saude, count_manutencao, data_restauracao')
                    .eq('id', ativoId)
                    .maybeSingle()

                if (saudeError) {
                    console.error("Erro ao buscar info de saúde:", saudeError)
                } else if (saudeData) {
                    setCounts({
                        saude: saudeData.contagem_saude,
                        total: saudeData.count_manutencao
                    })
                    setDataRestauracao(saudeData.data_restauracao)
                }
            } catch (err) {
                console.error("Erro catastrófico no modal:", err)
            } finally {
                setLoading(false)
            }
        }

        if (open && ativoId) fetchData()
    }, [open, ativoId])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                {/* Header Padronizado */}
                <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                            <History className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-text-primary dark:text-white">
                                Histórico do Ativo
                            </DialogTitle>
                            <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">
                                Rastreabilidade completa: <span className="text-primary-600 dark:text-primary-400 font-bold">{ativoNome}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Banner de Restauração de Saúde Padronizado */}
                {dataRestauracao && (
                    <div className="mx-8 mt-6 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 rounded-3xl flex items-center gap-5 animate-in fade-in zoom-in duration-500 shadow-sm shadow-emerald-500/5">
                        <div className="h-11 w-11 shrink-0 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tight">Saúde Restaurada!</h4>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400/80 font-medium leading-relaxed">
                                Equipamento restaurado em <span className="font-black underline decoration-emerald-300 dark:decoration-emerald-500/50 underline-offset-2">{new Date(dataRestauracao).toLocaleDateString()}</span>.
                                A contagem de risco foi reiniciada para garantir confiabilidade máxima.
                            </p>
                        </div>
                    </div>
                )}

                {/* Banner de Sugestão de Troca Padronizado */}
                {counts.saude >= 5 && (
                    <div className="mx-8 mt-6 p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/20 rounded-3xl flex items-start gap-5 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm shadow-amber-500/5">
                        <div className="h-11 w-11 shrink-0 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">Risco Crítico Detectado!</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400/80 font-medium leading-relaxed">
                                Equipamento com <span className="font-black text-amber-600 dark:text-amber-500">{counts.saude} intervenções</span> acumuladas.
                                Sugerimos **AVALIAÇÃO PARA SUBSTITUIÇÃO** imediata para evitar paradas críticas.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="h-10 w-10 text-primary-600 dark:text-primary-400 animate-spin" />
                            <p className="text-text-muted font-black uppercase text-[10px] tracking-widest">Compilando linha do tempo...</p>
                        </div>
                    ) : (
                        <MaintenanceTimeline movements={historico} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
