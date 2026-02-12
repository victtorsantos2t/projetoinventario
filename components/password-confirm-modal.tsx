"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { AlertTriangle, Lock, Trash2, X } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl">
                <div className="p-8 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${variant === 'destructive' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-500'}`}>
                            {variant === 'destructive' ? <AlertTriangle className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                        </div>
                    </div>

                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-black text-slate-900">{title}</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 font-medium">
                            {description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mb-8">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                                <Lock className="h-3 w-3" />
                                Confirme sua senha
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="rounded-xl h-12 border-slate-200 bg-slate-50 focus:bg-white transition-all font-medium"
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 rounded-xl h-12 font-bold text-slate-500 hover:bg-slate-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={loading || !password}
                            className={`flex-1 rounded-xl h-12 font-bold shadow-lg shadow-red-200 ${variant === 'destructive' ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                        >
                            {loading ? "Verificando..." : confirmText}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
