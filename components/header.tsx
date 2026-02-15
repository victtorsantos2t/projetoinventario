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
        <header className="h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 pl-14 pr-4 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-all duration-300">
            <div className="hidden sm:block">
                <h2 className="text-sm font-bold text-text-secondary dark:text-slate-300">
                    Bem-vindo, <span className="text-primary-600 dark:text-primary-400">{profile?.full_name || 'Usuário'}</span>
                </h2>
            </div>
            <div className="sm:hidden font-black text-xs text-text-primary dark:text-white tracking-tighter bg-neutral-app dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/10">
                INVENTÁRIO TI
            </div>

            <div className="flex items-center gap-4">
                <NotificationsPopover />
            </div>
        </header>
    )
}
