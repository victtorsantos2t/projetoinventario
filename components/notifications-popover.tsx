"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"
import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle, Trash2, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function NotificationsPopover() {
    const { profile } = useUser()
    const router = useRouter()
    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const fetchNotifications = async () => {
        // Buscar notificações
        const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error("Erro ao buscar notificações:", error)
            return
        }

        // Buscar status de leitura se o usuário estiver logado
        let readStatuses: any[] = []
        if (profile?.id) {
            const { data: statusData } = await supabase
                .from('notificacoes_status')
                .select('notificacao_id, lido_at')
                .eq('usuario_id', profile.id)

            readStatuses = statusData || []
        }

        const formatted = data.map((n: any) => ({
            ...n,
            lido: readStatuses.some(s => s.notificacao_id === n.id && !!s.lido_at)
        }))

        setNotifications(formatted)
        setUnreadCount(formatted.filter(n => !n.lido).length)
    }

    useEffect(() => {
        fetchNotifications()

        // Realtime subscription
        const channel = supabase
            .channel('notificacoes_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, () => {
                fetchNotifications()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [profile?.id])

    const markAsRead = async (id: string) => {
        if (!profile?.id) return

        const { error } = await supabase
            .from('notificacoes_status')
            .upsert({
                notificacao_id: id,
                usuario_id: profile.id,
                lido_at: new Date().toISOString()
            }, { onConflict: 'notificacao_id,usuario_id' })

        if (!error) {
            fetchNotifications()
        }
    }

    const markAllAsRead = async () => {
        if (!profile?.id || notifications.length === 0) return

        const unreadIds = notifications.filter(n => !n.lido).map(n => n.id)
        if (unreadIds.length === 0) return

        const updates = unreadIds.map(id => ({
            notificacao_id: id,
            usuario_id: profile.id,
            lido_at: new Date().toISOString()
        }))

        const { error } = await supabase
            .from('notificacoes_status')
            .upsert(updates, { onConflict: 'notificacao_id,usuario_id' })

        if (!error) {
            fetchNotifications()
            toast.success("Todas as notificações marcadas como lidas")
        }
    }

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />
            case 'error': return <XCircle className="h-4 w-4 text-rose-500" />
            default: return <Info className="h-4 w-4 text-blue-500" />
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-slate-100 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <DropdownMenuLabel className="p-0 font-bold text-slate-700">Notificações</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="h-7 text-[11px] font-bold text-primary hover:text-primary/80 p-0 px-2"
                        >
                            Marcar todas como lidas
                        </Button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                <Bell className="h-5 w-5 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Nenhuma notificação por aqui.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={cn(
                                    "p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group",
                                    !n.lido && "bg-blue-50/30"
                                )}
                                onClick={() => {
                                    markAsRead(n.id)
                                    if (n.link) {
                                        router.push(n.link)
                                    }
                                }}
                            >
                                <div className="flex gap-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                        n.tipo === 'success' ? "bg-emerald-50" :
                                            n.tipo === 'warning' ? "bg-amber-50" :
                                                n.tipo === 'error' ? "bg-rose-50" : "bg-blue-50"
                                    )}>
                                        {getIcon(n.tipo)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className={cn("text-xs font-bold truncate", n.lido ? "text-slate-600" : "text-slate-900")}>
                                                {n.titulo}
                                            </p>
                                            {!n.lido && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                        </div>
                                        <p className={cn("text-xs leading-relaxed mb-2 line-clamp-2", n.lido ? "text-slate-400 font-medium" : "text-slate-600 font-semibold")}>
                                            {n.mensagem}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="p-2 border-t border-slate-50 bg-slate-50/30">
                        <Button variant="ghost" className="w-full h-8 text-xs font-bold text-slate-500 hover:text-slate-700">
                            Ver tudo
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
