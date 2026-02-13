"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Ativo } from "@/types"
import { AlertTriangle, ShieldAlert, HeartPulse, ChevronRight, Loader2, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface Alert {
    id: string
    type: 'saude' | 'garantia'
    title: string
    description: string
    severity: 'critical' | 'warning'
    assetId: string
}

export function AlertCenter() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function fetchAlerts() {
            setLoading(true)
            try {
                // 1. Fetch critical health assets
                const { data: criticalHealth } = await supabase
                    .from('ativos')
                    .select('*')
                    .lt('saude', 30)
                    .neq('status', 'Baixado')
                    .limit(5)

                // 2. Fetch expiring warranty assets
                const today = new Date()
                const next30Days = new Date()
                next30Days.setDate(today.getDate() + 30)

                const { data: expiringWarranty } = await supabase
                    .from('ativos')
                    .select('*')
                    .gt('data_garantia', today.toISOString())
                    .lte('data_garantia', next30Days.toISOString())
                    .neq('status', 'Baixado')
                    .limit(5)

                const newAlerts: Alert[] = []

                criticalHealth?.forEach(a => {
                    newAlerts.push({
                        id: `health-${a.id}`,
                        type: 'saude',
                        title: a.nome,
                        description: `Saúde crítica (${a.saude}%). Necessita manutenção.`,
                        severity: 'critical',
                        assetId: a.id
                    })
                })

                expiringWarranty?.forEach(a => {
                    newAlerts.push({
                        id: `warranty-${a.id}`,
                        type: 'garantia',
                        title: a.nome,
                        description: `Garantia vence em ${new Date(a.data_garantia!).toLocaleDateString('pt-BR')}`,
                        severity: 'warning',
                        assetId: a.id
                    })
                })

                setAlerts(newAlerts.sort((a, b) => a.severity === 'critical' ? -1 : 1))
            } catch (error) {
                console.error("Erro ao carregar alertas:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAlerts()
    }, [])

    if (loading) {
        return (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/4 mb-4" />
                <div className="space-y-3">
                    <div className="h-16 bg-slate-50 rounded-2xl" />
                    <div className="h-16 bg-slate-50 rounded-2xl" />
                </div>
            </div>
        )
    }

    if (alerts.length === 0) return null

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-rose-50/10">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <ShieldAlert className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Prioridades de Atenção</h2>
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-0.5">Alertas do Sistema</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-white text-slate-400 border-slate-200 font-black text-[9px]">
                    {alerts.length} ALERTAS
                </Badge>
            </div>

            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        onClick={() => router.push(`/inventory?id=${alert.assetId}`)}
                    >
                        <div className={cn(
                            "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                            alert.severity === 'critical' ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"
                        )}>
                            {alert.type === 'saude' ? <HeartPulse className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-bold text-slate-800 truncate">{alert.title}</span>
                                <Badge className={cn(
                                    "text-[8px] font-black uppercase px-1.5 py-0 rounded-md",
                                    alert.severity === 'critical' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                                )}>
                                    {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{alert.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />
                    </div>
                ))}
            </div>
        </div>
    )
}
