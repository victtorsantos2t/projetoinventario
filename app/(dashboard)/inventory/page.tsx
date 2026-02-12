"use client"

import { InventoryCards } from "@/components/inventory-cards"
import { InventoryTable } from "@/components/inventory-table"
import { InventoryToolbar } from "@/components/inventory-toolbar"
import { AddAssetModal } from "@/components/add-asset-modal"
import { BulkImportModal } from "@/components/bulk-import-modal"
import { supabase } from "@/lib/supabaseClient"
import { Ativo } from "@/types"
import { useEffect, useState, useCallback, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { logger } from "@/lib/logger"
import { useUser } from "@/contexts/user-context"

function InventoryContent() {
    const { role, profile } = useUser()
    const isViewer = role === 'Visualizador'

    const searchParams = useSearchParams()
    const initialStatus = searchParams.get('status')
    const assetId = searchParams.get('id')

    const [ativos, setAtivos] = useState<Ativo[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [pageSize] = useState(12)
    const [totalCount, setTotalCount] = useState(0)
    const [categories, setCategories] = useState<any[]>([])

    // Filters
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<string | null>(initialStatus)
    const [filterTipo, setFilterTipo] = useState<string | null>(null)
    const [filterSetor, setFilterSetor] = useState<string | null>(null)
    const [filterSaude, setFilterSaude] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    const debouncedSearch = useDebounce(searchTerm, 300)

    const getAtivos = useCallback(async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('ativos')
                .select(`
                    *,
                    dono:profiles (
                        full_name,
                        avatar_url
                    )
                `, { count: 'exact' })
                .order('created_at', { ascending: false })

            // Se tiver um ID específico, ignora a paginação e outros filtros para focar nele
            if (assetId) {
                query = query.eq('id', assetId)
            } else {
                query = query.range(page * pageSize, (page + 1) * pageSize - 1)

                if (isViewer) {
                    const filters = []

                    if (profile?.setor_id) {
                        filters.push(`setor_id.eq.${profile.setor_id}`)
                    } else if (profile?.setor) {
                        const sectorName = typeof profile.setor === 'string' ? profile.setor : (profile.setor as any).nome
                        if (sectorName) filters.push(`setor.eq.${sectorName}`)
                    }

                    if (profile?.full_name) {
                        filters.push(`colaborador.eq.${profile.full_name}`)
                    }

                    if (filters.length > 0) {
                        query = query.or(filters.join(','))
                    }
                } else {
                    if (filterSetor) query = query.eq('setor', filterSetor)
                    if (filterStatus) {
                        query = query.eq('status', filterStatus)
                    } else {
                        // Por padrão, oculta itens 'Baixado' a menos que esteja filtrando/buscando especificamente
                        query = query.neq('status', 'Baixado')
                    }
                    if (filterTipo) query = query.eq('tipo', filterTipo)

                    if (filterSaude) {
                        if (filterSaude === 'healthy') {
                            // Considera null como saudável (100%)
                            query = query.or('saude.gt.70,saude.is.null')
                        } else if (filterSaude === 'warning') {
                            query = query.lte('saude', 70).gt('saude', 30)
                        } else if (filterSaude === 'critical') {
                            query = query.lte('saude', 30)
                        }
                    }

                    if (debouncedSearch) {
                        query = query.or(`nome.ilike.%${debouncedSearch}%,serial.ilike.%${debouncedSearch}%,colaborador.ilike.%${debouncedSearch}%,patrimonio.ilike.%${debouncedSearch}%`)
                    }
                }
            }

            const { data, count, error } = await query

            if (error) throw error
            setAtivos((data || []) as Ativo[])
            setTotalCount(count || 0)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Erro desconhecido"
            logger.error("Erro ao buscar ativos:", msg)
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, filterStatus, filterTipo, filterSetor, filterSaude])

    const getCategories = useCallback(async () => {
        const { data } = await supabase.from('categorias_ativos').select('*')
        if (data) setCategories(data)
    }, [])

    useEffect(() => {
        getAtivos()
        getCategories()
    }, [getAtivos, getCategories])

    // Reset page when filters change
    useEffect(() => {
        setPage(0)
    }, [debouncedSearch, filterStatus, filterTipo, filterSetor, filterSaude])

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-1">Inventário</h1>
                    <p className="text-slate-500 font-medium">Gerencie e rastreie todos os ativos da empresa.</p>
                </div>
                <div className="flex items-center gap-3">
                    {!isViewer && (
                        <>
                            <BulkImportModal />
                            <AddAssetModal />
                        </>
                    )}
                </div>
            </div>

            <InventoryToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedStatus={filterStatus}
                onStatusChange={setFilterStatus}
                selectedTipo={filterTipo}
                onTipoChange={setFilterTipo}
                selectedSetor={filterSetor}
                onSetorChange={setFilterSetor}
                selectedSaude={filterSaude}
                onSaudeChange={setFilterSaude}
                currentPage={page}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                isViewer={isViewer}
            />

            {viewMode === 'grid' ? (
                <InventoryCards data={ativos} loading={loading} onRefresh={getAtivos} categories={categories} highlightId={assetId || undefined} />
            ) : (
                <InventoryTable data={ativos} loading={loading} onRefresh={getAtivos} highlightId={assetId || undefined} />
            )}
        </div>
    )
}

export default function InventoryPage() {
    return (
        <Suspense fallback={
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
        }>
            <InventoryContent />
        </Suspense>
    )
}
