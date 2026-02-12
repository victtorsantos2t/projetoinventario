"use client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, LayoutGrid, List, X } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface HistoryToolbarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    selectedAction: string | null
    onActionChange: (value: string | null) => void
    selectedSetor: string | null
    onSetorChange: (value: string | null) => void
    selectedUser: string | null
    onUserChange: (value: string | null) => void
    viewMode: 'grid' | 'list'
    onViewModeChange: (mode: 'grid' | 'list') => void
}

const ACTION_OPTIONS = ['CRIAR', 'EDITAR', 'DELETAR', 'ENTREGA', 'DEVOLUÇÃO', 'MANUTENÇÃO']

export function HistoryToolbar({
    searchTerm,
    onSearchChange,
    selectedAction,
    onActionChange,
    selectedSetor,
    onSetorChange,
    selectedUser,
    onUserChange,
    viewMode,
    onViewModeChange,
}: HistoryToolbarProps) {
    const [users, setUsers] = useState<{ id: string, full_name: string }[]>([])
    const [setores, setSetores] = useState<{ id: string, nome: string }[]>([])
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        async function fetchInitialData() {
            const { data: sectorsData } = await supabase
                .from('setores')
                .select('id, nome')
                .order('nome')
            if (sectorsData) setSetores(sectorsData)
        }
        fetchInitialData()
    }, [])

    useEffect(() => {
        async function fetchUsers() {
            let query = supabase
                .from('profiles')
                .select('id, full_name, setor_id')
                .order('full_name')

            if (selectedSetor) {
                const sector = setores.find(s => s.nome === selectedSetor)
                if (sector) {
                    query = query.eq('setor_id', sector.id)
                }
            }

            const { data } = await query
            if (data) setUsers(data as { id: string, full_name: string }[])
        }
        fetchUsers()
    }, [selectedSetor, setores])

    const activeFiltersCount = [selectedAction, selectedSetor, selectedUser].filter(Boolean).length

    const clearAllFilters = () => {
        onActionChange(null)
        onSetorChange(null)
        onUserChange(null)
    }

    return (
        <div className="space-y-4">
            {/* Search + Filter Toggle + View Mode */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por observação, ativo ou usuário..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`
                            flex items-center gap-2 h-11 px-4 rounded-xl border text-sm font-bold transition-all
                            ${showFilters || activeFiltersCount > 0
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'}
                        `}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                        {activeFiltersCount > 0 && (
                            <span className="h-5 w-5 rounded-full bg-white/20 text-[10px] font-black flex items-center justify-center">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>

                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <button
                            onClick={() => onViewModeChange('grid')}
                            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Visualização em Grade"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onViewModeChange('list')}
                            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Visualização em Lista"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Filters Panel */}
            {showFilters && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700">Filtros Rápidos</h3>
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={clearAllFilters}
                                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                            >
                                <X className="h-3 w-3" />
                                Limpar todos
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Action Filter */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Ação
                            </label>
                            <select
                                value={selectedAction || ""}
                                onChange={(e) => onActionChange(e.target.value || null)}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            >
                                <option value="">Todas as ações</option>
                                {ACTION_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sector Filter */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Setor
                            </label>
                            <select
                                value={selectedSetor || ""}
                                onChange={(e) => onSetorChange(e.target.value || null)}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            >
                                <option value="">Todos os setores</option>
                                {setores.map(s => (
                                    <option key={s.id} value={s.nome}>{s.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* User Filter */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Responsável
                            </label>
                            <select
                                value={selectedUser || ""}
                                onChange={(e) => onUserChange(e.target.value || null)}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            >
                                <option value="">Todos os usuários</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Active filter pills */}
                    {activeFiltersCount > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                            {selectedAction && (
                                <Badge
                                    variant="outline"
                                    className="pl-2.5 pr-1.5 py-1 gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs rounded-full cursor-pointer hover:bg-indigo-100 transition-colors"
                                    onClick={() => onActionChange(null)}
                                >
                                    Ação: {selectedAction}
                                    <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                            {selectedSetor && (
                                <Badge
                                    variant="outline"
                                    className="pl-2.5 pr-1.5 py-1 gap-1 bg-purple-50 text-purple-700 border-purple-200 font-bold text-xs rounded-full cursor-pointer hover:bg-purple-100 transition-colors"
                                    onClick={() => onSetorChange(null)}
                                >
                                    Setor: {selectedSetor}
                                    <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                            {selectedUser && (
                                <Badge
                                    variant="outline"
                                    className="pl-2.5 pr-1.5 py-1 gap-1 bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                                    onClick={() => onUserChange(null)}
                                >
                                    Responsável: {users.find(u => u.id === selectedUser)?.full_name || 'Usuário'}
                                    <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
