"use client"

import {
    Activity, Laptop, Wrench, Box,
    ShieldCheck, HeartPulse, ShieldAlert, ArrowUpRight
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { KPIInfo } from "@/components/kpi-info"

interface DashboardStats {
    total: number
    emUso: number
    manutencao: number
    disponivel: number
    riscoCritico?: number
    garantiaVencendo?: number
}

export function DashboardCards({ stats }: { stats: DashboardStats }) {
    const router = useRouter()

    const cards = [
        {
            title: "Total de Ativos",
            value: stats.total,
            icon: Box,
            description: "Frota Completa",
            color: "text-primary-600",
            bg: "bg-primary-50",
            href: "/inventory",
            trend: "estável",
            tooltip: "Contagem total de equipamentos cadastrados no sistema, incluindo em uso, estoque e manutenção."
        },
        {
            title: "Em Uso",
            value: stats.emUso,
            icon: Activity,
            description: `${stats.total > 0 ? Math.round((stats.emUso / stats.total) * 100) : 0}% ativos`,
            color: "text-success-600",
            bg: "bg-success-50",
            href: "/inventory?status=Em uso",
            trend: "up",
            tooltip: "Ativos atualmente alocados e produtivos. Taxas muito baixas podem indicar equipamentos ociosos."
        },
        {
            title: "Disponíveis",
            value: stats.disponivel,
            icon: Box,
            description: "Estoque Livre",
            color: "text-alert-600",
            bg: "bg-alert-50",
            href: "/inventory?status=Disponível",
            trend: "estável",
            tooltip: "Ativos em estoque prontos para uso imediato (Backup)."
        },
        {
            title: "Manutenção",
            value: stats.manutencao,
            icon: Wrench,
            description: "Aguardando Reparo",
            color: "text-critical-600",
            bg: "bg-critical-50",
            href: "/inventory?status=Manutenção",
            trend: stats.manutencao > 5 ? "up" : "estável",
            tooltip: "Ativos indisponíveis aguardando reparo técnico."
        },
        {
            title: "Garantias",
            value: stats.garantiaVencendo || 0,
            icon: ShieldCheck,
            description: "Perto do vencimento",
            color: "text-primary-500",
            bg: "bg-primary-50",
            href: "/inventory?garantia=Vencendo",
            trend: "estável",
            tooltip: "Ativos com garantia expirando nos próximos 30 dias."
        },
    ]

    return (
        <div className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        onClick={() => router.push(card.href)}
                        className="bg-white dark:bg-zinc-900 group relative overflow-hidden p-6 shadow-sm border border-slate-100 dark:border-white/5 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] rounded-2xl"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110",
                                    card.bg,
                                    "bg-opacity-100 dark:bg-opacity-20"
                                )}>
                                    <card.icon className={cn("h-6 w-6", card.color)} />
                                </div>
                                <div className="h-6 flex items-center gap-1.5 px-2 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    {card.trend === "up" ? (
                                        <ArrowUpRight className="h-3 w-3 text-success-500" />
                                    ) : (
                                        <div className="h-0.5 w-2 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                    )}
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {card.trend === "up" ? "Alta" : "Estável"}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">
                                    {card.title}
                                </p>
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <KPIInfo text={card.tooltip || ""} />
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-black tracking-tight text-text-primary dark:text-white">
                                        {card.value}
                                    </span>
                                    <span className="text-[10px] font-bold text-text-muted lowercase">
                                        items
                                    </span>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-1000", card.color.replace('text-', 'bg-'))}
                                            style={{ width: card.title === "Total de Ativos" ? '100%' : `${(card.value / (stats.total || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-bold text-text-muted tabular-nums">
                                        {card.description}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
