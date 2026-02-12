"use client"

import { cn } from "@/lib/utils"
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
    Clock, AlertTriangle, Timer
} from "lucide-react"
import { useUser } from "@/contexts/user-context"

interface InventoryTableProps {
    data: Ativo[]
    loading: boolean
    onRefresh?: () => void
    highlightId?: string
}

export function InventoryTable({ data, loading, onRefresh, highlightId }: InventoryTableProps) {
    const { role } = useUser()
    const isViewer = role === 'Visualizador'

    const [editAsset, setEditAsset] = useState<Ativo | null>(null)
    const [deleteAsset, setDeleteAsset] = useState<Ativo | null>(null)
    const [qrAsset, setQrAsset] = useState<Ativo | null>(null)
    const [activityAsset, setActivityAsset] = useState<{ id: string; nome: string } | null>(null)

    return (
        <>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Ativo</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Serial</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Patrimônio</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Setor</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Responsável</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-6">
                                            <div className="h-5 bg-slate-100 rounded-xl w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-medium">
                                        Nenhum ativo encontrado.
                                    </td>
                                </tr>
                            ) : (
                                data.map((ativo) => {
                                    const statusClass = STATUS_COLORS[ativo.status] || "bg-slate-50 text-slate-500 border-slate-200"
                                    const isHighlighted = highlightId === ativo.id
                                    return (
                                        <tr
                                            key={ativo.id}
                                            className={cn(
                                                "transition-colors group",
                                                isHighlighted
                                                    ? "bg-primary/5 border-l-4 border-l-primary"
                                                    : "hover:bg-slate-50/30"
                                            )}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-900 text-sm">{ativo.nome}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-500">{ativo.tipo}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono text-slate-400">{ativo.serial}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {ativo.patrimonio ? (
                                                    <div className="flex items-center gap-1">
                                                        <Hash className="h-3 w-3 text-primary/50" />
                                                        <span className="text-xs font-bold text-primary/70">{ativo.patrimonio}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-500">{ativo.setor || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-500">{ativo.colaborador || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${statusClass}`}>
                                                    {ativo.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {!isViewer && (
                                                        <>
                                                            <button onClick={() => setEditAsset(ativo)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-colors" title="Editar">
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => setDeleteAsset(ativo)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors" title="Excluir">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => setQrAsset(ativo)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 flex items-center justify-center transition-colors" title="QR Code">
                                                        <QrCode className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => setActivityAsset({ id: ativo.id, nome: ativo.nome })} className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors" title="Histórico">
                                                        <History className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div >

            {/* Modals */}
            < EditAssetModal ativo={editAsset} open={!!editAsset
            } onClose={() => setEditAsset(null)} onSuccess={onRefresh} />

            {deleteAsset && (
                <DeleteConfirmModal
                    ativoId={deleteAsset.id}
                    ativoNome={deleteAsset.nome}
                    open={!!deleteAsset}
                    onOpenChange={(open) => !open && setDeleteAsset(null)}
                />
            )}

            {
                qrAsset && (
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
                )
            }

            <AssetActivityModal
                ativoId={activityAsset?.id || null}
                ativoNome={activityAsset?.nome || null}
                open={!!activityAsset}
                onOpenChange={(open) => !open && setActivityAsset(null)}
            />
        </>
    )
}
