"use client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, LayoutGrid, List, ChevronLeft, ChevronRight, X } from "lucide-react"
import { STATUS_OPTIONS, STATUS_COLORS } from "@/lib/constants"
import { Setor } from "@/types"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface InventoryToolbarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    selectedStatus: string | null
    onStatusChange: (value: string | null) => void
    selectedTipo: string | null
    onTipoChange: (value: string | null) => void
    selectedSetor: string | null
    onSetorChange: (value: string | null) => void
    selectedSaude: string | null
    onSaudeChange: (value: string | null) => void
    currentPage: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
    viewMode: 'grid' | 'list'
    onViewModeChange: (mode: 'grid' | 'list') => void
    isViewer?: boolean
}

const SAUDE_OPTIONS = [
    { label: 'Excelente (0-1 manut.)', value: 'Excelente' },
    { label: 'Alerta (2-4 manut.)', value: 'Alerta' },
    { label: 'Crítico (5+ manut.)', value: 'Crítico' },
]

export function InventoryToolbar({
    searchTerm,
    onSearchChange,
    selectedStatus,
    onStatusChange,
    selectedTipo,
    onTipoChange,
    selectedSetor,
    onSetorChange,
    selectedSaude,
    onSaudeChange,
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    viewMode,
    onViewModeChange,
    isViewer = false,
}: InventoryToolbarProps) {
    const [setores, setSetores] = useState<Setor[]>([])
    const [tipos, setTipos] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)

    const totalPages = Math.ceil(totalItems / pageSize)

    useEffect(() => {
        async function fetchFilterOptions() {
            // Fetch setores
            const { data: setoresData } = await supabase
                .from('setores')
                .select('id, nome')
                .order('nome')
            if (setoresData) setSetores(setoresData)

            // Fetch tipos únicos cadastrados
            const { data: tiposData } = await supabase
                .from('ativos')
                .select('tipo')
            if (tiposData) {
                const uniqueTipos = [...new Set(tiposData.map(a => a.tipo).filter(Boolean))].sort()
                setTipos(uniqueTipos)
            }
        }
        fetchFilterOptions()
    }, [])

    const activeFiltersCount = [selectedStatus, selectedTipo, selectedSetor, selectedSaude].filter(Boolean).length

    const clearAllFilters = () => {
        onStatusChange(null)
        onTipoChange(null)
        onSetorChange(null)
        onSaudeChange(null)
    }

    return (
        <div className="space-y-4">
            {/* Search + Filter Toggle + View Mode */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {!isViewer && (
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <Input
                            placeholder="Buscar por nome, serial, colaborador..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10 rounded-xl border-slate-200 h-11 bg-white dark:bg-zinc-900 shadow-sm ring-offset-background placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/20 transition-all font-medium"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {!isViewer && (
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`
                                flex items-center gap-2 h-11 px-4 rounded-xl border text-sm font-bold transition-all
                                ${showFilters || activeFiltersCount > 0
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/20'
                                    : 'bg-white dark:bg-zinc-900 text-text-secondary border-slate-200 hover:bg-neutral-subtle dark:hover:bg-white/5 shadow-sm'}
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
                    )}

                    <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <button
                            onClick={() => onViewModeChange('grid')}
                            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-text-muted hover:text-text-primary'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onViewModeChange('list')}
                            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-text-muted hover:text-text-primary'}`}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Status */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Status
                            </label>
                            <select
                                value={selectedStatus || ""}
                                onChange={(e) => onStatusChange(e.target.value || null)}
                                className="w-full h-10 px-3 bg-neutral-subtle dark:bg-white/5 border border-slate-200 rounded-xl text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600/30 transition-all outline-none"
                            >
                                <option value="">Todos os status</option>
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tipo */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Tipo de Ativo
                            </label>
                            <select
                                value={selectedTipo || ""}
                                onChange={(e) => onTipoChange(e.target.value || null)}
                                className="w-full h-10 px-3 bg-neutral-subtle dark:bg-white/5 border border-slate-200 rounded-xl text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600/30 transition-all outline-none"
                            >
                                <option value="">Todos os tipos</option>
                                {tipos.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Setor */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Setor
                            </label>
                            <select
                                value={selectedSetor || ""}
                                onChange={(e) => onSetorChange(e.target.value || null)}
                                className="w-full h-10 px-3 bg-neutral-subtle dark:bg-white/5 border border-slate-200 rounded-xl text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600/30 transition-all outline-none"
                            >
                                <option value="">Todos os setores</option>
                                {setores.map(s => (
                                    <option key={s.id} value={s.nome}>{s.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Saúde */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Saúde do Equipamento
                            </label>
                            <select
                                value={selectedSaude || ""}
                                onChange={(e) => onSaudeChange(e.target.value || null)}
                                className="w-full h-10 px-3 bg-neutral-subtle dark:bg-white/5 border border-slate-200 rounded-xl text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600/30 transition-all outline-none"
                            >
                                <option value="">Todas</option>
                                {SAUDE_OPTIONS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Active filter pills */}
                    {activeFiltersCount > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                            {selectedStatus && (
                                <Badge
                                    variant="outline"
                                    className="pl-2.5 pr-1.5 py-1 gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs rounded-full cursor-pointer hover:bg-emerald-100 transition-colors"
                                    onClick={() => onStatusChange(null)}
                                >
                                    Status: {selectedStatus}
                                    <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                            {selectedTipo && (
                                <Badge
                                    variant="outline"
                                    className="pl-2.5 pr-1.5 py-1 gap-1 bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
                                    onClick={() => onTipoChange(null)}
                                >
                                    Tipo: {selectedTipo}
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
                            {selectedSaude && (
                                <Badge
                                    variant="outline"
                                    className="pl-2.5 pr-1.5 py-1 gap-1 bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                                    onClick={() => onSaudeChange(null)}
                                >
                                    Saúde: {SAUDE_OPTIONS.find(s => s.value === selectedSaude)?.label.split(' ')[0]}
                                    <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400">
                        Mostrando {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalItems)} de {totalItems}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className="h-9 w-9 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-text-muted hover:bg-neutral-subtle dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = currentPage < 3 ? i : currentPage - 2 + i
                            if (page >= totalPages) return null
                            return (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${page === currentPage
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                        : 'text-text-muted hover:bg-neutral-subtle dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
                                        }`}
                                >
                                    {page + 1}
                                </button>
                            )
                        })}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="h-9 w-9 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-text-muted hover:bg-neutral-subtle dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
