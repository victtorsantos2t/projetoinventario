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
import { History, User, Calendar, ChevronRight, Settings2, AlertTriangle, Info, Loader2 } from "lucide-react"
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
    const [manutencaoCount, setManutencaoCount] = useState(0)

    useEffect(() => {
        async function fetchHistory() {
            if (!ativoId) return
            setLoading(true)
            const { data, error } = await supabase
                .from('movimentacoes')
                .select(`
                    *,
                    usuario:profiles (full_name, avatar_url)
                `)
                .eq('ativo_id', ativoId)
                .order('data_movimentacao', { ascending: false })
                .order('created_at', { ascending: false })

            if (!error && data) {
                const hist = data as unknown as Movimentacao[]
                setHistorico(hist)

                // Contar manutenções via histórico para o alerta
                const count = hist.filter(h => h.tipo_movimentacao === 'MANUTENÇÃO').length
                setManutencaoCount(count)
            }
            setLoading(false)
        }

        if (open && ativoId) fetchHistory()
    }, [open, ativoId])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
                        <DialogTitle className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <History className="h-8 w-8 text-primary" />
                            Histórico do Ativo
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-base">
                            Rastreabilidade completa para: <span className="text-primary font-bold">{ativoNome}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Banner de Sugestão de Troca (Reforço da FASE 2) */}
                    {manutencaoCount >= 5 && (
                        <div className="mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="h-10 w-10 shrink-0 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                                <AlertTriangle className="h-6 w-6 text-white" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Risco Crítico Detectado!</h4>
                                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                    Este equipamento já passou por <span className="font-bold">{manutencaoCount} intervenções</span>.
                                    Sugerimos a **AVALIAÇÃO PARA SUBSTITUIÇÃO** imediata para evitar paradas críticas.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-8 pt-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Compilando linha do tempo...</p>
                            </div>
                        ) : (
                            <MaintenanceTimeline movements={historico} />
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
