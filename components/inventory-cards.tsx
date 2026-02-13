"use client"

import { Ativo } from "@/types"
import { Badge } from "@/components/ui/badge"
import { EditAssetModal } from "@/components/edit-asset-modal"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { AssetActivityModal } from "@/components/asset-activity-modal"
import { QRCodeGenerator } from "@/components/qr-code-generator"
import { STATUS_COLORS } from "@/lib/constants"
import { useState } from "react"
import {
    Edit2, Trash2, QrCode, X, History,
    Monitor, Cpu, Laptop, Printer, Smartphone,
    Radio, Server, Tablet, Phone, Wifi, HelpCircle, Hash,
    Clock, AlertTriangle, Timer, Activity, Heart, ShieldCheck,
    Stethoscope, ShieldAlert, ShieldClose
} from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { cn } from "@/lib/utils"

interface InventoryCardsProps {
    data: Ativo[]
    loading: boolean
    onRefresh?: () => void
    categories?: any[]
    highlightId?: string
}

const getTypeIcon = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
        case 'computador': return <Cpu className="h-5 w-5" />
        case 'notebook': return <Laptop className="h-5 w-5" />
        case 'monitor': return <Monitor className="h-5 w-5" />
        case 'impressora': return <Printer className="h-5 w-5" />
        case 'celular': return <Smartphone className="h-5 w-5" />
        case 'tablet': return <Tablet className="h-5 w-5" />
        case 'telefone ip': return <Phone className="h-5 w-5" />
        case 'switch': return <Server className="h-5 w-5" />
        case 'roteador': return <Wifi className="h-5 w-5" />
        case 'acess point': return <Radio className="h-5 w-5" />
        default: return <HelpCircle className="h-5 w-5" />
    }
}

