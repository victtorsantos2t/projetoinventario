"use client"

import { Laptop, Phone, Tablet, Monitor, Server, Box } from "lucide-react"
import { cn } from "@/lib/utils"
// removed local KPIInfo
import { KPIInfo } from "@/components/kpi-info"

interface ChartData {
    label: string
    value: number
    color: string
    icon: any
}

export function AssetDistributionChart({ data, total }: { data: ChartData[], total: number }) {
    return (
        <div className="glass-card p-4 lg:p-6 h-full flex flex-col rounded-[1.5rem] lg:rounded-xl hover:shadow-premium transition-all duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-6">
                <h3 className="text-[10px] lg:text-sm font-black text-slate-400 dark:text-white uppercase tracking-widest">Distribuição da Frota</h3>
                <KPIInfo text="Visão geral da composição da frota por tipo de equipamento. Ajuda a entender a diversidade do parque tecnológico." />
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
                {/* Visual Bar Distribution */}
                <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                    {data.map((item, idx) => (
                        <div
                            key={idx}
                            style={{ width: `${(item.value / (total || 1)) * 100}%` }}
                            className={cn("h-full transition-all duration-1000", item.color)}
                            title={`${item.label}: ${item.value}`}
                        />
                    ))}
                </div>

                {/* Legend/Items */}
                <div className="grid grid-cols-2 gap-4">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group cursor-default">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-opacity-10 dark:bg-opacity-20", item.color.replace('bg-', 'bg-'))}>
                                <item.icon className={cn("h-4 w-4", item.color.replace('bg-', 'text-'))} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase truncate">{item.label}</p>
                                <p className="text-xs lg:text-sm font-black text-slate-900 dark:text-white">
                                    {item.value} <span className="text-[8px] lg:text-[10px] font-bold text-slate-400 lowercase italic">unid</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function SectorRanking({ sectors }: { sectors: { name: string, count: number }[] }) {
    const max = Math.max(...sectors.map(s => s.count), 1)

    return (
        <div className="glass-card p-4 lg:p-6 h-full flex flex-col rounded-[1.5rem] lg:rounded-xl hover:shadow-premium transition-all duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-6">
                <h3 className="text-[10px] lg:text-sm font-black text-slate-400 dark:text-white uppercase tracking-widest">Ativos por Setor</h3>
                <KPIInfo text="Ranking de setores por volume de ativos alocados. Indica onde estão concentrados os recursos da empresa." />
            </div>
            <div className="space-y-4 flex-1">
                {sectors.slice(0, 5).map((sector, idx) => (
                    <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate pr-4">
                                {sector.name || "Não atribuído"}
                            </span>
                            <span className="text-xs font-black text-primary">
                                {sector.count}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${(sector.count / max) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
