"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Tags, Plus, Trash2, CalendarClock, PackageSearch, Save, Edit2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export function AssetCustomization() {
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [newName, setNewName] = useState("")
    const [newDepreciation, setNewDepreciation] = useState(36)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editDepreciation, setEditDepreciation] = useState(36)

    async function fetchCategories() {
        const { data, error } = await supabase
            .from('categorias_ativos')
            .select('*')
            .order('nome')
        if (!error && data) setCategories(data)
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const addCategory = async () => {
        if (!newName) return
        setLoading(true)
        const { error } = await supabase
            .from('categorias_ativos')
            .insert({ nome: newName, depreciacao_meses: newDepreciation })

        if (error) {
            toast.error("Erro ao adicionar categoria")
        } else {
            setNewName("")
            fetchCategories()
            toast.success("Categoria adicionada!")
        }
        setLoading(false)
    }

    const updateCategory = async (id: string) => {
        if (!editName) return
        setLoading(true)
        const { error } = await supabase
            .from('categorias_ativos')
            .update({ nome: editName, depreciacao_meses: editDepreciation })
            .eq('id', id)

        if (error) {
            toast.error("Erro ao atualizar categoria")
        } else {
            setEditingId(null)
            fetchCategories()
            toast.success("Categoria atualizada!")
        }
        setLoading(false)
    }

    const deleteCategory = async (id: string) => {
        const { error } = await supabase.from('categorias_ativos').delete().eq('id', id)
        if (!error) {
            toast.success("Categoria removida")
            fetchCategories()
        }
    }

    return (
        <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
            <div>
                <h3 className="text-2xl font-black text-slate-900">Customização de Ativos</h3>
                <p className="text-sm text-slate-400 font-medium">Defina categorias de hardware e regras de vida útil.</p>
            </div>

            {/* Nova Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                <div className="md:col-span-7 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Categoria</label>
                    <Input
                        placeholder="Ex: Servidor, Mobile, Periférico"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="rounded-xl border-slate-200 h-12 bg-white font-bold"
                    />
                </div>
                <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Depreciação (Meses)</label>
                    <Input
                        type="number"
                        value={newDepreciation}
                        onChange={(e) => setNewDepreciation(Number(e.target.value))}
                        className="rounded-xl border-slate-200 h-12 bg-white font-bold"
                    />
                </div>
                <div className="md:col-span-2 flex items-end">
                    <Button onClick={addCategory} disabled={loading} className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/10">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Grid de Categorias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] text-slate-300">
                        Nenhuma categoria personalizada.
                    </div>
                ) : (
                    categories.map((cat) => (
                        <div key={cat.id} className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start justify-between group">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
                                        <PackageSearch className="h-5 w-5 text-primary" />
                                    </div>
                                    {editingId === cat.id ? (
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="h-8 rounded-lg border-primary/20 text-sm focus-visible:ring-primary shadow-sm font-bold w-32"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-bold text-slate-800 text-lg">{cat.name || cat.nome}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    Vida Útil:
                                    {editingId === cat.id ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={editDepreciation}
                                                onChange={(e) => setEditDepreciation(Number(e.target.value))}
                                                className="h-8 rounded-lg border-primary/20 text-xs focus-visible:ring-primary shadow-sm w-20"
                                            />
                                            <span>meses</span>
                                        </div>
                                    ) : (
                                        `${cat.depreciacao_meses} meses`
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingId === cat.id ? (
                                    <>
                                        <Button variant="ghost" size="icon" onClick={() => updateCategory(cat.id)} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-8 w-8 text-rose-500 hover:bg-rose-50">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={() => {
                                                setEditingId(cat.id);
                                                setEditName(cat.name || cat.nome);
                                                setEditDepreciation(cat.depreciacao_meses);
                                            }}
                                        >
                                            <Edit2 className="h-4 w-4 text-slate-400" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-transparent hover:border-rose-100"
                                            onClick={() => deleteCategory(cat.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Regras de Governança */}
            <div className="pt-8 border-t border-slate-100">
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                    <Save className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
                    <h4 className="text-xl font-bold mb-4">Salvar Regras de Governança</h4>
                    <p className="text-slate-400 text-sm mb-6">Todas as alterações acima são aplicadas em tempo real aos novos registros do sistema.</p>
                    <div className="flex flex-wrap gap-3">
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/10 px-4 py-2 rounded-xl">RBAC Ativado</Badge>
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/10 px-4 py-2 rounded-xl">Auditoria Ativada</Badge>
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/10 px-4 py-2 rounded-xl">Depreciação Ativada</Badge>
                    </div>
                </div>
            </div>
        </div>
    )
}
