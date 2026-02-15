"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, User, Lock, ArrowRight, ShieldCheck, CheckCircle2, BarChart3, Globe, Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const savedEmail = localStorage.getItem("rememberedEmail")
        if (savedEmail) {
            setEmail(savedEmail)
            setRememberMe(true)
        }
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            toast.error("Preencha todos os campos", {
                description: "Usuário e senha são obrigatórios para acesso."
            })
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                if (error.message.includes("Invalid login credentials")) {
                    toast.error("Acesso Negado", {
                        description: "Verifique suas credenciais e tente novamente."
                    })
                } else {
                    toast.error("Erro de Autenticação", {
                        description: error.message
                    })
                }
            } else {
                if (rememberMe) {
                    localStorage.setItem("rememberedEmail", email)
                } else {
                    localStorage.removeItem("rememberedEmail")
                }

                toast.success("Autenticado com Sucesso", {
                    description: "Redirecionando para o painel de controle..."
                })
                router.refresh()
                router.push("/")
            }
        } catch {
            toast.error("Erro de Conexão", {
                description: "Não foi possível conectar ao servidor."
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans selection:bg-primary/20">
            {/* LADO ESQUERDO — FORMULÁRIO LOGIN */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-24 bg-white dark:bg-zinc-900 z-20 shadow-2xl shadow-slate-200/50 dark:shadow-none lg:rounded-r-[3rem]">
                <div className="w-full max-w-[400px] space-y-10 animate-in fade-in slide-in-from-left-4 duration-700">

                    {/* Cabeçalho do Form */}
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Entrar no Sistema
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-base">
                            Acesse sua conta para continuar
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-5">
                            {/* Campo Usuário */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 hidden">
                                    Usuário
                                </Label>
                                <div className="relative group transition-all duration-300">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Digite seu usuário"
                                        className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 focus:bg-white dark:focus:bg-zinc-900 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Campo Senha */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 hidden">
                                    Senha
                                </Label>
                                <div className="relative group transition-all duration-300">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Digite sua senha"
                                        className="pl-12 pr-12 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 focus:bg-white dark:focus:bg-zinc-900 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Lembrar-me */}
                        <div className="flex items-center space-x-2.5 px-1">
                            <Checkbox
                                id="remember"
                                checked={rememberMe}
                                onCheckedChange={(c) => setRememberMe(!!c)}
                                className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-[6px]"
                            />
                            <Label htmlFor="remember" className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                Lembrar meu acesso
                            </Label>
                        </div>

                        {/* Botão Principal */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-lg shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all duration-300 group"
                        >
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-white/80" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    Entrar
                                    <ArrowRight className="h-5 w-5 opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Rodapé Visual Mobile */}
                    <div className="lg:hidden pt-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Inventário TI Enterprise © 2026
                    </div>
                </div>
            </div>

            {/* LADO DIREITO — ÁREA VISUAL */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
                {/* Background Gradient & Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 animate-pulse [animation-duration:10s]" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/40 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                    {/* Grid Pattern Overlay */}
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                </div>

                {/* Conteúdo Visual Central */}
                <div className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in duration-1000">

                    {/* Glassmorphism Card (Simulando a imagem de pessoa/tablet) */}
                    <div className="relative aspect-[4/5] rounded-[3rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl shadow-indigo-900/50 flex flex-col items-center justify-center overflow-hidden group">

                        {/* Fallback Visual Rico (já que a geração de imagem falhou) */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 z-0" />

                        {/* Ilustração CSS Conceitual */}
                        <div className="relative z-10 flex flex-col items-center gap-6 p-8 text-center">
                            <div className="h-32 w-32 rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-lg mb-4 group-hover:scale-105 transition-transform duration-500">
                                <ShieldCheck className="h-14 w-14 text-white drop-shadow-md" />
                            </div>

                            <h2 className="text-4xl font-black text-white leading-tight drop-shadow-lg">
                                Gestão Corporativa<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">Inteligente</span>
                            </h2>

                            <p className="text-indigo-100/80 font-medium text-lg max-w-xs leading-relaxed">
                                Controle total de ativos, segurança e conformidade em uma única plataforma.
                            </p>
                        </div>

                        {/* Floating Elements (Decoração) */}
                        <div className="absolute top-12 right-12 p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg animate-bounce [animation-duration:3000ms]">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div className="absolute bottom-20 left-12 p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg animate-bounce [animation-duration:4000ms] delay-700">
                            <Globe className="h-6 w-6 text-white" />
                        </div>
                    </div>

                    {/* Review Badge Flutuante */}
                    <div className="absolute -top-[68px] -right-8 bg-white rounded-2xl p-4 shadow-xl shadow-black/20 animate-in slide-in-from-top-4 duration-1000 delay-500 hidden xl:flex items-center gap-3 max-w-[200px]">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">Sistema Operacional</p>
                            <p className="text-[10px] font-medium text-slate-500">Status: 100% Online</p>
                        </div>
                    </div>
                </div>

                {/* Rodapé Visual Direito */}
                <div className="absolute bottom-8 right-10 text-right">
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                        Enterprise Edition v2.0
                    </p>
                </div>
            </div>
        </div>
    )
}

