"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"
import {
    Bell, Check, Info, AlertTriangle,
    CheckCircle2, XCircle, Clock, Search,
    Filter, Trash2, CheckSquare
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export default function NotificationsPage() {
    const { profile } = useUser()
    const router = useRouter()

    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<string>("all")

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            // 1. Buscar notificações
            const { data, error } = await supabase
                .from('notificacoes')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // 2. Buscar status de leitura
            let readStatuses: any[] = []
            if (profile?.id) {
                const { data: statusData } = await supabase
                    .from('notificacoes_status')
                    .select('notificacao_id, lido_at')
                    .eq('usuario_id', profile.id)
                readStatuses = statusData || []
            }

            const formatted = (data || [])
                .filter((n: any) => (!n.actor_id || n.actor_id !== profile?.id) && n.titulo && n.mensagem)
                .map((n: any) => ({
                    ...n,
                    lido: readStatuses.some(s => s.notificacao_id === n.id && !!s.lido_at)
                }))

            setNotifications(formatted)
        } catch (error: any) {
            console.error("Erro:", error)
            toast.error("Erro ao carregar notificações")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()

        const channel = supabase
            .channel('notifications_page')
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
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, lido: true } : n))
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
            setNotifications(prev => prev.map(n => ({ ...n, lido: true })))
            toast.success("Todas as notificações marcadas como lidas")
        }
    }

    const deleteNotification = async (id: string) => {
        // Implementar se necessário, por enquanto apenas marcamos como lido 
        // No schema atual a exclusão é física
        toast.info("Funcionalidade de exclusão física em desenvolvimento.")
    }

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />
            case 'error': return <XCircle className="h-5 w-5 text-rose-500" />
            default: return <Info className="h-5 w-5 text-blue-500" />
        }
    }

    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.titulo.toLowerCase().includes(search.toLowerCase()) ||
            n.mensagem.toLowerCase().includes(search.toLowerCase())
        const matchesType = filter === 'all' || n.tipo === filter
        return matchesSearch && matchesType
    })

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-text-primary dark:text-white flex items-center gap-3">
                        <Bell className="h-8 w-8 text-primary" />
                        Notificações
                    </h1>
                    <p className="text-sm font-medium text-text-secondary dark:text-slate-400 mt-1">
                        Acompanhe todos os alertas críticos, manutenções e atualizações do inventário.
                    </p>
                </div>
                <Button
                    onClick={markAllAsRead}
                    variant="outline"
                    className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold gap-2 self-start sm:self-center"
                >
                    <CheckSquare className="h-4 w-4" />
                    Marcar todas como lidas
                </Button>
            </div>

            {/* toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                        placeholder="Buscar em notificações..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 bg-white dark:bg-zinc-900 border-slate-200 rounded-xl"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scroll-hide">
                    {[
                        { id: 'all', label: 'Todas' },
                        { id: 'info', label: 'Informativo' },
                        { id: 'warning', label: 'Alertas' },
                        { id: 'error', label: 'Críticos' },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border",
                                filter === t.id
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                    : "bg-white dark:bg-zinc-900 text-slate-500 border-slate-200 hover:border-slate-300"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="h-8 w-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                        <p className="text-sm font-bold text-slate-400">Carregando histórico...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <Bell className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">Nenhuma notificação encontrada.</p>
                    </div>
                ) : (
                    filteredNotifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => {
                                markAsRead(n.id)
                                if (n.link) router.push(n.link)
                            }}
                            className={cn(
                                "group bg-white dark:bg-zinc-900 p-5 rounded-2xl border transition-all cursor-pointer relative",
                                n.lido
                                    ? "border-slate-100 opacity-70"
                                    : "border-primary/20 bg-primary/5 shadow-md shadow-primary/5 border-l-4 border-l-primary"
                            )}
                        >
                            <div className="flex gap-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                    n.tipo === 'success' ? "bg-emerald-50" :
                                        n.tipo === 'warning' ? "bg-amber-50" :
                                            n.tipo === 'error' ? "bg-rose-50" : "bg-blue-50"
                                )}>
                                    {getIcon(n.tipo)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={cn("font-black text-sm", n.lido ? "text-slate-600" : "text-slate-900")}>
                                            {n.titulo}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                        </div>
                                    </div>
                                    <p className={cn("text-xs leading-relaxed", n.lido ? "text-slate-400" : "text-slate-600")}>
                                        {n.mensagem}
                                    </p>

                                    <div className="mt-4 flex items-center gap-4">
                                        {n.link && (
                                            <Button variant="link" className="p-0 h-auto text-[11px] font-black text-primary uppercase tracking-widest">
                                                Visualizar Detalhes →
                                            </Button>
                                        )}
                                        {!n.lido && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    markAsRead(n.id)
                                                }}
                                                className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                                            >
                                                Lido
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
