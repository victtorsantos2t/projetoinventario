"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
    Activity, Laptop, Wrench, Package, Box, Monitor, Smartphone, Printer, Cpu,
    History, AlertCircle, ShieldCheck, HeartPulse
} from "lucide-react"
import { useRouter } from "next/navigation"

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
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            href: "/inventory"
        },
        {
            title: "Em Uso",
            value: stats.emUso,
            icon: Activity,
            description: `${stats.total > 0 ? Math.round((stats.emUso / stats.total) * 100) : 0}% ativos`,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            href: "/inventory?status=Em uso"
        },
        {
            title: "Disponíveis",
            value: stats.disponivel,
            icon: Package,
            description: "Estoque Livre",
            color: "text-amber-600",
            bg: "bg-amber-50",
            href: "/inventory?status=Disponível"
        },
        {
            title: "Manutenção",
            value: stats.manutencao,
            icon: Wrench,
            description: "Aguardando Reparo",
            color: "text-rose-600",
            bg: "bg-rose-50",
            href: "/inventory?status=Manutenção"
        },
        {
            title: "Garantias",
            value: stats.garantiaVencendo || 0,
            icon: ShieldCheck,
            description: "A vencer (30 dias)",
            color: "text-blue-600",
            bg: "bg-blue-50",
            href: "/inventory?garantia=Vencendo"
        },
    ]

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-8">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        onClick={() => router.push(card.href)}
                        className="bg-white dark:bg-zinc-900/40 rounded-[2rem] p-6 lg:p-8 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-white/5 transition-all duration-500 group cursor-pointer active:scale-95"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${card.bg} dark:bg-white/5 group-hover:scale-110 transition-transform`}>
                                <card.icon className={`h-7 w-7 ${card.color} dark:text-white`} />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{card.title}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">{card.value}</span>
                                <span className="text-xs font-bold text-slate-300 dark:text-slate-600">unids</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">
                                {card.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alerta de Risco Crítico - Largura Total */}
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-rose-500 shadow-lg shadow-rose-200 flex items-center justify-center shrink-0">
                        <HeartPulse className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 dark:text-rose-200 font-black text-xl leading-tight">Gestão de Risco</h3>
                        <p className="text-rose-600 dark:text-rose-400 font-bold text-sm">Detectamos {stats.riscoCritico || 0} ativos com alto índice de falha.</p>
                    </div>
                </div>
                <button
                    onClick={() => router.push('/inventory?saude=Crítico')}
                    className="bg-white text-rose-600 font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
                >
                    Ver Ativos em Risco
                </button>
            </div>
        </>
    )
}
