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
    Clock, AlertTriangle, Timer, Activity, Heart, ShieldCheck
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
                    <div key={i} className="h-56 rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />
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
                                "group bg-white rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer",
                                isHighlighted
                                    ? "border-primary shadow-xl shadow-primary/20 ring-2 ring-primary/20 scale-[1.02] z-10"
                                    : "border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50"
                            )}
                        >
                            {/* Header */}
                            <div className="p-5 pb-3">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/5 transition-colors">
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
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                                                    <div
                                                        className={`h-full transition-all duration-1000 rounded-full shadow-sm ${isDepreciated ? 'bg-rose-500' :
                                                            isCritical ? 'bg-orange-500' :
                                                                'bg-indigo-500'
                                                            }`}
                                                        style={{ width: `${Math.min(100, (monthsRemaining / totalDepreciationMonths) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Health display on card - Moved to bottom */}
                                            <div className="mt-3 pt-3 border-t border-slate-50">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Heart className={cn(
                                                            "h-3 w-3 fill-current",
                                                            (ativo.saude ?? 100) > 70 ? "text-emerald-500" :
                                                                (ativo.saude ?? 100) > 30 ? "text-amber-500" : "text-red-500"
                                                        )} />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saúde do Equipamento</span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-black",
                                                        (ativo.saude ?? 100) > 70 ? "text-emerald-600" :
                                                            (ativo.saude ?? 100) > 30 ? "text-amber-600" : "text-red-600"
                                                    )}>{ativo.saude ?? 100}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full shadow-sm transition-all duration-700 ease-out",
                                                            (ativo.saude ?? 100) > 70 ? "bg-emerald-500" :
                                                                (ativo.saude ?? 100) > 30 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${ativo.saude ?? 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center border-t border-slate-50 divide-x divide-slate-50 relative z-20" onClick={(e) => e.stopPropagation()}>
                                {!isViewer && (
                                    <button onClick={() => setEditAsset(ativo)} className="flex-1 py-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5" title="Editar">
                                        <Edit2 className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold">Editar</span>
                                    </button>
                                )}
                                <button onClick={() => setQrAsset(ativo)} className="flex-1 py-2.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-1.5" title="QR Code">
                                    <QrCode className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold">QR</span>
                                </button>
                                <button onClick={() => setActivityAsset({ id: ativo.id, nome: ativo.nome })} className="flex-1 py-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/50 transition-colors flex items-center justify-center gap-1.5" title="Histórico">
                                    <History className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold">Log</span>
                                </button>
                                {!isViewer && (
                                    <button onClick={() => setDeleteAsset(ativo)} className="flex-1 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-colors flex items-center justify-center gap-1.5" title="Excluir">
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold">Excluir</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
                        <h3 className="font-bold text-slate-900 mb-4">{qrAsset.nome}</h3>
                        <QRCodeGenerator value={`ASSET:${qrAsset.id}|SN:${qrAsset.serial}`} size={200} />
                        <p className="text-xs text-slate-400 mt-3 font-mono">{qrAsset.serial}</p>
                        <button onClick={() => setQrAsset(null)} className="mt-4 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                            Fechar
                        </button>
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
