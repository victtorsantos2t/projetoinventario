"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { AlertTriangle, Lock, Trash2, X, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PasswordConfirmModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: React.ReactNode
    onConfirm: () => Promise<void>
    confirmText?: string
    variant?: "destructive" | "default"
}

export function PasswordConfirmModal({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmText = "Confirmar",
    variant = "destructive"
}: PasswordConfirmModalProps) {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        if (!password) {
            toast.error("Digite sua senha para confirmar")
            return
        }

        setLoading(true)
        try {
            // Get current user email
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) {
                toast.error("Não foi possível identificar o usuário")
                return
            }

            // Re-authenticate
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password,
            })

            if (authError) {
                toast.error("Senha incorreta. Tente novamente.")
                setLoading(false)
                return
            }

            // Execute action
            await onConfirm()

            // Cleanup matches success usually
            setPassword("")
            onOpenChange(false)
        } catch (error) {
            console.error("Error in confirmation:", error)
            // Toast handling should be done by caller or here?
            // Usually caller handles specific errors, but auth error is handled here.
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                {/* Header Padronizado */}
                <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                            variant === 'destructive'
                                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                : "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        )}>
                            {variant === 'destructive' ? <AlertTriangle className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-text-primary dark:text-white">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium leading-tight">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-6 bg-white dark:bg-zinc-900">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 flex items-center gap-1.5">
                            <Lock className="h-3 w-3" />
                            Confirme sua senha
                        </Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua senha de acesso"
                            className="h-12 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-medium"
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                            autoFocus
                        />
                        <p className="text-[10px] text-text-muted font-medium px-1">
                            Esta ação requer re-autenticação por segurança.
                        </p>
                    </div>
                </div>

                {/* Footer Padronizado */}
                <DialogFooter className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-12 rounded-xl font-black text-text-muted hover:text-text-primary transition-all"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || !password}
                        className={cn(
                            "flex-1 h-12 rounded-xl font-black shadow-lg transition-all active:scale-95 disabled:opacity-50",
                            variant === 'destructive'
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                                : "bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white shadow-slate-900/20"
                        )}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {loading ? "Verificando..." : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
