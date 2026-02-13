"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AuthMonitor } from "@/components/auth-monitor"
import { ErrorBoundary } from "@/components/error-boundary"
import { UserProvider } from "@/contexts/user-context"
import { Loader2 } from "lucide-react"

import { CommandMenu } from "@/components/command-menu"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [loading, setLoading] = useState(true)
    const [authenticated, setAuthenticated] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setAuthenticated(true)
            }
            setLoading(false)
        }
        checkAuth()
    }, [])

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
        )
    }

    if (!authenticated) return null

    return (
        <UserProvider>
            <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <Header />
                    <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </main>
                </div>
                <AuthMonitor />
                <CommandMenu />
            </div>
        </UserProvider>
    )
}
