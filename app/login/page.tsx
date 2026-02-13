"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Monitor, Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Laptop } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const router = useRouter()

    // Load remembered email
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
            toast.error("Preencha todos os campos para continuar")
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                if (error.message.includes("Invalid login credentials")) {
                    toast.error("Email ou senha incorretos", {
                        description: "Verifique suas credenciais e tente novamente."
                    })
                } else {
                    toast.error(error.message)
                }
            } else {
                if (rememberMe) {
                    localStorage.setItem("rememberedEmail", email)
                } else {
                    localStorage.removeItem("rememberedEmail")
                }

                toast.success("Bem-vindo de volta!", {
                    description: "Login realizado com sucesso."
                })
                router.refresh()
                router.push("/")
            }
        } catch {
            toast.error("Erro de conexão", {
                description: "Verifique sua internet e tente novamente."
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex bg-slate-50 overflow-hidden">
            {/* Left Side: Illustration & Branding (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
                {/* Background Patterns */}
                <div className="absolute top-0 left-0 w-full h-full opacity-40">
                    <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute -bottom-[12%] -right-[12%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse duration-5000" />
                </div>

                <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                            <Monitor className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">Inventário TI</span>
                    </div>

                    <h2 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                        Gestão inteligente para sua <span className="text-primary italic">infraestrutura</span>.
                    </h2>

                    <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">
                        Controle total sobre seus ativos, manutenções e histórico em uma única plataforma sofisticada e intuitiva.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 rounded-[2rem] bg-white/5 backdrop-blur-lg border border-white/10">
                            <ShieldCheck className="h-6 w-6 text-emerald-400 mb-3" />
                            <h4 className="text-white font-bold text-sm mb-1">Segurança Total</h4>
                            <p className="text-slate-500 text-xs">Dados protegidos com criptografia de ponta.</p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/5 backdrop-blur-lg border border-white/10">
                            <Laptop className="h-6 w-6 text-indigo-400 mb-3" />
                            <h4 className="text-white font-bold text-sm mb-1">Visão 360°</h4>
                            <p className="text-slate-500 text-xs">Histórico completo de cada equipamento.</p>
                        </div>
                    </div>
                </div>

                {/* Visual Accent */}
                <div className="absolute bottom-10 left-12 right-12 flex justify-between items-center text-white/20">
                    <div className="text-[10px] font-black uppercase tracking-[0.5em]">Inventory System v2.0</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.5em]">Enterprise Edition</div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white lg:rounded-l-[3rem] shadow-2xl lg:shadow-[intrinsic] z-20">
                <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
                    {/* Logomarca Mobile Only */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                            <Monitor className="h-7 w-7 text-primary" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventário TI</h1>
                    </div>

                    <div className="text-left">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Acesse sua conta</h2>
                        <p className="text-slate-500 font-medium">Insira suas credenciais para entrar no painel.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</Label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="exemplo@empresa.com"
                                    className="pl-12 rounded-[1.25rem] h-14 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <Label htmlFor="password" className="text-xs font-black text-slate-400 uppercase tracking-widest">Senha de Acesso</Label>
                                <button type="button" className="text-[10px] font-bold text-primary hover:underline transition-all uppercase tracking-tighter">Esqueceu a senha?</button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-12 pr-12 rounded-[1.25rem] h-14 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 px-1">
                            <Checkbox
                                id="remember-me"
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                className="rounded-md border-slate-200"
                            />
                            <Label
                                htmlFor="remember-me"
                                className="text-xs font-bold text-slate-500 cursor-pointer select-none"
                            >
                                Manter conectado neste dispositivo
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/25 transition-all active:scale-[0.98] group flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Autenticando...
                                </>
                            ) : (
                                <>
                                    Entrar no Sistema
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="pt-8 border-t border-slate-100 items-center justify-center flex">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                            Acesso restrito a colaboradores autorizados
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-12 hidden sm:block">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                        © {new Date().getFullYear()} — IT ASSET OPS
                    </p>
                </div>
            </div>
        </div>
    )
}

