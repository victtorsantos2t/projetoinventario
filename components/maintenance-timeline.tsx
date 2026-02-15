"use client"

import { Movimentacao } from "@/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Wrench, ArrowRightLeft, UserPlus, UserMinus,
    AlertCircle, CheckCircle2, Info, Clock,
    ArrowUpCircle, HardDrive, User, ChevronRight,
    Activity
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MaintenanceTimelineProps {
    movements: Movimentacao[]
    loading?: boolean
}

const getEventConfig = (type: string, observation: string) => {
    const obs = observation?.toUpperCase() || ""
    const t = type?.toUpperCase()

    if (obs.includes('[TRANSFERÊNCIA]')) {
        return {
            icon: <ArrowRightLeft className="h-4 w-4" />,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            label: "Transferência"
        }
    }

    switch (t) {
        case 'ENTREGA':
            return {
                icon: <UserPlus className="h-4 w-4" />,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                label: "Entrega"
            }
        case 'DEVOLUÇÃO':
            return {
                icon: <UserMinus className="h-4 w-4" />,
                color: "text-amber-600",
                bg: "bg-amber-50",
                border: "border-amber-100",
                label: "Devolução"
            }
        case 'MANUTENÇÃO':
            return {
                icon: <Wrench className="h-4 w-4" />,
                color: "text-rose-600",
                bg: "bg-rose-50",
                border: "border-rose-100",
                label: "Manutenção"
            }
        case 'EDITAR':
        case 'EDIÇÃO':
            return {
                icon: <Info className="h-4 w-4" />,
                color: "text-sky-600",
                bg: "bg-sky-50",
                border: "border-sky-100",
                label: "Edição"
            }
        case 'CRIAR':
        case 'CRIAÇÃO':
            return {
                icon: <CheckCircle2 className="h-4 w-4" />,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                border: "border-indigo-100",
                label: "Criação"
            }
        default:
            return {
                icon: <Activity className="h-4 w-4" />,
                color: "text-slate-600",
                bg: "bg-slate-50",
                border: "border-slate-100",
                label: type
            }
    }
}

/**
 * Tenta formatar observações complexas de forma mais legível
 * Ex: "colaborador: Webster Tavares -> Marcelo Vieira"
 */
const formatObservation = (text: string) => {
    if (!text) return 'Sem observações registradas.'

    // Remove prefixos comuns
    let cleanText = text.replace('[TRANSFERÊNCIA] ', '').replace('Alterações: ', '')

    // Se tiver a seta de mudança ->
    if (cleanText.includes(' -> ')) {
        const parts = cleanText.split('|').map(p => p.trim())
        return (
            <div className="space-y-2">
                {parts.map((p, i) => {
                    const [label, values] = p.split(':').map(s => s.trim())
                    const [from, to] = values ? values.split('->').map(s => s.trim()) : [p, null]

                    if (!to) return <p key={i} className="text-sm text-slate-600">{p}</p>

                    return (
                        <div key={i} className="flex flex-wrap items-center gap-1.5 text-sm">
                            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-tight">{label}:</span>
                            <span className="line-through text-slate-400 decoration-rose-300 decoration-2">{from}</span>
                            <ChevronRight className="h-3 w-3 text-slate-300" />
                            <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{to}</span>
                        </div>
                    )
                })}
            </div>
        )
    }

    return <p className="text-sm text-slate-600 leading-relaxed italic">"{text}"</p>
}

export function MaintenanceTimeline({ movements, loading }: MaintenanceTimelineProps) {
    if (loading) {
        return (
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-100 rounded w-1/4" />
                            <div className="h-10 bg-slate-50 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (!movements || movements.length === 0) {
        return (
            <div className="py-12 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest text-[10px]">Nenhum histórico registrado</p>
            </div>
        )
    }

    return (
        <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
            {movements.map((movement, idx) => {
                const config = getEventConfig(movement.tipo_movimentacao, movement.observacao || "")

                return (
                    <div key={movement.id} className="relative flex items-start gap-6 animate-in fade-in slide-in-from-left-2 transition-all duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                        {/* Dot/Icon */}
                        <div className={cn(
                            "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-all group-hover:scale-110",
                            config.bg, config.border, config.color
                        )}>
                            {config.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-0.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <span className={cn(
                                    "font-black uppercase text-[10px] tracking-[0.2em] px-3 py-1 rounded-full border",
                                    config.bg, config.border, config.color
                                )}>
                                    {config.label}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(movement.data_movimentacao), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[2.2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                                {formatObservation(movement.observacao || "")}

                                {movement.usuario && (
                                    <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-50">
                                        <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                            {movement.usuario.full_name?.charAt(0) || <User className="h-3 w-3" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registrado por</span>
                                            <span className="text-xs font-bold text-slate-900">{movement.usuario.full_name}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
