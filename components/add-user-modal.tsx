"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { createBrowserClient } from "@supabase/ssr"
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
import { cn } from "@/lib/utils"

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
        setor_id: "",
        cargo: "",
        is_setor_responsavel: false
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
            // 1. Criar um cliente temporário para o signUp que não persiste a sessão
            // Isso evita que o administrador atual seja deslogado
            const tempSupabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            )

            // 1. Criar usuário na Auth usando o cliente temporário
            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
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
                        setor_id: formData.setor_id || null,
                        cargo: formData.cargo,
                        is_setor_responsavel: formData.is_setor_responsavel
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
                        setor_id: formData.setor_id || null,
                        cargo: formData.cargo,
                        is_setor_responsavel: formData.is_setor_responsavel
                    })
                }

                toast.success("Colaborador cadastrado com sucesso!")
                setOpen(false)
                setFormData({ nome: "", email: "", senha: "", role: "Visualizador", avatar_url: "", setor_id: "", cargo: "", is_setor_responsavel: false })
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
            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                {/* Header Padronizado */}
                <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                            <UserPlus className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-text-primary dark:text-white">
                                Cadastrar Colaborador
                            </DialogTitle>
                            <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium">
                                Crie um novo acesso para o sistema de inventário.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                    {/* Área de Conteúdo com Scroll Padronizada */}
                    <div className="p-8 overflow-y-auto max-h-[60vh] space-y-8 custom-scrollbar bg-white dark:bg-zinc-900">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Avatar Preview & URL Padronizado */}
                            <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 items-center bg-neutral-app dark:bg-white/5 p-5 rounded-2xl border border-transparent transition-all">
                                <Avatar className="h-20 w-20 border-4 border-white dark:border-zinc-800 shadow-xl flex-shrink-0">
                                    <AvatarImage src={formData.avatar_url} />
                                    <AvatarFallback className="bg-slate-200 dark:bg-zinc-800 text-slate-400">
                                        <ImageIcon className="h-8 w-8" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 w-full space-y-2">
                                    <Label htmlFor="avatar_url" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">URL da Foto (Opcional)</Label>
                                    <div className="relative">
                                        <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                        <Input
                                            id="avatar_url"
                                            name="avatar_url"
                                            placeholder="https://exemplo.com/foto.jpg"
                                            value={formData.avatar_url}
                                            onChange={handleChange}
                                            className="pl-10 h-11 rounded-xl bg-white dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Nome Completo */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="nome" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <Input
                                        id="nome"
                                        name="nome"
                                        required
                                        placeholder="Ex: João da Silva"
                                        value={formData.nome}
                                        onChange={handleChange}
                                        className="pl-10 h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm font-bold"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Email Corporativo</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="joao@empresa.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="pl-10 h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm"
                                    />
                                </div>
                            </div>

                            {/* Cargo */}
                            <div className="space-y-2">
                                <Label htmlFor="cargo" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cargo / Função</Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <Input
                                        id="cargo"
                                        name="cargo"
                                        placeholder="Ex: Analista Financeiro"
                                        value={formData.cargo}
                                        onChange={handleChange}
                                        className="pl-10 h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm text-sm"
                                    />
                                </div>
                            </div>

                            {/* Setor */}
                            <div className="space-y-2">
                                <Label htmlFor="setor_id" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Setor / Departamento</Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <select
                                        id="setor_id"
                                        name="setor_id"
                                        value={formData.setor_id}
                                        onChange={handleChange}
                                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-transparent bg-neutral-app dark:bg-white/5 text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none appearance-none shadow-sm dark:text-white"
                                    >
                                        <option value="">Selecione um setor...</option>
                                        {setores.map(setor => (
                                            <option key={setor.id} value={setor.id}>{setor.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Senha */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="senha" className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Senha Temporária</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <Input
                                        id="senha"
                                        name="senha"
                                        type="password"
                                        required
                                        minLength={6}
                                        placeholder="Mínimo 6 caracteres"
                                        value={formData.senha}
                                        onChange={handleChange}
                                        className="pl-10 h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                    <input
                                        type="checkbox"
                                        name="is_setor_responsavel"
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

                            {/* Nível de Acesso (Destaque) Padronizado */}
                            <div className="md:col-span-2 space-y-4">
                                <Label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 block">Nível de Acesso</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {['Visualizador', 'Técnico', 'Admin'].map((role) => (
                                        <label
                                            key={role}
                                            className={cn(
                                                "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                                formData.role === role
                                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/10 shadow-lg shadow-primary-600/10'
                                                    : 'border-slate-50 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:border-primary-600/30'
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role}
                                                checked={formData.role === role}
                                                onChange={handleChange}
                                                className="sr-only"
                                            />
                                            <Shield className={cn("h-6 w-6 mb-2", formData.role === role ? 'text-primary-600' : 'text-text-muted')} />
                                            <span className={cn("font-black text-xs uppercase tracking-tight", formData.role === role ? 'text-text-primary dark:text-white' : 'text-text-muted')}>{role}</span>
                                            {formData.role === role && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle2 className="h-4 w-4 text-primary-600" />
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                </div>
                                <div className="bg-slate-50 dark:bg-white/2 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-center">
                                    <p className="text-[11px] text-text-secondary dark:text-slate-400 text-center leading-relaxed font-medium">
                                        <strong className="text-text-primary dark:text-white uppercase tracking-tighter mr-1">{formData.role}:</strong>
                                        {formData.role === 'Admin' && "Acesso total ao sistema (Usuários, Configurações, Relatórios)."}
                                        {formData.role === 'Técnico' && "Pode gerenciar ativos e movimentações de inventário."}
                                        {formData.role === 'Visualizador' && "Apenas visualização de inventário e dashboard analítico."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Padronizado */}
                    <DialogFooter className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center justify-end gap-3 flex-shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="px-6 py-2.5 text-sm font-black text-text-muted hover:text-text-primary transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-black hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50"
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
