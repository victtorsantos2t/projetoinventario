"use client"

import { useUser } from "@/contexts/user-context"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Bell, LogOut, User, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"
import { UserProfileModal } from "./user-profile-modal"
import { NotificationsPopover } from "./notifications-popover"

export function Header() {
    const { profile } = useUser()
    const [showProfile, setShowProfile] = useState(false)
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <header className="h-16 bg-white border-b border-slate-100 pl-20 pr-8 lg:px-8 flex items-center justify-between shrink-0">
            <div>
                <h2 className="text-sm font-bold text-slate-700">
                    Bem-vindo, <span className="text-primary">{profile?.full_name || 'Usuário'}</span>
                </h2>
            </div>

            <div className="flex items-center gap-3">
                <NotificationsPopover />

                <div className="h-6 w-px bg-slate-100" />

                <div
                    onClick={() => setShowProfile(true)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 pr-3 rounded-2xl transition-colors group"
                >
                    <Avatar className="h-9 w-9 rounded-xl border border-primary/10 transition-transform group-hover:scale-105">
                        <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm rounded-xl">
                            {(profile?.full_name?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block">
                        <p className="text-sm font-bold text-slate-700 leading-tight flex items-center gap-1">
                            {profile?.email || profile?.full_name || 'Usuário'}
                            <Settings className="h-3 w-3 text-slate-300 group-hover:text-primary transition-colors" />
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">{profile?.role || 'Visualizador'}</p>
                    </div>
                </div>

                <UserProfileModal open={showProfile} onClose={() => setShowProfile(false)} />

                <button onClick={handleLogout} className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Sair">
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        </header>
    )
}
