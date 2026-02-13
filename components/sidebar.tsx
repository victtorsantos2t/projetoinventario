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
} from "lucide-react"
import { useState } from "react"

interface MenuItem {
    href: string
    label: string
    icon: any
    adminOnly?: boolean
    technicianOnly?: boolean
}

const menuItems: MenuItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventory", label: "Inventário", icon: Package },
    { href: "/users", label: "Colaboradores", icon: Users, technicianOnly: true },
    { href: "/softwares", label: "Softwares", icon: AppWindow, technicianOnly: true },
    { href: "/audit", label: "Auditoria", icon: ShieldCheck, technicianOnly: true },
    { href: "/history", label: "Movimentações", icon: History, technicianOnly: true },
    { href: "/reports", label: "Relatórios", icon: FileText, technicianOnly: true },
    { href: "/analytics", label: "Analytics", icon: BarChart3, technicianOnly: true },
    { href: "/settings", label: "Configurações", icon: Settings, adminOnly: true },
]

export function Sidebar() {
    const pathname = usePathname()
    const { isAdmin, isTecnico } = useUser()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    const filteredItems = menuItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false
        if (item.technicianOnly && !isTecnico) return false
        return true
    })

    const sidebarContent = (
        <div className={cn(
            "h-full flex flex-col bg-white dark:bg-black border-r border-slate-100 dark:border-white/10 transition-all duration-300",
            collapsed ? "w-[72px]" : "w-64"
        )}>
            {/* Logo */}
            <div className="px-5 py-6 flex items-center justify-between border-b border-slate-50 gap-4">
                {!collapsed && (
                    <div className="pl-12 lg:pl-0">
                        <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Inventário</h1>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">TI System</p>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 items-center justify-center text-slate-400 transition-colors"
                >
                    <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-white")} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>

            {/* Version */}
            {!collapsed && (
                <div className="px-5 py-4 border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 font-medium">v2.0 — Refatorado</p>
                </div>
            )}
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
                    "absolute inset-y-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    {sidebarContent}
                </div>
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden lg:block shrink-0">
                {sidebarContent}
            </aside>
        </>
    )
}
