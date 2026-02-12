"use client"

import { Search, Filter, LayoutGrid, List, X, UserPlus, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Setor } from "@/types"
import { cn } from "@/lib/utils"

interface UsersToolbarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    sectorFilter: string
    onSectorFilterChange: (value: string) => void
    statusFilter: string
    onStatusFilterChange: (value: string) => void
    viewMode: 'grid' | 'list'
    onViewModeChange: (mode: 'grid' | 'list') => void
    totalUsers: number
}

export function UsersToolbar({
    searchTerm,
    onSearchChange,
    sectorFilter,
    onSectorFilterChange,
    statusFilter,
    onStatusFilterChange,
    viewMode,
    onViewModeChange,
    totalUsers
}: UsersToolbarProps) {
    const [setores, setSetores] = useState<Setor[]>([])
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        async function fetchSectors() {
            const { data } = await supabase.from('setores').select('*').order('nome')
            if (data) setSetores(data)
        }
        fetchSectors()
    }, [])

    const activeFiltersCount = [
        sectorFilter !== 'all',
        statusFilter !== 'all'
    ].filter(Boolean).length

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10 rounded-2xl border-slate-200 h-12 bg-white shadow-sm focus:ring-primary/20"
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-12 px-5 rounded-2xl flex gap-2 font-bold border-slate-200 shadow-sm transition-all ${showFilters ? "bg-slate-100 border-slate-300" : "bg-white"
                            }`}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Filtros</span>
                        {activeFiltersCount > 0 && (
                            <Badge className="ml-1 bg-primary text-white h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </Button>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner border border-slate-200/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewModeChange('grid')}
                            className={cn(
                                "h-9 w-12 rounded-xl transition-all",
                                viewMode === 'grid'
                                    ? "bg-white shadow-sm border border-slate-200/50 text-slate-700"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewModeChange('list')}
                            className={cn(
                                "h-9 w-12 rounded-xl transition-all",
                                viewMode === 'list'
                                    ? "bg-white shadow-sm border border-slate-200/50 text-slate-700"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {totalUsers} Colaboradores
                    </div>
                </div>
            </div>

            {showFilters && (
                <div className="flex flex-wrap items-center gap-3 p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-1.5 min-w-[180px]">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Status</label>
                        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200">
                                <SelectValue placeholder="Todos Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Todos Status</SelectItem>
                                <SelectItem value="Ativo">Ativos</SelectItem>
                                <SelectItem value="Inativo">Inativos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Setor</label>
                        <Select value={sectorFilter} onValueChange={onSectorFilterChange}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200">
                                <SelectValue placeholder="Todos Setores" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Todos Setores</SelectItem>
                                {setores.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {(sectorFilter !== 'all' || statusFilter !== 'all') && (
                        <div className="flex items-end self-end mb-0.5">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    onSectorFilterChange('all')
                                    onStatusFilterChange('all')
                                }}
                                className="text-xs font-bold text-slate-400 hover:text-primary h-10 px-4 rounded-xl"
                            >
                                Limpar Filtros
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
