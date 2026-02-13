"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Movimentacao } from "@/types"
import { HistoryToolbar } from "@/components/history-toolbar"
import { HistoryCards } from "@/components/history-cards"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownLeft, Edit3, History, ChevronRight, ExternalLink } from "lucide-react"
import { AssetActivityModal } from "@/components/asset-activity-modal"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"

export default function HistoryPage() {
    const { profile, role, isTecnico, loading: userLoading } = useUser()
    const router = useRouter()

    useEffect(() => {
        if (!userLoading && !isTecnico) {
            router.push('/')
        }
    }, [isTecnico, userLoading, router])

    const isViewer = role === 'Visualizador'

    const [historico, setHistorico] = useState<Movimentacao[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [pageSize] = useState(20)
    const [totalCount, setTotalCount] = useState(0)

    // Filters State
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedAction, setSelectedAction] = useState<string | null>(null)
    const [selectedSetor, setSelectedSetor] = useState<string | null>(null)
    const [selectedUser, setSelectedUser] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Modal State
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedAsset, setSelectedAsset] = useState<{ id: string, nome: string } | null>(null)

    const fetchHistorico = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('movimentacoes')
            .select(`
                *,
                ativo:ativos!inner (id, nome, serial, setor_id),
                usuario:profiles (id, full_name, avatar_url)
            `, { count: 'exact' })
            .order('data_movimentacao', { ascending: false })

        // Apply filters
        if (selectedAction) query = query.eq('tipo_movimentacao', selectedAction)
        if (selectedUser) query = query.eq('usuario_id', selectedUser)
        if (selectedSetor) {
            // Filter by asset sector name if using string, or ID if preferred
            // Assuming setor name for consistency with inventory
            query = query.filter('ativo.setor', 'eq', selectedSetor)
        }

        if (isViewer) {
            if (profile?.setor_id) {
                // Filter by asset sector if it exists
                query = query.filter('ativo.setor_id', 'eq', profile.setor_id)
            } else if (profile?.setor) {
                const sectorName = typeof profile.setor === 'string' ? profile.setor : (profile.setor as any).nome
                if (sectorName) query = query.filter('ativo.setor', 'eq', sectorName)
            }
        }

        const { data, count, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1)

        if (!error && data) {
            setHistorico(data as unknown as Movimentacao[])
            setTotalCount(count || 0)
        }
        setLoading(false)
    }, [selectedAction, selectedUser, selectedSetor])

    useEffect(() => {
        fetchHistorico()

        const channel = supabase.channel('realtime_history_page')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimentacoes' }, () => {
                fetchHistorico()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchHistorico])

    // Client-side search for related fields (simpler than complex joins)
    const filteredHistory = historico.filter(item => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
            (item.observacao || "").toLowerCase().includes(term) ||
            item.ativo?.nome.toLowerCase().includes(term) ||
            item.ativo?.serial.toLowerCase().includes(term) ||
            item.usuario?.full_name?.toLowerCase().includes(term)
        )
    })

    const getActionIcon = (tipo: string) => {
        switch (tipo) {
            case 'CRIAR': return <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            case 'EDITAR': return <Edit3 className="h-4 w-4 text-indigo-500" />
            case 'DELETAR': return <ArrowDownLeft className="h-4 w-4 text-rose-500" />
            case 'MANUTENÇÃO': return <History className="h-4 w-4 text-amber-500" />
            default: return <History className="h-4 w-4 text-slate-400" />
        }
    }

    const getActionBadge = (tipo: string) => {
        switch (tipo) {
            case 'CRIAR': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold uppercase tracking-wider text-[10px]">Cadastro</Badge>
            case 'EDITAR': return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-50 font-bold uppercase tracking-wider text-[10px]">Edição</Badge>
            case 'DELETAR': return <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 font-bold uppercase tracking-wider text-[10px]">Exclusão</Badge>
            case 'MANUTENÇÃO': return <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50 font-bold uppercase tracking-wider text-[10px]">Manutenção</Badge>
            default: return <Badge variant="outline" className="text-[10px] uppercase font-bold">{tipo}</Badge>
        }
    }

    const renderObservation = (obs: string | null) => {
        if (!obs) return <span className="text-slate-400 italic">Sem observações</span>

        if (obs.startsWith("Alterações:")) {
            const changesStr = obs.replace("Alterações: ", "")
            const changes = changesStr.split(" | ")

            return (
                <div className="flex flex-wrap gap-2 mt-1">
                    {changes.map((change, idx) => {
                        const [field, values] = change.split(": ")
                        const [oldVal, newVal] = values ? values.split(" -> ") : ["?", "?"]

                        return (
                            <div key={idx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-medium text-slate-600">
                                <span className="font-bold text-slate-400 uppercase tracking-tighter">{field}</span>
                                <span className="opacity-50 line-through max-w-[60px] truncate">{oldVal}</span>
                                <ChevronRight className="h-2 w-2 text-slate-300" />
                                <span className="text-slate-900 font-bold">{newVal}</span>
                            </div>
                        )
                    })}
                </div>
            )
        }

        return <span className="text-sm font-bold text-slate-900 line-clamp-2">{obs}</span>
    }

    const openAssetHistory = (id: string, nome: string) => {
        setSelectedAsset({ id, nome })
        setModalOpen(true)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-1">Movimentações</h1>
                    <p className="text-slate-500 font-medium">Histórico completo de auditoria de todos os ativos.</p>
                </div>
            </div>

            <HistoryToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedAction={selectedAction}
                onActionChange={setSelectedAction}
                selectedSetor={selectedSetor}
                onSetorChange={setSelectedSetor}
                selectedUser={selectedUser}
                onUserChange={setSelectedUser}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            {viewMode === 'list' ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Data e Hora</th>
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Ação</th>
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Ativo / Evento Detalhado</th>
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Responsável</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-8 py-8"><div className="h-6 bg-slate-100 rounded-xl w-full"></div></td>
                                        </tr>
                                    ))
                                ) : filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 italic">
                                                        {new Intl.DateTimeFormat('pt-BR', {
                                                            day: '2-digit',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        }).format(new Date(item.data_movimentacao))}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono mt-0.5">
                                                        {new Intl.DateTimeFormat('pt-BR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            timeZone: 'America/Campo_Grande'
                                                        }).format(new Date(item.data_movimentacao))}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                                        {getActionIcon(item.tipo_movimentacao)}
                                                    </div>
                                                    {getActionBadge(item.tipo_movimentacao)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    {item.ativo ? (
                                                        <button
                                                            onClick={() => openAssetHistory(item.ativo!.id, item.ativo!.nome)}
                                                            title="Clique para ver toda a Linha do Tempo"
                                                            className="text-xs font-black text-primary uppercase tracking-tighter bg-primary/5 px-3 py-1 rounded-xl w-fit hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group/btn shadow-sm border border-primary/10"
                                                        >
                                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                            {item.ativo.nome} — {item.ativo.serial}
                                                            <ExternalLink className="h-3 w-3 text-primary/40 group-hover/btn:text-primary transition-colors" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evento de Sistema</span>
                                                    )}
                                                    {renderObservation(item.observacao)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-bold text-slate-700">{item.usuario?.full_name || 'Sistema'}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">Auditoria</span>
                                                    </div>
                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                                                        {item.usuario?.avatar_url ? (
                                                            <img src={item.usuario.avatar_url} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs font-black text-slate-500">
                                                                {(item.usuario?.full_name?.[0] || 'S').toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <HistoryCards data={filteredHistory} loading={loading} />
            )}

            {/* Modal de Histórico por Ativo */}
            <AssetActivityModal
                ativoId={selectedAsset?.id || null}
                ativoNome={selectedAsset?.nome || null}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </div>
    )
}
