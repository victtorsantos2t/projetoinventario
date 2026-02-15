"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Software } from "@/types/softwares"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { X, Save, Layers, Package, Plus, Trash2, Key, Monitor, ShoppingCart, Loader2 } from "lucide-react"
import { LicenseManager } from "@/components/license-manager"
import { LicenseActivations } from "@/components/license-activations"
import { PasswordConfirmModal } from "./password-confirm-modal"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"



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
    const [subformActive, setSubformActive] = useState(false)
    const [subformAction, setSubformAction] = useState<(() => void) | null>(null)
    const [subformLoading, setSubformLoading] = useState(false)
    const [subformLabel, setSubformLabel] = useState("")
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
        if (!software) return

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
            setShowDeleteConfirm(false)
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                {/* Header */}
                <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                            <Layers className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-text-primary dark:text-white">
                                {isCreate ? "Novo Software" : isView ? "Detalhes do Software" : "Editar Software"}
                            </DialogTitle>
                            {!isCreate && software && (
                                <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">
                                    {software.nome}
                                </DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* Tabs */}
                {!isCreate && (
                    <div className="px-8 pt-2 border-b border-slate-100 dark:border-white/5 flex gap-8 bg-white dark:bg-zinc-900">
                        <button
                            onClick={() => setActiveTab('geral')}
                            className={`pb-3 text-sm font-black border-b-2 transition-all ${activeTab === 'geral' ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                        >
                            Dados Gerais
                        </button>
                        <button
                            onClick={() => setActiveTab('licencas')}
                            className={`pb-3 text-sm font-black border-b-2 transition-all ${activeTab === 'licencas' ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                Licenças
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('instalacoes')}
                            className={`pb-3 text-sm font-black border-b-2 transition-all ${activeTab === 'instalacoes' ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4" />
                                Instalações
                            </div>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-white dark:bg-zinc-900">
                    {activeTab === 'geral' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Nome do Software</label>
                                <Input
                                    value={form.nome}
                                    onChange={e => handleChange('nome', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="Ex: Microsoft Office 2021"
                                    className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Desenvolvedor</label>
                                <Input
                                    value={form.desenvolvedor}
                                    onChange={e => handleChange('desenvolvedor', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="Ex: Microsoft"
                                    className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Versão</label>
                                <Input
                                    value={form.versao}
                                    onChange={e => handleChange('versao', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="Ex: Professional Plus"
                                    className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Categoria</label>
                                <select
                                    value={form.categoria}
                                    onChange={e => handleChange('categoria', e.target.value)}
                                    disabled={isView || loading}
                                    className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Site / URL</label>
                                <Input
                                    value={form.site_url}
                                    onChange={e => handleChange('site_url', e.target.value)}
                                    disabled={isView || loading}
                                    placeholder="https://..."
                                    className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm"
                                />
                            </div>

                            {!isCreate && software && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Valor Total em Licenças</label>
                                    <div className="h-11 px-4 bg-success-50 dark:bg-success-900/20 border border-success-100 dark:border-success-900/30 rounded-xl flex items-center gap-3">
                                        <ShoppingCart className="h-4 w-4 text-success-600 dark:text-success-400" />
                                        <span className="text-sm font-black text-success-700 dark:text-success-300">
                                            <SoftwareTotalCost softwareId={software.id} />
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Descrição</label>
                                <textarea
                                    value={form.descricao}
                                    onChange={e => handleChange('descricao', e.target.value)}
                                    disabled={isView || loading}
                                    className="w-full min-h-[120px] p-4 rounded-xl border border-transparent bg-neutral-app dark:bg-white/5 text-sm font-medium focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 outline-none transition-all shadow-sm resize-none dark:text-white"
                                    placeholder="Detalhes adicionais sobre o licenciamento ou políticas de uso..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'licencas' && software && (
                        <LicenseManager
                            softwareId={software.id}
                            onFormToggle={(active, action, label, isSaving) => {
                                setSubformActive(active)
                                setSubformAction(() => action)
                                setSubformLabel(label)
                                setSubformLoading(isSaving)
                            }}
                        />
                    )}

                    {activeTab === 'instalacoes' && software && (
                        <LicenseActivations
                            softwareId={software.id}
                            onFormToggle={(active, action, label, isSaving) => {
                                setSubformActive(active)
                                setSubformAction(() => action)
                                setSubformLabel(label)
                                setSubformLoading(isSaving)
                            }}
                        />
                    )}
                </div>

                {/* Footer Padronizado e Contextual */}
                <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-neutral-subtle/20 dark:bg-transparent flex items-center justify-between rounded-b-[2.5rem]">
                    {!isCreate && !isView && !subformActive ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 text-critical-600 bg-critical-50 dark:bg-critical-900/10 hover:bg-critical-100 dark:hover:bg-critical-900/20 rounded-xl text-xs font-black transition-all"
                        >
                            <Trash2 className="h-4 w-4" /> Excluir Software
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-4">
                        <button
                            onClick={subformActive ? () => setSubformActive(false) : onClose}
                            disabled={loading || subformLoading}
                            className="px-6 py-2.5 text-text-secondary dark:text-slate-400 font-bold text-xs hover:bg-neutral-muted dark:hover:bg-white/5 rounded-xl transition-all"
                        >
                            {subformActive ? "Cancelar" : "Cancelar"}
                        </button>
                        {!isView && (
                            <button
                                onClick={subformActive ? (subformAction || undefined) : handleSave}
                                disabled={loading || subformLoading}
                                className="flex items-center gap-3 px-8 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-black hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading || subformLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {subformActive ? (subformLabel || "Salvar") : (isCreate ? "Cadastrar Software" : "Salvar Alterações")}
                            </button>
                        )}
                    </div>
                </div>
            </DialogContent>

            <PasswordConfirmModal
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Confirmar Exclusão"
                description={
                    <span>
                        Você está prestes a excluir o software <strong className="text-slate-700 dark:text-white">&quot;{software?.nome}&quot;</strong>.
                        Todas as licenças e instalações associadas também serão removidas. Esta ação é irreversível.
                    </span>
                }
                onConfirm={handleDelete}
                confirmText="Excluir Software"
            />
        </Dialog>
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
