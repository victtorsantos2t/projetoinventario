"use client"

import { ShieldAlert, Activity, ShieldCheck, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface HeroProps {
    stats: {
        criticos: number
        emRisco: number
        operacionais: number
    }
}

export function DashboardHero({ stats }: HeroProps) {
    const router = useRouter()

    const items = [
        {
            label: "ATIVOS CRÍTICOS",
            value: stats.criticos,
            context: "Offline ou falha grave",
            icon: ShieldAlert,
            // CRÍTICO: Background critical-50, Ícone critical-600, Borda critical-200
            cardStyles: "bg-critical-50 dark:bg-critical-900/10 border-critical-200 dark:border-critical-800",
            iconBg: "bg-critical-100 dark:bg-critical-900/30",
            iconColor: "text-critical-600",
            labelColor: "text-critical-700/60",
            valueColor: "text-critical-700",
            shadow: "shadow-sm hover:shadow-md",
            href: "/inventory?saude=Crítico",
        },
        {
            label: "EM RISCO",
            value: stats.emRisco,
            context: "Manutenção próxima",
            icon: Activity,
            // ALERTA: Background alert-50, Ícone alert-500
            cardStyles: "bg-alert-50 dark:bg-alert-900/10 border-alert-200 dark:border-alert-800",
            iconBg: "bg-alert-100 dark:bg-alert-900/30",
            iconColor: "text-alert-600",
            labelColor: "text-alert-700/60",
            valueColor: "text-alert-700",
            shadow: "shadow-sm hover:shadow-md",
            href: "/inventory?saude=Atenção",
        },
        {
            label: "OPERACIONAIS",
            value: stats.operacionais,
            context: "Funcionando normal",
            icon: ShieldCheck,
            // NORMAL: Background surface-default, Ícone primary-500
            cardStyles: "bg-white dark:bg-zinc-900 border-slate-100 dark:border-white/5",
            iconBg: "bg-primary-50 dark:bg-primary-900/20",
            iconColor: "text-primary-500",
            labelColor: "text-slate-400 dark:text-slate-500",
            valueColor: "text-slate-900 dark:text-white",
            shadow: "shadow-sm hover:shadow-md",
            href: "/inventory?status=Em uso",
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((item) => (
                <div
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className={cn(
                        "group relative overflow-hidden border p-4 sm:p-5 lg:p-8 cursor-pointer transition-all duration-200 hover:-translate-y-1",
                        "rounded-[1.5rem] lg:rounded-[2.5rem]",
                        item.cardStyles,
                        item.shadow
                    )}
                >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-3 lg:mb-6">
                            <div className={cn("h-10 w-10 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110", item.iconBg)}>
                                <item.icon className={cn("h-5 w-5 lg:h-7 lg:w-7", item.iconColor)} />
                            </div>
                            <div className="h-7 w-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <ArrowUpRight className="h-3 w-3 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <p className={cn("text-[8px] lg:text-[10px] font-black uppercase tracking-[0.3em] mb-1", item.labelColor)}>
                                {item.label}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className={cn("text-2xl sm:text-3xl lg:text-5xl font-black tracking-tighter", item.valueColor)}>
                                    {item.value}
                                </span>
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400">ativos</span>
                            </div>
                            <p className="mt-2 lg:mt-3 text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed truncate lg:whitespace-normal">
                                {item.context}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
