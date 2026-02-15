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
                // Ativos com saúde crítica (< 30%)
                const { data: criticalHealth } = await supabase
                    .from('ativos')
                    .select('*')
                    .lt('saude', 30)
                    .neq('status', 'Baixado')
                    .limit(5)

                // Garantias vencendo — usar view que calcula flags reais
                const { data: expiringWarranty } = await supabase
                    .from('v_inventario_geral')
                    .select('id, nome, garantia_meses, tem_garantia')
                    .eq('garantia_vencendo', true)
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
                        description: `Garantia de ${a.garantia_meses || 0} meses próxima do vencimento.`,
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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 p-6 animate-pulse shadow-sm">
                <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-1/4 mb-4" />
                <div className="space-y-3">
                    <div className="h-16 bg-slate-50 dark:bg-white/5 rounded-xl" />
                    <div className="h-16 bg-slate-50 dark:bg-white/5 rounded-xl" />
                </div>
            </div>
        )
    }

    if (alerts.length === 0) return null

    return (
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-critical-50 dark:bg-critical-900/20 flex items-center justify-center">
                        <ShieldAlert className="h-6 w-6 text-critical-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-text-primary dark:text-white tracking-tight">Prioridades de Atenção</h2>
                        <p className="text-[10px] font-black text-critical-600 uppercase tracking-[0.2em] mt-0.5 italic">Mission Critical</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                    <span className="h-2 w-2 rounded-full bg-critical-500 animate-pulse" />
                    <span className="text-[10px] font-black text-text-secondary dark:text-slate-400 uppercase tracking-widest leading-none">
                        {alerts.length} Incidentes
                    </span>
                </div>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-white/5 max-h-[450px] overflow-y-auto scrollbar-hide">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className="px-8 py-5 flex items-center gap-5 hover:bg-neutral-subtle dark:hover:bg-white/5 transition-all duration-200 cursor-pointer group"
                        onClick={() => router.push(`/inventory?id=${alert.assetId}`)}
                    >
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm",
                            alert.severity === 'critical'
                                ? "bg-critical-50 dark:bg-critical-900/10 text-critical-600 border border-critical-100 dark:border-critical-900/20"
                                : "bg-alert-50 dark:bg-alert-900/10 text-alert-600 border border-alert-100 dark:border-alert-900/20"
                        )}>
                            {alert.type === 'saude' ? <HeartPulse className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base font-bold text-text-primary dark:text-slate-100 truncate group-hover:text-primary-600 transition-colors">
                                    {alert.title}
                                </span>
                                <div className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest",
                                    alert.severity === 'critical' ? "bg-critical-500 text-white" : "bg-alert-500 text-white"
                                )}>
                                    {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
                                </div>
                            </div>
                            <p className="text-sm text-text-secondary dark:text-slate-400 font-medium leading-relaxed">
                                {alert.description}
                            </p>
                        </div>

                        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                            <ChevronRight className="h-5 w-5 text-primary-500" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
