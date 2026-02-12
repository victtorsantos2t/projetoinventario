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
import { History, User, Calendar, ChevronRight, Settings2, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

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

                // Contar quantas vezes o campo MANUT aparece nas observações
                const count = hist.filter(h => h.observacao?.includes("MANUT:")).length
                setManutencaoCount(count)
            }
            setLoading(false)
        }

        if (open && ativoId) fetchHistory()
    }, [open, ativoId])

    const getActionBadge = (acao: string) => {
        switch (acao) {
            case 'CRIAR': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 italic font-medium">CADASTRO</Badge>
            case 'EDITAR': return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 italic font-medium">ALTERAÇÃO</Badge>
            case 'DELETAR': return <Badge className="bg-rose-50 text-rose-700 border-rose-100 italic font-medium">EXCLUSÃO</Badge>
            default: return <Badge variant="outline">{acao}</Badge>
        }
    }

    const renderObservation = (obs: string | null) => {
        if (!obs) return <span className="text-slate-400 italic">Sem observações</span>

        if (obs.startsWith("Alterações:")) {
            const changesStr = obs.replace("Alterações: ", "")
            const rawChanges = changesStr.split(" | ")

            // Separar o que é MANUT do restante
            const technicalChanges = rawChanges.filter(c => !c.startsWith("MANUT:"))
            const maintenanceChange = rawChanges.find(c => c.startsWith("MANUT:"))

            return (
                <div className="space-y-4">
                    {technicalChanges.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {technicalChanges.map((change, idx) => {
                                const parts = change.split(": ")
                                const field = parts[0]
                                const values = parts[1]
                                const [oldVal, newVal] = values ? values.split(" -> ") : ["?", "?"]

                                return (
                                    <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-100 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-600 shadow-sm">
                                        <span className="font-bold text-slate-400 uppercase tracking-tighter">{field}</span>
                                        <span className="opacity-50 line-through max-w-[80px] truncate">{oldVal}</span>
                                        <ChevronRight className="h-2 w-2 text-slate-300" />
                                        <span className="text-slate-900 font-bold">{newVal}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {maintenanceChange && (
                        <div className="mt-2 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl shadow-inner animate-in fade-in slide-in-from-left-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings2 className="h-3.5 w-3.5 text-rose-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Relato Técnico de Manutenção</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                                "{maintenanceChange.split(": ")[1]?.split(" -> ")[1] || maintenanceChange.split(": ")[1]}"
                            </p>
                        </div>
                    )}
                </div>
            )
        }

        return <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{obs}"</p>
    }

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

                    {/* Banner de Sugestão de Troca */}
                    {manutencaoCount > 5 && (
                        <div className="mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4 animate-bounce-subtle">
                            <div className="h-10 w-10 shrink-0 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                                <AlertTriangle className="h-6 w-6 text-white" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Sugestão de Substituição!</h4>
                                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                    Este equipamento já passou por <span className="font-bold">{manutencaoCount} manutenções</span>.
                                    Devido ao alto custo de manutenção e risco de falha, sugerimos a **BAIXA** e substituição por um novo item.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando histórico...</p>
                            </div>
                        ) : historico.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center gap-3">
                                <Info className="h-8 w-8 text-slate-300" />
                                <p className="text-slate-400 font-bold text-sm">Nenhuma movimentação registrada.</p>
                            </div>
                        ) : (
                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-100 before:via-slate-200 before:to-transparent">
                                {historico.map((item) => (
                                    <div key={item.id} className="relative flex items-start gap-6 group">
                                        <div className="absolute left-0 mt-1.5 h-10 w-10 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 shadow-sm z-10 group-hover:border-primary transition-all group-hover:scale-110">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                        </div>
                                        <div className="flex-1 ml-12">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    {getActionBadge(item.tipo_movimentacao)}
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Intl.DateTimeFormat('pt-BR', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            timeZone: 'America/Campo_Grande'
                                                        }).format(new Date(item.data_movimentacao))}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1">
                                                {renderObservation(item.observacao)}
                                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                    <div className="h-5 w-5 rounded-full overflow-hidden bg-slate-200 shadow-sm">
                                                        {item.usuario?.avatar_url ? (
                                                            <img src={item.usuario.avatar_url} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-[8px] text-slate-500">
                                                                {(item.usuario?.full_name?.[0] || 'S').toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    Responsável: <span className="text-slate-600">{item.usuario?.full_name || 'Sistema'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
