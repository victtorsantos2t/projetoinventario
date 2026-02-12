"use client"

import { useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const THROTTLE_INTERVAL = 1000 // 1 second throttle for mousemove

export function AuthMonitor() {
    const router = useRouter()
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }, [router])

    const resetTimer = useCallback(() => {
        const now = Date.now()
        // Throttle: only reset if enough time has passed since last reset
        if (now - lastActivityRef.current < THROTTLE_INTERVAL) return
        lastActivityRef.current = now

        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT)
    }, [handleLogout])

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

        events.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true })
        })

        // Start initial timer
        resetTimer()

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer)
            })
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [resetTimer])

    return null
}
