"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Edit2, Mail, User, Shield, Image, Building2, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { Profile } from "@/types"
import { cn } from "@/lib/utils"

interface EditUserModalProps {
    user: Profile | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditUserModal({ user, open, onOpenChange, onSuccess }: EditUserModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nome: "",
        role: "Visualizador",
        avatar_url: "",
        setor_id: "",
        cpf: "",
        cargo: "",
        is_setor_responsavel: false
    })
    const [setores, setSetores] = useState<any[]>([])

    useEffect(() => {
        async function fetchSectors() {
            const { data } = await supabase.from('setores').select('*').order('nome')
            if (data) setSetores(data)
        }
        fetchSectors()
    }, [])

    useEffect(() => {
        if (user) {
            setFormData({
                nome: user.full_name || "",
                role: user.role || "Visualizador",
                avatar_url: user.avatar_url || "",
                setor_id: user.setor_id || "",
                cpf: user.cpf || "",
                cargo: user.cargo || "",
                is_setor_responsavel: user.is_setor_responsavel || false
            })
        }
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        if (!formData.nome) {
            toast.error("O nome não pode estar vazio!")
            return
        }

        setLoading(true)

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: formData.nome,
                role: formData.role,
                avatar_url: formData.avatar_url,
                setor_id: formData.setor_id || null,
                cpf: formData.cpf,
                cargo: formData.cargo,
                is_setor_responsavel: formData.is_setor_responsavel
            })
            .eq('id', user.id)

        if (error) {
            toast.error("Erro ao atualizar: " + error.message)
        } else {
            toast.success("Dados do colaborador atualizados!")
            onSuccess()
            onOpenChange(false)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                {/* Header Padronizado */}
                <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                            <Edit2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-text-primary dark:text-white">
                                Editar Colaborador
                            </DialogTitle>
                            <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium">
                                Atualizando perfil de {user?.email}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                    {/* Conteúdo com Scroll Padronizado */}
                    <div className="p-8 overflow-y-auto max-h-[60vh] space-y-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 items-center bg-neutral-app dark:bg-white/5 p-5 rounded-2xl border border-transparent transition-all opacity-60">
                                <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center border-4 border-white dark:border-zinc-700 shadow-sm">
                                    <Mail className="h-6 w-6 text-slate-400" />
                                </div>
                                <div className="flex-1 w-full space-y-1">
                                    <Label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">E-mail (Identificador)</Label>
                                    <Input
                                        value={user?.email || ""}
                                        disabled
                                        className="h-11 rounded-xl bg-white dark:bg-zinc-800 border-transparent cursor-not-allowed text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="edit-nome" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <Input
                                        id="edit-nome"
                                        value={formData.nome}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        placeholder="João Silva"
                                        className="pl-10 h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="edit-avatar" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">URL da Foto (Avatar)</Label>
                                <div className="relative">
                                    <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-all" />
                                    <Input
                                        id="edit-avatar"
                                        value={formData.avatar_url}
                                        onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                        placeholder="https://exemplo.com/foto.jpg"
                                        className="pl-10 h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-cpf" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">CPF</Label>
                                <Input
                                    id="edit-cpf"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                    className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-cargo" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cargo</Label>
                                <Input
                                    id="edit-cargo"
                                    value={formData.cargo}
                                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                    placeholder="Analista de TI"
                                    className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Setor / Departamento</Label>
                                <Select
                                    value={formData.setor_id}
                                    onValueChange={(val) => setFormData({ ...formData, setor_id: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm font-bold dark:text-white">
                                        <Building2 className="mr-2 h-4 w-4 text-text-muted" />
                                        <SelectValue placeholder="Selecione o setor" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 dark:border-white/5 shadow-2xl">
                                        <SelectItem value="remove">Remover Setor</SelectItem>
                                        {setores.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nível de Acesso</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm font-bold dark:text-white">
                                        <Shield className="mr-2 h-4 w-4 text-text-muted" />
                                        <SelectValue placeholder="Selecione o acesso" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 dark:border-white/5 shadow-2xl">
                                        <SelectItem value="Admin" className="font-bold text-slate-900 dark:text-white italic">Administrador</SelectItem>
                                        <SelectItem value="Técnico" className="font-medium text-slate-700 dark:text-slate-300">Técnico em TI</SelectItem>
                                        <SelectItem value="Visualizador" className="text-slate-500">Visualizador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_setor_responsavel}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_setor_responsavel: e.target.checked }))}
                                        className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-600 transition-all"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-text-primary dark:text-white uppercase tracking-tighter">Responsável de Setor</span>
                                        <span className="text-[10px] text-text-muted font-bold">Permite que este colaborador tenha múltiplos computadores vinculados.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footer Padronizado */}
                    <DialogFooter className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center justify-end gap-3 flex-shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="px-6 py-2.5 text-sm font-black text-text-muted hover:text-text-primary transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-black hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
