"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Software } from "@/types/softwares"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { X, Save, Layers, Package, Plus, Trash2, Key, Monitor, ShoppingCart } from "lucide-react"
import { LicenseManager } from "@/components/license-manager"
import { LicenseActivations } from "@/components/license-activations"



interface SoftwareModalProps {
    software: Software | null
    open: boolean
    onClose: () => void
    onSuccess: () => void
    mode?: 'view' | 'edit' | 'create'
}

const CATEGORIES = [
    "Sistema Operacional",
    "Office / Produtividade",
    "Design / Criatividade",
    "Utilitário",
    "Antivírus / Segurança",
    "Desenvolvimento",
    "Navegador",
    "Outro"
]

export function SoftwareModal({ software, open, onClose, onSuccess, mode = 'create' }: SoftwareModalProps) {
    const isView = mode === 'view'
    const isCreate = mode === 'create'
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'geral' | 'licencas' | 'instalacoes'>('geral')

    // Form State
    const [form, setForm] = useState({
        nome: "",
        desenvolvedor: "",
        versao: "",
        categoria: "",
        descricao: "",
        site_url: ""
    })

    // Load data
    useEffect(() => {
        if (open) {
            if (software && !isCreate) {
                // Initial load with props
                setForm({
                    nome: software.nome || "",
                    desenvolvedor: software.desenvolvedor || "",
                    versao: software.versao || "",
                    categoria: software.categoria || "",
                    descricao: software.descricao || "",
                    site_url: software.site_url || ""
                })

                // Fetch full details if missing description (from view)
                const fetchFullDetails = async () => {
                    const { data, error } = await supabase
                        .from('softwares')
                        .select('*')
                        .eq('id', software.id)
                        .single()

                    if (data && !error) {
                        setForm({
                            nome: data.nome,
                            desenvolvedor: data.desenvolvedor || "",
                            versao: data.versao || "",
                            categoria: data.categoria || "",
                            descricao: data.descricao || "",
                            site_url: data.site_url || ""
                        })
                    }
                }
                fetchFullDetails()
            } else {
                // Reset
                setForm({
                    nome: "",
                    desenvolvedor: "",
                    versao: "",
                    categoria: "",
                    descricao: "",
                    site_url: ""
                })
            }
            setActiveTab('geral')
        }
    }, [software, open, isCreate])

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }


    const handleSave = async () => {
        if (!form.nome) {
            toast.error("Nome do software é obrigatório")
            return
        }

        setLoading(true)
        try {
            if (isCreate) {
                const { error } = await supabase.from('softwares').insert(form)
                if (error) throw error
                toast.success("Software cadastrado com sucesso!")
            } else if (software) {
                const { error } = await supabase.from('softwares').update(form).eq('id', software.id)
                if (error) throw error
                toast.success("Software atualizado com sucesso!")
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao salvar software: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!software || !confirm("Tem certeza que deseja excluir este software? Todas as licenças vinculadas serão removidas.")) return

        setLoading(true)
        try {
            const { error } = await supabase.from('softwares').delete().eq('id', software.id)
            if (error) throw error
            toast.success("Software excluído!")
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">
                            {isCreate ? "Novo Software" : isView ? "Detalhes do Software" : "Editar Software"}
                        </h2>
                        {!isCreate && software && <p className="text-xs text-slate-400 font-medium">{software.nome}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Tabs (Apenas se não for Create) */}
                {!isCreate && (
                    <div className="px-6 pt-2 border-b border-slate-100 flex gap-6">
                        <button
                            onClick={() => setActiveTab('geral')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'geral' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Dados Gerais
                        </button>
                        <button
                            onClick={() => setActiveTab('licencas')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'licencas' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5" />
                                Licenças
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('instalacoes')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'instalacoes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Monitor className="h-3.5 w-3.5" />
                                Instalações
                            </div>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 space-y-5">
                    {activeTab === 'geral' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 ml-1">Nome do Software</label>
                                <Input
                                    value={form.nome}
                                    onChange={e => handleChange('nome', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="Ex: Microsoft Office 2021"
                                    className="bg-slate-50/50 border-slate-200"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Desenvolvedor</label>
                                <Input
                                    value={form.desenvolvedor}
                                    onChange={e => handleChange('desenvolvedor', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="Ex: Microsoft"
                                    className="bg-slate-50/50 border-slate-200"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Versão</label>
                                <Input
                                    value={form.versao}
                                    onChange={e => handleChange('versao', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="Ex: Professional Plus"
                                    className="bg-slate-50/50 border-slate-200"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Categoria</label>
                                <select
                                    value={form.categoria}
                                    onChange={e => handleChange('categoria', e.target.value)}
                                    disabled={isView || loading}
                                    className="w-full h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-md text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none"
                                >
                                    <option value="">Selecione...</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Site / URL</label>
                                <Input
                                    value={form.site_url}
                                    onChange={e => handleChange('site_url', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="https://..."
                                    className="bg-slate-50/50 border-slate-200"
                                />
                            </div>

                            {!isCreate && software && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Valor Total em Licenças</label>
                                    <div className="h-10 px-3 bg-emerald-50 border border-emerald-100 rounded-md flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4 text-emerald-500" />
                                        <span className="text-sm font-black text-emerald-700">
                                            <SoftwareTotalCost softwareId={software.id} />
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 ml-1">Descrição</label>
                                <textarea
                                    value={form.descricao}
                                    onChange={e => handleChange('descricao', e.target.value)}
                                    disabled={isView || loading}
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 resize-y"
                                    placeholder="Detalhes adicionais..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'licencas' && software && (
                        <LicenseManager softwareId={software.id} />
                    )}

                    {activeTab === 'instalacoes' && software && (
                        <LicenseActivations softwareId={software.id} />
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
                    {!isCreate && !isView ? (
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                        >
                            <Trash2 className="h-4 w-4" /> Excluir
                        </button>
                    ) : <div></div>}

                    <div className="flex  gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        {!isView && (
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {isCreate ? "Cadastrar Software" : "Salvar Alterações"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function SoftwareTotalCost({ softwareId }: { softwareId: string }) {
    const [total, setTotal] = useState<number | null>(null)

    useEffect(() => {
        const fetchTotal = async () => {
            const { data, error } = await supabase
                .from('licencas')
                .select('custo')
                .eq('software_id', softwareId)

            if (!error && data) {
                const sum = data.reduce((acc, curr) => acc + (Number(curr.custo) || 0), 0)
                setTotal(sum)
            }
        }
        fetchTotal()
    }, [softwareId])

    if (total === null) return "Calculando..."
    return `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}
