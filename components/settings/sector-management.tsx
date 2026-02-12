"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { LayoutGrid, Plus, Trash2, Edit2, Check, X, Building2 } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { PasswordConfirmModal } from "@/components/password-confirm-modal"

export function SectorManagement() {
    const [setores, setSetores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newSector, setNewSector] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")

    async function fetchSectors() {
        setLoading(true)
        const { data, error } = await supabase
            .from('setores')
            .select('*')
            .order('nome')

        if (!error && data) setSetores(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchSectors()
    }, [])

    const handleAdd = async () => {
        if (!newSector.trim()) return

        const { error } = await supabase
            .from('setores')
            .insert({ nome: newSector.trim() })

        if (error) {
            toast.error("Erro ao adicionar setor: " + error.message)
        } else {
            toast.success("Setor adicionado com sucesso!")
            setNewSector("")
            fetchSectors()
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return

        const { error } = await supabase
            .from('setores')
            .update({ nome: editName.trim() })
            .eq('id', id)

        if (error) {
            toast.error("Erro ao atualizar: " + error.message)
        } else {
            toast.success("Setor atualizado!")
            setEditingId(null)
            fetchSectors()
        }
    }

    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, nome: string }>({ open: false, id: '', nome: '' })

    const confirmDelete = async () => {
        const { id, nome } = deleteModal
        const { error } = await supabase
            .from('setores')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error("Erro ao excluir: " + error.message)
        } else {
            toast.success(`Setor "${nome}" removido!`)
            fetchSectors()
        }
    }

    const handleDeleteClick = (id: string, nome: string) => {
        setDeleteModal({ open: true, id, nome })
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div>
                <h3 className="text-2xl font-black text-slate-900">Gestão de Setores</h3>
                <p className="text-sm text-slate-400 font-medium">Cadastre os departamentos para organizar colaboradores e ativos.</p>
            </div>

            <div className="flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="relative flex-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        value={newSector}
                        onChange={(e) => setNewSector(e.target.value)}
                        placeholder="Nome do novo setor (ex: Recursos Humanos)"
                        className="pl-10 rounded-xl border-slate-200 bg-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                </div>
                <Button onClick={handleAdd} className="rounded-xl gap-2 font-bold px-6 shadow-sm">
                    <Plus className="h-4 w-4" /> Adicionar Setor
                </Button>
            </div>

            <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 border-none">
                            <TableHead className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Setor</TableHead>
                            <TableHead className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={2} className="text-center py-10 animate-pulse">Carregando...</TableCell></TableRow>
                        ) : setores.length === 0 ? (
                            <TableRow><TableCell colSpan={2} className="text-center py-10 text-slate-400 italic">Nenhum setor cadastrado.</TableCell></TableRow>
                        ) : (
                            setores.map((s) => (
                                <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell className="px-8 py-4 font-bold text-slate-700">
                                        {editingId === s.id ? (
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="h-8 rounded-lg border-primary/20 text-sm focus-visible:ring-primary shadow-sm"
                                                autoFocus
                                            />
                                        ) : (
                                            s.nome
                                        )}
                                    </TableCell>
                                    <TableCell className="px-8 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {editingId === s.id ? (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleUpdate(s.id)} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
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
                                                        onClick={() => { setEditingId(s.id); setEditName(s.nome); }}
                                                        className="h-8 w-8 text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(s.id, s.nome)}
                                                        className="h-8 w-8 text-slate-400 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <PasswordConfirmModal
                open={deleteModal.open}
                onOpenChange={(open) => setDeleteModal(prev => ({ ...prev, open }))}
                title="Excluir Setor"
                description={
                    <span>
                        Tem certeza que deseja excluir o setor <strong className="text-slate-900">"{deleteModal.nome}"</strong>?
                        <br /><span className="text-red-500 font-bold">Esta ação não pode ser desfeita.</span>
                    </span>
                }
                onConfirm={confirmDelete}
                confirmText="Excluir Setor"
            />
        </div>
    )
}
