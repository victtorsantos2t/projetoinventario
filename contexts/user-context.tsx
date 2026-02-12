"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Profile } from "@/types"
import { logger } from "@/lib/logger"

interface UserContextType {
    role: string | null
    isAdmin: boolean
    isTecnico: boolean
    loading: boolean
    profile: Profile | null
    refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
    role: null,
    isAdmin: false,
    isTecnico: false,
    loading: true,
    profile: null,
    refreshProfile: async () => { },
})

export function UserProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<Profile | null>(null)

    useEffect(() => {
        async function getRole() {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*, setor:setores(nome)')
                        .eq('id', user.id)
                        .single()

                    if (error) {
                        logger.error("Erro ao buscar perfil:", error.message)
                    } else if (data) {
                        setRole(data.role)
                        setProfile(data)
                        logger.debug("Perfil carregado:", data.full_name, data.role)
                    }
                } else {
                    logger.debug("Nenhum usuário autenticado encontrado.")
                }
            } catch (error) {
                logger.error("Erro ao carregar role do usuário:", error)
            } finally {
                setLoading(false)
            }
        }
        getRole()
    }, [])

    const refreshProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*, setor:setores(nome)')
                    .eq('id', user.id)
                    .single()

                if (!error && data) {
                    setRole(data.role)
                    setProfile(data)
                }
            }
        } catch (error) {
            logger.error("Erro ao dar refresh no perfil:", error)
        }
    }

    const isAdmin = role === 'Admin'
    const isTecnico = role === 'Técnico' || role === 'Admin'

    return (
        <UserContext.Provider value={{ role, isAdmin, isTecnico, loading, profile, refreshProfile }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (!context) {
        throw new Error("useUser must be used within a UserProvider")
    }
    return context
}
