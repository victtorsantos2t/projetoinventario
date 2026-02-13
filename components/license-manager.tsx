"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Licenca } from "@/types/softwares"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
    Key, Calendar, Plus, Trash2, Edit2, Check, X,
    AlertCircle, FileText, ShoppingCart, Monitor
} from "lucide-react"

interface LicenseManagerProps {
    softwareId: string
}

export function LicenseManager({ softwareId }: LicenseManagerProps) {
    const [licencas, setLicencas] = useState<Licenca[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [form, setForm] = useState({
        chave_licenca: "",
        tipo: "Perpétua",
        qtd_adquirida: 1,
        data_compra: "",
        data_expiracao: "",
        custo: "",
        fornecedor: "",
        obs: ""
    })

    const fetchLicenses = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('licencas')
                .select('*')
                .eq('software_id', softwareId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setLicencas(data as any)
        } catch (error: any) {
            toast.error("Erro ao carregar licenças: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (softwareId) fetchLicenses()
    }, [softwareId])

    const resetForm = () => {
        setForm({
            chave_licenca: "",
            tipo: "Perpétua",
            qtd_adquirida: 1,
            data_compra: "",
            data_expiracao: "",
            custo: "",
            fornecedor: "",
            obs: ""
        })
        setIsAdding(false)
        setEditingId(null)
    }

    const handleEdit = (licenca: Licenca) => {
        setForm({
            chave_licenca: licenca.chave_licenca || "",
            tipo: licenca.tipo,
            qtd_adquirida: licenca.qtd_adquirida,
            data_compra: licenca.data_compra || "",
            data_expiracao: licenca.data_expiracao || "",
            custo: licenca.custo ? String(licenca.custo) : "",
            fornecedor: licenca.fornecedor || "",
            obs: licenca.obs || ""
        })
        setEditingId(licenca.id)
        setIsAdding(true)
    }

    const handleSave = async () => {
        if (!form.tipo) {
            toast.error("Tipo de licença é obrigatório")
            return
        }

        try {
            const payload = {
                software_id: softwareId,
                chave_licenca: form.chave_licenca || null,
                tipo: form.tipo,
                qtd_adquirida: Number(form.qtd_adquirida) || 1,
                data_compra: form.data_compra || null,
                data_expiracao: form.data_expiracao || null,
                custo: form.custo ? parseFloat(form.custo) : null,
                fornecedor: form.fornecedor || null,
                obs: form.obs || null
            }

            if (editingId) {
                const { error } = await supabase.from('licencas').update(payload).eq('id', editingId)
                if (error) throw error
                toast.success("Licença atualizada!")
            } else {
                const { error } = await supabase.from('licencas').insert(payload)
                if (error) throw error
                toast.success("Licença adicionada!")
            }
            fetchLicenses()
            resetForm()
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta licença permanentemente?")) return
        try {
            const { error } = await supabase.from('licencas').delete().eq('id', id)
            if (error) throw error
            toast.success("Licença removida!")
            fetchLicenses()
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Key className="h-4 w-4 text-indigo-500" />
                    Licenças Vinculadas
                </h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" /> Adicionar Licença
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="p-4 bg-slate-50 border border-indigo-100 rounded-xl mb-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="md:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Chave / Serial</label>
                            <Input
                                value={form.chave_licenca}
                                onChange={e => setForm({ ...form, chave_licenca: e.target.value })}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                className="bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400">Tipo</label>
                            <select
                                value={form.tipo}
                                onChange={e => setForm({ ...form, tipo: e.target.value })}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm"
                            >
                                <option value="Perpétua">Perpétua</option>
                                <option value="Assinatura Anual">Assinatura Anual</option>
                                <option value="Mensal">Mensal</option>
                                <option value="Trial">Trial</option>
                                <option value="Volume">Volume</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400">Qtd. Instalações</label>
                            <Input
                                type="number"
                                min="1"
                                value={form.qtd_adquirida}
                                onChange={e => setForm({ ...form, qtd_adquirida: parseInt(e.target.value) })}
                                className="bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400">Data Compra</label>
                            <Input
                                type="date"
                                value={form.data_compra}
                                onChange={e => setForm({ ...form, data_compra: e.target.value })}
                                className="bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400">Vencimento</label>
                            <Input
                                type="date"
                                value={form.data_expiracao}
                                onChange={e => setForm({ ...form, data_expiracao: e.target.value })}
                                className="bg-white"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Observações</label>
                            <Input
                                value={form.obs}
                                onChange={e => setForm({ ...form, obs: e.target.value })}
                                placeholder="Notas fiscais, fornecedor..."
                                className="bg-white"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={resetForm} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">
                            {editingId ? "Salvar Alterações" : "Adicionar Licença"}
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {licencas.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-xs">Nenhuma licença cadastrada para este software.</p>
                    </div>
                ) : (
                    licencas.map(lic => (
                        <div key={lic.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-100 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${lic.tipo.includes('Perpétua') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            lic.tipo.includes('Assinatura') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {lic.tipo}
                                        </span>
                                        {lic.data_expiracao && (
                                            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                                <Calendar className="h-3 w-3" />
                                                Expira em {new Date(lic.data_expiracao).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-mono text-sm text-slate-700 font-bold bg-slate-50 px-2 py-1 rounded w-fit select-all">
                                        {lic.chave_licenca || "Sem chave (Licença de Volume)"}
                                    </p>
                                    <div className="flex gap-4 text-xs text-slate-400 mt-2 flex-wrap items-center">
                                        <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-bold border border-slate-200" title="Quantidade de instalações permitidas">
                                            <Monitor className="h-3.5 w-3.5 text-slate-500" />
                                            {lic.qtd_adquirida} Instalações
                                        </span>
                                        {lic.data_compra && (
                                            <span className="flex items-center gap-1.5 px-2 py-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Compra: {new Date(lic.data_compra).toLocaleDateString()}
                                            </span>
                                        )}
                                        {lic.obs && <span className="italic truncate max-w-[200px] px-2 py-1 border-l border-slate-200">{lic.obs}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(lic)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(lic.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
