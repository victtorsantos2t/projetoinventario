"use client"

import { Movimentacao } from "@/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Wrench, ArrowRightLeft, UserPlus, UserMinus,
    AlertCircle, CheckCircle2, Info, Clock,
    ArrowUpCircle, HardDrive
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MaintenanceTimelineProps {
    movements: Movimentacao[]
    loading?: boolean
}

const getEventIcon = (type: string) => {
    switch (type?.toUpperCase()) {
        case 'ENTREGA': return <UserPlus className="h-4 w-4 text-emerald-500" />
        case 'DEVOLUÇÃO': return <UserMinus className="h-4 w-4 text-amber-500" />
        case 'MANUTENÇÃO': return <Wrench className="h-4 w-4 text-rose-500" />
        case 'EDITAR': return <Info className="h-4 w-4 text-blue-500" />
        case 'CRIAR': return <CheckCircle2 className="h-4 w-4 text-primary" />
        default: return <Activity className="h-4 w-4 text-slate-400" />
    }
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
            <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">Nenhum histórico registrado</p>
            </div>
        )
    }

    return (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
            {movements.map((movement, idx) => (
                <div key={movement.id} className="relative flex items-start gap-4 animate-in fade-in slide-in-from-left-2 transition-all duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                    {/* Dot/Icon */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm transition-transform hover:scale-110">
                        {getEventIcon(movement.tipo_movimentacao)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                                {movement.tipo_movimentacao}
                            </h4>
                            <time className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                {format(new Date(movement.data_movimentacao), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                            </time>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                "{movement.observacao || 'Sem observações registradas.'}"
                            </p>

                            {movement.usuario && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                        {movement.usuario.full_name?.charAt(0) || '?'}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500">
                                        Registrado por: <span className="text-slate-900">{movement.usuario.full_name}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function Activity({ className }: { className?: string }) {
    return <Clock className={className} />
}
