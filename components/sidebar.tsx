"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Package,
    History,
    Users,
    Settings,
    HelpCircle,
    ChevronLeft,
    Menu,
    FileText,
    BarChart3,
    AppWindow,
    ShieldCheck,
    LogOut,
    User as UserIcon
} from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { UserProfileModal } from "./user-profile-modal"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MenuItem {
    href: string
    label: string
    icon: any
    adminOnly?: boolean
    technicianOnly?: boolean
}

interface MenuSection {
    title: string
    items: MenuItem[]
}

const menuSections: MenuSection[] = [
    {
        title: "Workspace",
        items: [
            { href: "/", label: "Dashboard", icon: LayoutDashboard },
        ]
    },
    {
        title: "Inventário",
        items: [
            { href: "/inventory", label: "Equipamentos", icon: Package },
            { href: "/users", label: "Colaboradores", icon: Users, technicianOnly: true },
            { href: "/softwares", label: "Softwares", icon: AppWindow, technicianOnly: true },
        ]
    },
    {
        title: "Operacional",
        items: [
            { href: "/audit", label: "Auditoria", icon: ShieldCheck, technicianOnly: true },
        ]
    },
    {
        title: "Relatórios & BI",
        items: [
            { href: "/history", label: "Log de Atividades", icon: History, technicianOnly: true },
            { href: "/reports", label: "Relatórios PDF", icon: FileText, technicianOnly: true },
            { href: "/analytics", label: "Analytics BI", icon: BarChart3, technicianOnly: true },
        ]
    },
    {
        title: "Sistema",
        items: [
            { href: "/settings", label: "Configurações", icon: Settings, adminOnly: true },
        ]
    }
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { profile, isAdmin, isTecnico } = useUser()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [isLogoutOpen, setIsLogoutOpen] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const sidebarContent = (
        <div className={cn(
            "h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-slate-100 dark:border-white/5 transition-all duration-300 ease-in-out shadow-sm",
            collapsed ? "w-[80px]" : "w-64"
        )}>
            {/* Logo */}
            <div className="px-6 py-5 lg:py-6 flex items-center justify-between border-b border-slate-50 dark:border-white/5 gap-4">
                {!collapsed && (
                    <div className="pl-12 lg:pl-0 group cursor-default">
                        <h1 className="text-lg font-black text-text-primary dark:text-white tracking-tighter transition-colors group-hover:text-primary-600">Inventário</h1>
                        <p className="text-[9px] font-black text-primary-500 uppercase tracking-[0.3em] mt-0.5">Enterprise System</p>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex h-9 w-9 rounded-xl bg-neutral-app dark:bg-white/5 hover:bg-neutral-muted dark:hover:bg-white/10 items-center justify-center text-text-muted hover:text-primary-600 transition-all shadow-sm"
                >
                    <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-4 space-y-4 lg:space-y-6 overflow-y-auto custom-scrollbar">
                {menuSections.map((section, idx) => {
                    const filteredItems = section.items.filter(item => {
                        if (item.adminOnly && !isAdmin) return false
                        if (item.technicianOnly && !isTecnico) return false
                        return true
                    })

                    if (filteredItems.length === 0) return null

                    return (
                        <div key={idx} className="space-y-1">
                            {!collapsed && (
                                <p className="px-3 pb-1 text-[9px] font-black text-text-muted dark:text-slate-600 uppercase tracking-[0.15em]">
                                    {section.title}
                                </p>
                            )}
                            <div className="space-y-0">
                                {filteredItems.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group",
                                                isActive
                                                    ? "bg-primary-50 text-primary-600 shadow-sm border border-primary-100 dark:bg-primary-900/10 dark:text-primary-400 dark:border-primary-900/20"
                                                    : "text-text-secondary dark:text-slate-400 hover:bg-neutral-subtle dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white"
                                            )}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive && "text-primary-600 dark:text-primary-400")} />
                                            {!collapsed && <span>{item.label}</span>}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </nav>

            {/* User Profile Block */}
            <div className="p-4 border-t border-slate-50 dark:border-white/5 bg-neutral-subtle/30 dark:bg-transparent space-y-2">
                <div
                    onClick={() => setShowProfile(true)}
                    className={cn(
                        "flex items-center gap-3 p-2 rounded-2xl transition-all cursor-pointer group",
                        !collapsed && "hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-100 dark:hover:border-white/10 hover:shadow-sm"
                    )}
                >
                    <Avatar className="h-10 w-10 rounded-xl border-2 border-primary-100 dark:border-primary-900/30 shrink-0 transition-transform group-hover:scale-105">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary-50 text-primary-600 font-black text-xs">
                            {(profile?.full_name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-text-primary dark:text-white truncate group-hover:text-primary-600 transition-colors">
                                {profile?.full_name || 'Usuário'}
                            </p>
                            <p className="text-[10px] font-bold text-text-muted truncate">
                                {profile?.role || profile?.email || 'Nível Básico'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={() => setIsLogoutOpen(true)}
                        className={cn(
                            "w-full h-10 rounded-xl flex items-center gap-3 text-text-muted hover:text-critical-600 hover:bg-critical-50 dark:hover:bg-critical-900/10 transition-all px-3 font-bold text-sm",
                            collapsed && "justify-center px-0"
                        )}
                        title="Sair"
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Sair do Sistema</span>}
                    </button>
                </div>
            </div>

            {/* Confirm Logout Dialog */}
            <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                <AlertDialogContent className="rounded-[2rem] border-slate-100 dark:border-white/5 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Deseja realmente sair?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                            Sua sessão será encerrada e você precisará fazer login novamente para acessar o inventário.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-100 dark:border-white/10">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
                        >
                            Confirmar e Sair
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Sidebar */}
            <div className={cn(
                "lg:hidden fixed inset-0 z-50 transition-all duration-300",
                mobileOpen ? "visible" : "invisible"
            )}>
                {/* Overlay */}
                <div
                    className={cn(
                        "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
                        mobileOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setMobileOpen(false)}
                />

                {/* Drawer */}
                <div className={cn(
                    "absolute inset-y-0 left-0 w-64 bg-white shadow-2xl transition-transform duration-300 transform",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    {sidebarContent}
                </div>
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden lg:block h-screen sticky top-0 shrink-0">
                {sidebarContent}
            </aside>

            <UserProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
        </>
    )
}
