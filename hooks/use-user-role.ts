"use client"

import { useUser } from "@/contexts/user-context"

/**
 * Hook de compatibilidade — delega para o UserContext.
 * Componentes podem migrar para useUser() diretamente.
 */
export function useUserRole() {
    return useUser()
}
