"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, Laptop, Wrench, Package, Box } from "lucide-react"
import { useRouter } from "next/navigation"

interface DashboardStats {
    total: number
    emUso: number
    manutencao: number
    disponivel: number
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
    ]

    return (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <div
                    key={card.title}
                    onClick={() => router.push(card.href)}
                    className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group cursor-pointer active:scale-95"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${card.bg} group-hover:scale-110 transition-transform`}>
                            <card.icon className={`h-7 w-7 ${card.color}`} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{card.value}</span>
                            <span className="text-xs font-bold text-slate-300">unids</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">
                            {card.description}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
