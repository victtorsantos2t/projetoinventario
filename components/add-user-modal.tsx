"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    UserPlus, Mail, Lock, User, Briefcase, Shield,
    CheckCircle2, Loader2, Image as ImageIcon
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AddUserModalProps {
    onSuccess?: () => void
}

export function AddUserModal({ onSuccess }: AddUserModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [setores, setSetores] = useState<{ id: string, nome: string }[]>([])

    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        senha: "",
        role: "Visualizador",
        avatar_url: "",
        setor_id: ""
    })

    useEffect(() => {
        if (open) {
            fetchSetores()
        }
    }, [open])

    const fetchSetores = async () => {
        const { data } = await supabase.from('setores').select('*').order('nome')
        if (data) setSetores(data)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Criar usuário na Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.senha,
                options: {
                    data: {
                        full_name: formData.nome,
                        role: formData.role, // Metadata inicial
                    }
                }
            })

            if (authError) throw authError

            if (authData.user) {
                // 2. Criar perfil na tabela pública (se não for trigger automático)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.nome,
                        role: formData.role,
                        avatar_url: formData.avatar_url,
                        setor_id: formData.setor_id || null
                    })
                    .eq('id', authData.user.id)

                // Se perfil não existir (trigger falhou?), insert manual
                if (profileError) {
                    await supabase.from('profiles').insert({
                        id: authData.user.id,
                        email: formData.email,
                        full_name: formData.nome,
                        role: formData.role,
                        avatar_url: formData.avatar_url,
                        setor_id: formData.setor_id || null
                    })
                }

                toast.success("Colaborador cadastrado com sucesso!")
                setOpen(false)
                setFormData({ nome: "", email: "", senha: "", role: "Visualizador", avatar_url: "", setor_id: "" })
                onSuccess?.()
            }

        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao cadastrar colaborador", {
                description: error.message || "Tente novamente."
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl h-11 px-6 shadow-md bg-primary hover:bg-primary/90 text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <UserPlus className="h-5 w-5" /> Novo Colaborador
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] rounded-[2.5rem] p-0 overflow-hidden flex flex-col border-0 shadow-2xl">
                {/* Header Decorativo - Mais Compacto */}
                <div className="bg-primary/5 p-6 border-b border-primary/10 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                            <UserPlus className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
                                Cadastrar Colaborador
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-xs font-medium mt-0.5">
                                Crie um novo acesso para o sistema.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                    {/* Área de Conteúdo com Scroll */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-5 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Avatar Preview & URL - Mais Compacto */}
                            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                <Avatar className="h-16 w-16 border-4 border-white shadow-sm flex-shrink-0">
                                    <AvatarImage src={formData.avatar_url} />
                                    <AvatarFallback className="bg-slate-200 text-slate-400">
                                        <ImageIcon className="h-6 w-6" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 w-full space-y-1.5">
                                    <Label htmlFor="avatar_url" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">URL da Foto (Opcional)</Label>
                                    <div className="relative">
                                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            id="avatar_url"
                                            name="avatar_url"
                                            placeholder="https://exemplo.com/foto.jpg"
                                            value={formData.avatar_url}
                                            onChange={handleChange}
                                            className="pl-9 h-10 rounded-xl bg-white border-slate-200 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Nome Completo */}
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="nome" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        id="nome"
                                        name="nome"
                                        required
                                        placeholder="Ex: João da Silva"
                                        value={formData.nome}
                                        onChange={handleChange}
                                        className="pl-9 h-10 rounded-xl border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Corporativo</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="joao@empresa.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="pl-9 h-10 rounded-xl border-slate-200 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Setor */}
                            <div className="space-y-1.5">
                                <Label htmlFor="setor_id" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Setor / Departamento</Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <select
                                        id="setor_id"
                                        name="setor_id"
                                        value={formData.setor_id}
                                        onChange={handleChange}
                                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 appearance-none transition-all"
                                    >
                                        <option value="">Selecione um setor...</option>
                                        {setores.map(setor => (
                                            <option key={setor.id} value={setor.id}>{setor.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Senha */}
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="senha" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Senha Temporária</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        id="senha"
                                        name="senha"
                                        type="password"
                                        required
                                        minLength={6}
                                        placeholder="Mínimo 6 caracteres"
                                        value={formData.senha}
                                        onChange={handleChange}
                                        className="pl-9 h-10 rounded-xl border-slate-200 font-mono text-sm"
                                    />
                                </div>
                            </div>

                            {/* Nível de Acesso (Destaque) */}
                            <div className="md:col-span-2 space-y-3 pt-1">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block text-center md:text-left">Nível de Acesso</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-1">
                                    {['Visualizador', 'Técnico', 'Admin'].map((role) => (
                                        <label
                                            key={role}
                                            className={`
                                                relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all
                                                ${formData.role === role
                                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                                    : 'border-slate-50 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-200'}
                                            `}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role}
                                                checked={formData.role === role}
                                                onChange={handleChange}
                                                className="sr-only"
                                            />
                                            <Shield className={`h-5 w-5 mb-1.5 ${formData.role === role ? 'text-primary' : 'text-slate-400'}`} />
                                            <span className={`font-bold text-[11px] ${formData.role === role ? 'text-slate-900' : 'text-slate-500'}`}>{role}</span>
                                            {formData.role === role && (
                                                <div className="absolute top-1.5 right-1.5">
                                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-center">
                                    <p className="text-[10px] text-slate-400 text-center leading-tight">
                                        <strong className="text-slate-600 uppercase tracking-tighter mr-1">{formData.role}:</strong>
                                        {formData.role === 'Admin' && "Acesso total ao sistema (Usuários, Configurações, Relatórios)."}
                                        {formData.role === 'Técnico' && "Pode gerenciar ativos e movimentações."}
                                        {formData.role === 'Visualizador' && "Apenas visualização de inventário e dashboard."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Fixo no rodapé */}
                    <DialogFooter className="p-6 pt-4 border-t border-slate-100 bg-white flex-shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="h-11 rounded-xl text-slate-400 hover:text-slate-600 font-bold px-6"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 rounded-xl px-10 font-black text-sm shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 transition-all flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                                </>
                            ) : (
                                <>
                                    Confirmar Cadastro
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
