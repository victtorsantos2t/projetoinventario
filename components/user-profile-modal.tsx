"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Profile } from "@/types"
import { useUser } from "@/contexts/user-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { X, User, Lock, Camera, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

interface UserProfileModalProps {
    open: boolean
    onClose: () => void
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
    const { profile, refreshProfile } = useUser()
    const [fullName, setFullName] = useState(profile?.full_name || "")
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    const handleUpdateName = async () => {
        if (!fullName) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', profile?.id)

            if (error) throw error
            await refreshProfile()
            toast.success("Nome atualizado!")
        } catch (error: any) {
            toast.error("Erro ao atualizar nome: " + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleUpdatePassword = async () => {
        if (!password || password !== confirmPassword) {
            toast.error("As senhas não coincidem ou estão vazias")
            return
        }
        setSaving(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            toast.success("Senha atualizada com sucesso!")
            setPassword("")
            setConfirmPassword("")
        } catch (error: any) {
            toast.error("Erro ao atualizar senha: " + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${profile?.id}-${Math.random()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            // Upload image
            const { error: uploadError } = await supabase.storage
                .from('inventario-assets')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('inventario-assets')
                .getPublicUrl(filePath)

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile?.id)

            if (updateError) throw updateError

            setAvatarUrl(publicUrl)
            await refreshProfile()
            toast.success("Foto de perfil atualizada!")
        } catch (error: any) {
            console.error(error)
            toast.error("Erro no upload: " + error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-xl p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                    <DialogTitle className="text-xl font-black text-text-primary dark:text-white">Meu Perfil</DialogTitle>
                    <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium">
                        Gerencie suas informações de conta com segurança.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Profile Picture Section Padronizada */}
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-primary-600 to-purple-500 rounded-[2.2rem] blur opacity-20 group-hover:opacity-40 transition duration-500" />
                            <Avatar className="h-32 w-32 rounded-[2rem] border-4 border-white dark:border-zinc-800 shadow-2xl relative overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-4xl font-black">
                                    {(fullName?.[0] || profile?.email?.[0] || '?').toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-[2rem] opacity-0 group-hover:opacity-100 cursor-pointer transition-all backdrop-blur-[4px] z-20">
                                {uploading ? (
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                ) : (
                                    <>
                                        <Camera className="h-8 w-8 mb-1" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Alterar</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                            </label>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-text-primary dark:text-white tracking-tight">{profile?.full_name}</h3>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-500/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
                                <p className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">{profile?.role}</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Info Padronizada */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tight">Informações Pessoais</h4>
                                <p className="text-[10px] text-text-muted font-medium">Atualize como você é visto no sistema.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nome Completo</label>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Input
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="h-12 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-medium"
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <Button
                                    onClick={handleUpdateName}
                                    disabled={saving || fullName === profile?.full_name}
                                    className="h-12 px-8 rounded-xl font-black bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Account Security Padronizada */}
                    <div className="space-y-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tight">Segurança da Conta</h4>
                                <p className="text-[10px] text-text-muted font-medium">Proteja seu acesso trocando sua senha.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nova Senha</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Confirmar Senha</label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="h-12 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleUpdatePassword}
                            disabled={saving || !password || password !== confirmPassword}
                            className="w-full h-12 rounded-xl font-black bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white shadow-xl shadow-slate-900/20 transition-all mt-4 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Atualizar Senha
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
