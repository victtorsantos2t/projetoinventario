"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { LicencaInstalacao, Licenca } from "@/types/softwares"
import { Ativo } from "@/types"
import { toast } from "sonner"
import { Monitor, Calendar, Plus, Trash2, Search, Laptop, Key, X } from "lucide-react"
import { PasswordConfirmModal } from "./password-confirm-modal"

interface LicenseActivationsProps {
    softwareId: string
    onFormToggle?: (active: boolean, action: () => void, label: string, isSaving: boolean) => void
}

export function LicenseActivations({ softwareId, onFormToggle }: LicenseActivationsProps) {
    const [instalacoes, setInstalacoes] = useState<LicencaInstalacao[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [idToDelete, setIdToDelete] = useState<string | null>(null)

    // Data for selection
    const [licencasDisponiveis, setLicencasDisponiveis] = useState<Licenca[]>([])
    const [ativos, setAtivos] = useState<Ativo[]>([])

    // Form State
    const [selectedLicenca, setSelectedLicenca] = useState("")
    const [selectedAtivo, setSelectedAtivo] = useState("")
    const [searchTerm, setSearchTerm] = useState("")

    // Notify parent about form state
    useEffect(() => {
        if (onFormToggle) {
            onFormToggle(isAdding, handleAdd, "Confirmar Instalação", saving)
        }
    }, [isAdding, saving, onFormToggle, selectedLicenca, selectedAtivo])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Installations
            const { data: instData, error: instError } = await supabase
                .from('licencas_ativos')
                .select(`
                    *,
                    ativo:ativos!inner ( id, nome, serial, colaborador ),
                    licenca:licencas!inner ( id, software_id, chave_licenca, tipo )
                `)
                .eq('licenca.software_id', softwareId) // Filter by software via join

            if (instError) throw instError
            setInstalacoes(instData as any)

            // 2. Fetch Licenses for dropdown
            const { data: licData } = await supabase
                .from('licencas')
                .select('*')
                .eq('software_id', softwareId)

            if (licData) setLicencasDisponiveis(licData as any)

        } catch (error: any) {
            console.error("Erro ao carregar instalações:", error)
            toast.error("Erro ao carregar dados")
        } finally {
            setLoading(false)
        }
    }

    const fetchAtivos = async () => {
        const { data } = await supabase
            .from('ativos')
            .select('*')
            .in('status', ['Em uso', 'Disponível'])
            .order('nome')
        if (data) setAtivos(data as any)
    }

    useEffect(() => {
        if (softwareId) fetchData()
    }, [softwareId])

    useEffect(() => {
        if (isAdding) fetchAtivos()
    }, [isAdding])

    const handleAdd = async () => {
        if (!selectedLicenca) {
            toast.error("Erro: Você deve selecionar uma licença para continuar.")
            return
        }
        if (!selectedAtivo) {
            toast.error("Erro: Selecione um computador para instalar.")
            return
        }

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase.from('licencas_ativos').insert({
                licenca_id: selectedLicenca,
                ativo_id: selectedAtivo,
                usuario_instalou: user?.id
            })

            if (error) {
                if (error.code === '23505') throw new Error("Esta licença já está instalada neste ativo!")
                throw error
            }

            toast.success("Licença vinculada com sucesso!")
            setIsAdding(false)
            setSelectedLicenca("")
            setSelectedAtivo("")
            setSearchTerm("")
            fetchData()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const confirmRemove = (id: string) => {
        setIdToDelete(id)
        setShowDeleteConfirm(true)
    }

    const executeRemove = async () => {
        if (!idToDelete) return
        try {
            const { error } = await supabase.from('licencas_ativos').delete().eq('id', idToDelete)
            if (error) throw error
            toast.success("Vínculo removido!")
            fetchData()
        } catch (error: any) {
            toast.error("Erro ao remover: " + error.message)
        } finally {
            setShowDeleteConfirm(false)
            setIdToDelete(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-indigo-500" />
                    Ativos com este Software
                </h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" /> Vincular Instalação
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="p-4 bg-slate-50 border border-indigo-100 rounded-xl mb-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400">Licença para usar</label>
                            <select
                                value={selectedLicenca}
                                onChange={e => {
                                    setSelectedLicenca(e.target.value)
                                    // Reset ativo se mudar a licença para evitar inconsistência
                                    setSelectedAtivo("")
                                    setSearchTerm("")
                                }}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm"
                            >
                                <option value="">Selecione uma licença...</option>
                                {licencasDisponiveis.map(lic => {
                                    // Calcula instalações desta licença específica
                                    const instaladas = instalacoes.filter(i => i.licenca_id === lic.id).length
                                    const disponivel = (lic.qtd_adquirida || 0) - instaladas > 0

                                    return (
                                        <option key={lic.id} value={lic.id} disabled={!disponivel && (lic.qtd_adquirida || 0) > 0}>
                                            {lic.tipo} - {lic.chave_licenca ? `...${lic.chave_licenca.slice(-5)}` : "(S/ Chave)"}
                                            ({instaladas}/{lic.qtd_adquirida || 0} usados)
                                            {!disponivel && (lic.qtd_adquirida || 0) > 0 ? " - Esgotada" : ""}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className="relative">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Ativo para instalar</label>
                            {selectedAtivo ? (
                                <div className="flex items-center justify-between w-full h-10 px-3 bg-white border border-indigo-200 rounded-md text-sm shadow-sm">
                                    <span className="truncate font-medium text-slate-700">
                                        {ativos.find(a => a.id === selectedAtivo)?.nome}
                                        <span className="text-slate-400 font-normal ml-2">
                                            {ativos.find(a => a.id === selectedAtivo)?.colaborador}
                                        </span>
                                    </span>
                                    <button
                                        onClick={() => {
                                            setSelectedAtivo("")
                                            setSearchTerm("")
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Buscar computador..."
                                        className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                    />
                                    {searchTerm && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {ativos
                                                .filter(a => {
                                                    const match = (a.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                        (a.colaborador || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                        (a.serial || "").toLowerCase().includes(searchTerm.toLowerCase())

                                                    // Filtrar se já tem a licença selecionada
                                                    if (selectedLicenca) {
                                                        const jaTem = instalacoes.some(i => i.licenca_id === selectedLicenca && i.ativo_id === a.id)
                                                        if (jaTem) return false
                                                    }
                                                    return match
                                                })
                                                .slice(0, 10)
                                                .map(ativo => (
                                                    <div
                                                        key={ativo.id}
                                                        onClick={() => {
                                                            setSelectedAtivo(ativo.id)
                                                            setSearchTerm("")
                                                        }}
                                                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                    >
                                                        <p className="font-bold text-sm text-slate-700">{ativo.nome}</p>
                                                        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                                                            <span>{ativo.colaborador || "Sem dono"}</span>
                                                            <span>{ativo.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            {ativos.filter(a => (a.nome || "").toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                <div className="px-4 py-3 text-xs text-slate-400 text-center">
                                                    Nenhum ativo encontrado
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {instalacoes.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-xs">Nenhuma instalação registrada.</p>
                    </div>
                ) : (
                    instalacoes.map(inst => (
                        <div key={inst.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-100 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <Laptop className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">{inst.ativo?.nome}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>{inst.ativo?.colaborador || "Sem responsável"}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Key className="h-3 w-3" />
                                            {inst.licenca?.tipo || 'Tipo Indefinido'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div className="text-xs text-slate-400">
                                    <p>Instalado em</p>
                                    <p className="font-bold text-slate-600">{new Date(inst.data_instalacao).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={() => confirmRemove(inst.id)}
                                    className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <PasswordConfirmModal
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Confirmar Remoção de Instalação"
                description="Remover esta instalação fará com que o ativo deixe de estar licenciado para este software."
                onConfirm={executeRemove}
                confirmText="Remover Instalação"
            />
        </div >
    )
}