export function InventoryCards({ data, loading, onRefresh, categories = [], highlightId }: InventoryCardsProps) {
    const { role } = useUser()
    const isViewer = role === 'Visualizador'

    const [editAsset, setEditAsset] = useState<Ativo | null>(null)
    const [viewAsset, setViewAsset] = useState<Ativo | null>(null)
    const [deleteAsset, setDeleteAsset] = useState<Ativo | null>(null)
    const [qrAsset, setQrAsset] = useState<Ativo | null>(null)
    const [activityAsset, setActivityAsset] = useState<{ id: string; nome: string } | null>(null)

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-56 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-100 dark:border-white/5 shadow-sm animate-pulse" />
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <Cpu className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium text-lg">Nenhum ativo encontrado</p>
                <p className="text-sm text-slate-300 mt-1">Tente ajustar os filtros ou cadastre um novo ativo.</p>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {data.map((ativo) => {
                    const statusClass = STATUS_COLORS[ativo.status] || "bg-slate-50 text-slate-500 border-slate-200"
                    const isHighlighted = highlightId === ativo.id

                    return (
                        <div
                            key={ativo.id}
                            onClick={() => setViewAsset(ativo)}
                            className={cn(
                                "group bg-white dark:bg-zinc-900/40 rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer",
                                isHighlighted
                                    ? "border-primary shadow-xl shadow-primary/20 ring-2 ring-primary/20 scale-[1.02] z-10"
                                    : "border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-white/5"
                            )}
                        >
                            {/* Header */}
                            <div className="p-5 pb-3">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                                        {getTypeIcon(ativo.tipo)}
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${statusClass}`}>
                                        {ativo.status}
                                    </Badge>
                                </div>

                                <h3 className="font-bold text-slate-900 truncate mb-0.5" title={ativo.nome}>{ativo.nome}</h3>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-400 font-mono truncate">{ativo.serial}</p>
                                    {ativo.condicao === 'Semi-novo' && (
                                        <Badge variant="secondary" className="text-[9px] bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 h-4">Semi-novo</Badge>
                                    )}
                                </div>

                                {ativo.patrimonio && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <Hash className="h-3 w-3 text-primary/50" />
                                        <span className="text-[10px] font-bold text-primary/70">{ativo.patrimonio}</span>
                                    </div>
                                )}


                            </div>

                            {/* Info */}
                            <div className="px-5 pb-3 space-y-1">
                                {ativo.setor && (
                                    <p className="text-[11px] text-slate-400 truncate">
                                        <span className="font-bold text-slate-500">Setor:</span> {ativo.setor}
                                    </p>
                                )}
                                {ativo.colaborador && (
                                    <p className="text-[11px] text-slate-400 truncate">
                                        <span className="font-bold text-slate-500">Resp:</span> {ativo.colaborador}
                                    </p>
                                )}

                                {/* Depreciation Info */}
                                {(() => {
                                    const category = categories.find(c => (c.nome || c.name) === ativo.tipo)
                                    if (!category || !category.depreciacao_meses) return null

                                    const creationDate = new Date(ativo.created_at)
                                    const now = new Date()
                                    const diffMs = now.getTime() - creationDate.getTime()
                                    const monthsPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375))

                                    // Regra: Semi-novo deprecia na metade do tempo
                                    const totalDepreciationMonths = ativo.condicao === 'Semi-novo'
                                        ? Math.floor(category.depreciacao_meses / 2)
                                        : category.depreciacao_meses

                                    const monthsRemaining = Math.max(0, totalDepreciationMonths - monthsPassed)

                                    const isCritical = monthsRemaining <= 6
                                    const isDepreciated = monthsRemaining === 0

                                    return (
                                        <>
                                            <div className="pt-3 border-t border-slate-50 mt-2 space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest">
                                                        {isDepreciated ? (
                                                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                                                        ) : isCritical ? (
                                                            <Timer className="h-3 w-3 text-orange-500 animate-pulse" />
                                                        ) : (
                                                            <Clock className="h-3 w-3 text-indigo-500" />
                                                        )}
                                                        <span className={
                                                            isDepreciated ? 'text-rose-600' :
                                                                isCritical ? 'text-orange-600' :
                                                                    'text-indigo-600'
                                                        }>
                                                            {isDepreciated ? 'Vida Útil Esgotada' : 'Tempo de Vida Útil'}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-black ${isDepreciated ? 'text-rose-600' :
                                                        isCritical ? 'text-orange-600' :
                                                            'text-indigo-600'
                                                        }`}>
                                                        {isDepreciated ? 'BAIXAR ITEM' : `${monthsRemaining} MESES`}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-50 dark:border-white/5 shadow-inner">
                                                    <div
                                                        className={`h-full transition-all duration-1000 rounded-full shadow-sm ${isDepreciated ? 'bg-rose-500' :
                                                            isCritical ? 'bg-orange-500' :
                                                                'bg-indigo-500'
                                                            }`}
                                                        style={{ width: `${Math.min(100, (monthsRemaining / totalDepreciationMonths) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Server-side Health Badge (FASE 2) */}
                                            <div className="mt-3 pt-3 border-t border-slate-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Stethoscope className={cn(
                                                            "h-3.5 w-3.5",
                                                            ativo.saude_info?.status_saude === 'Excelente' ? "text-emerald-500" :
                                                                ativo.saude_info?.status_saude === 'Alerta' ? "text-amber-500" : "text-rose-500"
                                                        )} />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado de Saúde</span>
                                                    </div>
                                                    <Badge className={cn(
                                                        "text-[9px] font-black uppercase px-2 py-0 h-5",
                                                        ativo.saude_info?.status_saude === 'Excelente' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            ativo.saude_info?.status_saude === 'Alerta' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                                    )}>
                                                        {ativo.saude_info?.status_saude || 'N/A'}
                                                    </Badge>
                                                </div>

                                                {/* Warranty Alert (FASE 2) */}
                                                {(ativo.saude_info?.garantia_vencendo || ativo.saude_info?.garantia_vencida) && (
                                                    <div className={cn(
                                                        "flex items-center gap-2 p-2 rounded-xl border mt-2",
                                                        ativo.saude_info?.garantia_vencida
                                                            ? "bg-slate-50 border-slate-200"
                                                            : "bg-orange-50 border-orange-100 animate-pulse"
                                                    )}>
                                                        {ativo.saude_info?.garantia_vencida ? (
                                                            <>
                                                                <ShieldAlert className="h-3 w-3 text-slate-400" />
                                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Garantia Vencida</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Timer className="h-3 w-3 text-orange-500" />
                                                                <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tighter">Garantia Vencendo</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mt-2 px-0.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                                                            <Activity className="h-2.5 w-2.5 text-primary" />
                                                            <span>{ativo.saude_info?.contagem_saude || 0} Intervenções</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[8px] font-medium text-slate-300">
                                                            <History className="h-2 w-2" />
                                                            <span>{ativo.saude_info?.count_manutencao || 0} Total Histórico</span>
                                                        </div>
                                                    </div>
                                                    {ativo.saude_info?.ultima_manutencao && (
                                                        <span className="text-[9px] font-medium text-slate-300 self-end">
                                                            Última: {new Date(ativo.saude_info.ultima_manutencao).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center border-t border-slate-50 dark:border-white/5 divide-x divide-slate-50 dark:divide-white/5 relative z-20" onClick={(e) => e.stopPropagation()}>
                                {!isViewer && (
                                    <button onClick={() => setEditAsset(ativo)} className="flex-1 py-3 text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5" title="Editar">
                                        <Edit2 className="h-4 w-4 shrink-0" />
                                        <span className="text-[10px] font-bold hidden sm:block">Editar</span>
                                    </button>
                                )}
                                <button onClick={() => setQrAsset(ativo)} className="flex-1 py-3 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-1.5" title="QR Code">
                                    <QrCode className="h-4 w-4 shrink-0" />
                                    <span className="text-[10px] font-bold hidden sm:block">QR</span>
                                </button>
                                <button onClick={() => setActivityAsset({ id: ativo.id, nome: ativo.nome })} className="flex-1 py-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/50 transition-colors flex items-center justify-center gap-1.5" title="Histórico">
                                    <History className="h-4 w-4 shrink-0" />
                                    <span className="text-[10px] font-bold hidden sm:block">Log</span>
                                </button>
                                {!isViewer && (
                                    <button onClick={() => setDeleteAsset(ativo)} className="flex-1 py-3 text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-colors flex items-center justify-center gap-1.5" title="Excluir">
                                        <Trash2 className="h-4 w-4 shrink-0" />
                                        <span className="text-[10px] font-bold hidden sm:block">Excluir</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modals */}
            <EditAssetModal ativo={editAsset} open={!!editAsset} onClose={() => setEditAsset(null)} onSuccess={onRefresh} mode="edit" />
            <EditAssetModal ativo={viewAsset} open={!!viewAsset} onClose={() => setViewAsset(null)} mode="view" />

            {deleteAsset && (
                <DeleteConfirmModal
                    ativoId={deleteAsset.id}
                    ativoNome={deleteAsset.nome}
                    open={!!deleteAsset}
                    onOpenChange={(open) => !open && setDeleteAsset(null)}
                />
            )}

            {qrAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] p-8 shadow-2xl text-center max-w-xs w-full border border-slate-100 dark:border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="mb-6">
                            <h3 className="font-black text-xl text-slate-900 dark:text-white mb-1">{qrAsset.nome}</h3>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{qrAsset.tipo}</p>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                                <QRCodeGenerator
                                    value={`${window.location.origin}/p/${qrAsset.id}`}
                                    size={200}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-slate-50 py-3 px-4 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Patrimônio / Serial</p>
                                <p className="text-xs font-mono font-bold text-slate-700">{qrAsset.patrimonio || 'S/P'} — {qrAsset.serial}</p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setQrAsset(null)}
                                    className="flex-1 px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                                >
                                    Fechar
                                </button>
                                <button
                                    onClick={() => {
                                        window.open(`/print/label/${qrAsset.id}`, '_blank', 'width=400,height=300')
                                    }}
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AssetActivityModal
                ativoId={activityAsset?.id || null}
                ativoNome={activityAsset?.nome || null}
                open={!!activityAsset}
                onOpenChange={(open) => !open && setActivityAsset(null)}
            />
        </>
    )
}
