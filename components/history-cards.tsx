"use client"

import { Movimentacao } from "@/types"
import { Badge } from "@/components/ui/badge"
import { AssetActivityModal } from "@/components/asset-activity-modal"
import { useState } from "react"
import {
    ArrowUpRight, ArrowDownLeft, Edit3, History,
    Calendar, User, Box, Clock
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface HistoryCardsProps {
    data: Movimentacao[]
    loading: boolean
}

const getActionIcon = (tipo: string) => {
    switch (tipo) {
        case 'CRIAR': return <ArrowUpRight className="h-5 w-5 text-emerald-500" />
        case 'EDITAR': return <Edit3 className="h-5 w-5 text-indigo-500" />
        case 'DELETAR': return <ArrowDownLeft className="h-5 w-5 text-rose-500" />
        case 'MANUTENÇÃO': return <History className="h-5 w-5 text-amber-500" />
        default: return <History className="h-5 w-5 text-slate-400" />
    }
}

const getActionColor = (tipo: string) => {
    switch (tipo) {
        case 'CRIAR': return "bg-emerald-50 text-emerald-700 border-emerald-200"
        case 'EDITAR': return "bg-indigo-50 text-indigo-700 border-indigo-200"
        case 'DELETAR': return "bg-rose-50 text-rose-700 border-rose-200"
        case 'MANUTENÇÃO': return "bg-amber-50 text-amber-700 border-amber-200"
        default: return "bg-slate-50 text-slate-600 border-slate-200"
    }
}

export function HistoryCards({ data, loading }: HistoryCardsProps) {
    const [activityAsset, setActivityAsset] = useState<{ id: string; nome: string } | null>(null)

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-64 rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <History className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium text-lg">Nenhum registro encontrado</p>
                <p className="text-sm text-slate-300 mt-1">Tente ajustar os filtros de busca.</p>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {data.map((item) => {
                    const date = new Date(item.data_movimentacao)
                    const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
                    const timeStr = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)

                    return (
                        <div key={item.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="p-5 pb-3 border-b border-slate-50">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                                        {getActionIcon(item.tipo_movimentacao)}
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${getActionColor(item.tipo_movimentacao)}`}>
                                        {item.tipo_movimentacao}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700">{dateStr}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">{timeStr}</span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 pt-3 flex-1 flex flex-col gap-3">
                                {/* Asset Info */}
                                {item.ativo ? (
                                    <div
                                        className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors cursor-pointer"
                                        onClick={() => setActivityAsset({ id: item.ativo!.id, nome: item.ativo!.nome })}
                                        title="Ver histórico do ativo"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Box className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">{item.ativo.nome}</span>
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-400 pl-5.5">{item.ativo.serial}</p>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 opacity-60">
                                        <span className="text-xs font-bold text-slate-500 italic">Ativo desconhecido</span>
                                    </div>
                                )}

                                {/* User Info */}
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={item.usuario?.avatar_url || ""} />
                                        <AvatarFallback className="text-xs font-bold bg-slate-100 text-slate-500 rounded-lg">
                                            {(item.usuario?.full_name?.[0] || 'S').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{item.usuario?.full_name || 'Sistema'}</p>
                                        <p className="text-[10px] text-slate-400 truncate">Responsável</p>
                                    </div>
                                </div>

                                {/* Observation (Truncated) */}
                                {item.observacao && (
                                    <div className="mt-auto pt-2 border-t border-slate-50">
                                        <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                                            {item.observacao}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <AssetActivityModal
                ativoId={activityAsset?.id || null}
                ativoNome={activityAsset?.nome || null}
                open={!!activityAsset}
                onOpenChange={(open) => !open && setActivityAsset(null)}
            />
        </>
    )
}
