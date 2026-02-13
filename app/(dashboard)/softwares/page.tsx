"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Software } from "@/types/softwares"
import { SoftwareModal } from "@/components/software-modal"
import { useUser } from "@/contexts/user-context"
import { AppWindow, Plus, Search, Filter, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function SoftwaresPage() {
    const { profile } = useUser()
    const isViewer = profile?.role === 'Viewer'

    // State
    const [softwares, setSoftwares] = useState<Software[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null)
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('create')

    const fetchSoftwares = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('v_softwares_overview')
                .select('*')
                .order('nome', { ascending: true })

            if (error) throw error

            // Map view fields to Software interface
            const mapped = data.map((item: any) => ({
                id: item.software_id,
                nome: item.nome,
                versao: item.versao,
                desenvolvedor: item.desenvolvedor,
                categoria: item.categoria,
                created_at: '', // Not in view but optional
                total_licencas: item.total_licencas,
                total_instancias_permitidas: item.total_instancias_permitidas,
                total_instalado: item.total_instalado,
                licencas_disponiveis: item.licencas_disponiveis,
                descricao: null,
                site_url: null
            }))

            setSoftwares(mapped)
        } catch (error: any) {
            console.error("Erro detalhado:", error)
            if (error.code === '42P01') {
                toast.error("Tabela ou View não encontrada. Por favor, execute o script SQL 'fase4_softwares.sql'.")
            } else {
                toast.error(`Erro ao carregar softwares: ${error.message || error.code || 'Erro desconhecido'}`)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSoftwares()
    }, [])

    const handleCreate = () => {
        setSelectedSoftware(null)
        setModalMode('create')
        setModalOpen(true)
    }

    const handleEdit = (software: Software) => {
        setSelectedSoftware(software)
        setModalMode(isViewer ? 'view' : 'edit')
        setModalOpen(true)
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <AppWindow className="h-7 w-7 text-indigo-500" />
                        Gestão de Softwares
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Controle de licenciamento e inventário de aplicações
                    </p>
                </div>

                {!isViewer && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Novo Software
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome, desenvolvedor ou versão..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 bg-white border-slate-200 h-11 rounded-xl"
                    />
                </div>
                {/* Future: Categoria filter */}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 text-sm font-bold">Carregando catálogo...</p>
                </div>
            ) : softwares.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <AppWindow className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700">Nenhum software cadastrado</h3>
                    <p className="text-slate-400 text-sm mt-1 mb-4">Comece adicionando os softwares utilizados na empresa.</p>
                    {!isViewer && (
                        <button onClick={handleCreate} className="text-indigo-600 font-bold text-sm hover:underline">
                            + Adicionar Primeiro Software
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Software</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Desenvolvedor</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider text-center">Licenças</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider text-center">Instalações</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider text-center">Disponível</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {softwares
                                    .filter(s =>
                                        s.nome.toLowerCase().includes(search.toLowerCase()) ||
                                        (s.desenvolvedor || "").toLowerCase().includes(search.toLowerCase())
                                    )
                                    .map((software) => (
                                        <tr
                                            key={software.id}
                                            onClick={() => handleEdit(software)}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-800">{software.nome}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-slate-500">{software.versao || "N/A"}</span>
                                                        {software.categoria && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-tight border border-slate-200">
                                                                {software.categoria}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {software.desenvolvedor || "—"}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                                    {software.total_instancias_permitidas || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-slate-600 font-bold">{software.total_instalado || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {(() => {
                                                    const disponivel = software.licencas_disponiveis || 0
                                                    const total = software.total_instancias_permitidas || 0

                                                    if (total === 0) return <span className="text-slate-300 text-xs">—</span>

                                                    if (disponivel < 0) {
                                                        return (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                {disponivel} (Excesso)
                                                            </div>
                                                        )
                                                    }

                                                    if (disponivel === 0) {
                                                        return (
                                                            <span className="text-amber-500 font-bold text-xs">Esgotado</span>
                                                        )
                                                    }

                                                    return (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {disponivel} Livre(s)
                                                        </div>
                                                    )
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-indigo-600 font-bold text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <SoftwareModal
                software={selectedSoftware}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={fetchSoftwares}
                mode={modalMode}
            />
        </div>
    )
}
