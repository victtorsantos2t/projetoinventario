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
import { Edit2, Mail, User, Shield, Image, Building2 } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { Profile } from "@/types"

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
        cargo: ""
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
                cargo: user.cargo || ""
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
                cargo: formData.cargo
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
            <DialogContent className="sm:max-w-[450px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Edit2 className="h-6 w-6 text-primary" />
                        Editar Colaborador
                    </DialogTitle>
                    <DialogDescription>
                        Atualize os dados básicos de <strong>{user?.email}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                    <div className="space-y-2 opacity-60">
                        <Label className="text-sm font-bold text-slate-500 italic">E-mail (Identificador)</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={user?.email || ""}
                                disabled
                                className="pl-10 rounded-xl border-slate-200 bg-slate-50 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-nome" className="text-sm font-bold text-slate-700">Nome Completo</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="edit-nome"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="João Silva"
                                className="pl-10 rounded-xl border-slate-200 focus-visible:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-avatar" className="text-sm font-bold text-slate-700">URL da Foto (Avatar)</Label>
                        <div className="relative">
                            <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="edit-avatar"
                                value={formData.avatar_url}
                                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                placeholder="https://exemplo.com/foto.jpg"
                                className="pl-10 rounded-xl border-slate-200 focus-visible:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-cpf" className="text-sm font-bold text-slate-700">CPF</Label>
                            <Input
                                id="edit-cpf"
                                value={formData.cpf}
                                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                placeholder="000.000.000-00"
                                className="rounded-xl border-slate-200 focus-visible:ring-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-cargo" className="text-sm font-bold text-slate-700">Cargo</Label>
                            <Input
                                id="edit-cargo"
                                value={formData.cargo}
                                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                placeholder="Analista de TI"
                                className="rounded-xl border-slate-200 focus-visible:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Setor / Departamento</Label>
                        <Select
                            value={formData.setor_id}
                            onValueChange={(val) => setFormData({ ...formData, setor_id: val })}
                        >
                            <SelectTrigger className="rounded-xl border-slate-200 h-11">
                                <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="remove">Remover Setor</SelectItem>
                                {setores.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Nível de Acesso</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(val) => setFormData({ ...formData, role: val })}
                        >
                            <SelectTrigger className="rounded-xl border-slate-200 h-11">
                                <SelectValue placeholder="Selecione o acesso" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="Admin" className="font-bold text-slate-900">Administrador</SelectItem>
                                <SelectItem value="Técnico" className="font-medium text-slate-700">Técnico em Informática</SelectItem>
                                <SelectItem value="Visualizador" className="text-slate-500">Visualizador (Apenas leitura)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 font-bold text-lg">
                            {loading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
