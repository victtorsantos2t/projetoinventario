"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { Loader2 } from "lucide-react"

export function RoleGuard({ children }: { children: React.ReactNode }) {
    const { role, loading, profile } = useUser()
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        // Se já carregou e o usuário é apenas Visualizador
        if (!loading && profile && role === 'Visualizador') {
            // Se tentar acessar qualque página que não seja /inventory
            if (!pathname.startsWith('/inventory')) {
                router.replace('/inventory')
            }
        }
    }, [role, loading, pathname, router, profile])

    // Mostra spinner enquanto o contexto de usuário está carregando a role
    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        )
    }

    // Se no meio do processo for Visualizador e tiver em rota proibida, não renderiza nada 
    // até que o router re-aja ao useEffect redirecionando para /inventory
    if (role === 'Visualizador' && !pathname.startsWith('/inventory')) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        )
    }

    return <>{children}</>
}
