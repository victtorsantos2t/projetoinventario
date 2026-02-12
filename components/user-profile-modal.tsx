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

    if (!open) return null

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Meu Perfil</h2>
                        <p className="text-sm text-slate-400 font-medium">Gerencie suas informações de conta</p>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-10 overflow-y-auto">
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <Avatar className="h-32 w-32 rounded-[2rem] border-4 border-white shadow-xl ring-1 ring-slate-100 overflow-hidden">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="bg-primary/5 text-primary text-4xl font-black">
                                    {fullName?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-[2rem] opacity-0 group-hover:opacity-100 cursor-pointer transition-all backdrop-blur-[2px]">
                                {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8" />}
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                            </label>
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-slate-800">{profile?.full_name}</h3>
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider">{profile?.role}</p>
                        </div>
                    </div>

                    {/* Personal Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <User className="h-4 w-4 text-indigo-500" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Informações Pessoais</h4>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-sm"
                                    placeholder="Seu nome completo"
                                />
                            </div>
                            <Button
                                onClick={handleUpdateName}
                                disabled={saving || fullName === profile?.full_name}
                                className="h-11 px-6 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-100 transition-all"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </div>
                    </div>

                    {/* Account Security */}
                    <div className="space-y-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Lock className="h-4 w-4 text-emerald-500" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Segurança da Conta</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-sm"
                                placeholder="Nova senha"
                            />
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-sm"
                                placeholder="Confirmar nova senha"
                            />
                        </div>
                        <Button
                            onClick={handleUpdatePassword}
                            disabled={saving || !password || password !== confirmPassword}
                            className="w-full h-11 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100 transition-all"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Atualizar Senha
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
