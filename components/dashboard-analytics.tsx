"use client"

import {
    Activity,
    ArrowDown,
    ArrowUp,
    Clock,
    ShieldAlert,
    Calendar,
    Zap,
    BarChart3,
    TrendingUp,
    Stethoscope,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface AnalyticsCardProps {
    title: string
    objective: string
    priority: "Alta" | "Média" | "Baixa"
    children: React.ReactNode
    className?: string
}

import { KPIInfo } from "@/components/kpi-info"

function AnalyticsCard({ title, objective, priority, children, className }: AnalyticsCardProps) {
    const priorityColors = {
        "Alta": "text-rose-500 bg-rose-50 dark:bg-rose-500/10",
        "Média": "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
        "Baixa": "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
    }

    return (
        <div className={cn(
            "glass-card p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2.5rem] flex flex-col h-full hover:shadow-premium transition-all duration-300",
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full", priorityColors[priority])}>
                            Prioridade {priority}
                        </span>
                    </div>
                    <h3 className="text-sm lg:text-base font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
                </div>
                <div className="text-slate-400 flex items-center gap-2">
                    <KPIInfo text={objective || "Métrica chave de desempenho."} />
                </div>
            </div>
            <div className="flex-1 mt-auto">
                {children}
            </div>
        </div>
    )
}

// 1. Tendência de Falhas
export function FailureTrendCard({ data }: { data: { percent: number, type: string, sector: string, isCritical?: boolean } }) {
    const isUp = data.percent > 0
    return (
        <AnalyticsCard title="Tendência de Falhas" objective="Monitora o aumento percentual de falhas nos últimos 30 dias. Altas taxas indicam instabilidade na infraestrutura." priority="Alta">
            <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                    <span className={cn("text-2xl lg:text-3xl font-black tracking-tighter", isUp ? "text-rose-500" : "text-emerald-500")}>
                        {isUp ? "↑" : "↓"} {Math.abs(data.percent)}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">vs 30 dias</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500">Principal Origem</span>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white">{data.type}</span>
                    </div>
                    <div className={cn("p-2 rounded-xl flex items-center justify-between", data.isCritical ? "bg-rose-50 dark:bg-rose-500/20 border border-rose-100 dark:border-rose-500/30" : "bg-slate-50 dark:bg-white/5")}>
                        <span className={cn("text-[10px] font-bold", data.isCritical ? "text-rose-600 dark:text-rose-300" : "text-slate-500")}>
                            {data.isCritical ? "Setor em Colapso" : "Setor Crítico"}
                        </span>
                        <span className={cn("text-[10px] font-black", data.isCritical ? "text-rose-700 dark:text-rose-100" : "text-slate-900 dark:text-white")}>
                            {data.sector}
                        </span>
                    </div>
                </div>
            </div>
        </AnalyticsCard>
    )
}

// 2. MTTR - Tempo Médio de Reparo
export function MTTRCard({ data }: { data: { current: string, target: string, trend: "up" | "down", bottleneck: string } }) {
    return (
        <AnalyticsCard title="MTTR — Tempo de Reparo" objective="Tempo Médio para Reparo. Indica a eficiência da equipe técnica. Valores altos impactam a produtividade da empresa." priority="Alta">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{data.current}</p>
                        <p className="text-[10px] font-bold text-slate-400">Meta operacional: {data.target}</p>
                    </div>
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", data.current < data.target ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500")}>
                        <Clock className="h-5 w-5" />
                    </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gargalo Identificado</p>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <ShieldAlert className="h-3 w-3" />
                        {data.bottleneck}
                    </p>
                </div>
            </div>
        </AnalyticsCard>
    )
}

// 3. Score de Risco Operacional por Setor (Refatorado para Foco em Manutenção)
export function SectorRiskScore({ sectors }: { sectors: { name: string, total: number, maintenance: number, percentage: number, isCritical: boolean }[] }) {
    return (
        <div className="glass-card p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2.5rem] space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm lg:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Risco de Parada por Setor</h3>
                <KPIInfo text="Identifica setores com maior volume de equipamentos parados ou críticos. Priorize ações onde o impacto operacional é maior." />
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {sectors.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs font-medium">Nenhum setor em risco no momento.</div>
                ) : (
                    sectors.map((s, i) => (
                        <div key={i} className={cn(
                            "flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl group transition-all relative overflow-hidden",
                            s.isCritical && "bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20"
                        )}>
                            {s.isCritical && (
                                <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />
                            )}

                            <div className={cn(
                                "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xs font-black z-10",
                                s.isCritical ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30" :
                                    s.percentage > 50 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            )}>
                                {s.maintenance}
                            </div>

                            <div className="min-w-0 flex-1 z-10">
                                <div className="flex justify-between items-baseline">
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{s.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{s.percentage}% Impacto</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", s.isCritical ? "bg-rose-500" : "bg-amber-500")}
                                            style={{ width: `${s.percentage}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500 truncate w-16 text-right">
                                        {s.maintenance}/{s.total} parados
                                    </p>
                                </div>
                                {s.isCritical && (
                                    <p className="text-[9px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                                        <ShieldAlert className="h-3 w-3" /> PARALISAÇÃO TOTAL
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

// 4 & 5. Previsões (Garantias e Ciclo de Vida)
export function LifecyclePrediction({ data }: { data: { warranties: number, endOfLife: number } }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-4 rounded-3xl relative">
                <div className="absolute top-4 right-4">
                    <KPIInfo text="Previsão de garantias expirando nos próximos 60 dias. Planeje renovações para evitar custos extras." />
                </div>
                <Calendar className="h-5 w-5 text-indigo-500 mb-3" />
                <p className="text-2xl font-black text-text-primary dark:text-white leading-none">{data.warranties}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Garantias / 60 dias</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-4 rounded-3xl relative">
                <div className="absolute top-4 right-4">
                    <KPIInfo text="Ativos atingindo o fim do ciclo de vida útil (EndOfLife). Considere substituição para manter a performance." />
                </div>
                <Activity className="h-5 w-5 text-rose-500 mb-3" />
                <p className="text-2xl font-black text-text-primary dark:text-white leading-none">{data.endOfLife}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Fim de Vida / 90 dias</p>
            </div>
        </div>
    )
}

// 6. Score Geral de Saúde da Infraestrutura
export function InfrastructureHealthScore({ score, trend }: { score: number, trend: number }) {
    return (
        <div className="bg-slate-900 dark:bg-primary-950 p-6 lg:p-8 rounded-[2rem] lg:rounded-[3rem] text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Stethoscope className="h-32 w-32" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] text-primary-400">Saúde Geral da Infraestrutura</p>
                    <KPIInfo text="Índice global de saúde da TI, calculado com base em chamados, manutenções ativas e idade dos ativos." />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-5xl lg:text-6xl font-black tracking-tighter">{score}%</span>
                    <div className="flex flex-col">
                        <span className={cn("text-sm font-black flex items-center gap-1", trend > 0 ? "text-emerald-400" : "text-rose-400")}>
                            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">vs semana passada</span>
                    </div>
                </div>
                <div className="mt-8 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        className="h-full bg-gradient-to-r from-primary-500 to-emerald-400"
                    />
                </div>
            </div>
        </div>
    )
}

// 7. Produtividade Operacional
export function TeamProductivity({ data }: { data: { avgResolutionTime: string, resolvedCount: number, reopenRate: number } }) {
    return (
        <div className="glass-card p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2.5rem] space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Eficiência da Equipe TI</h3>
                <KPIInfo text="Mede a eficiência da equipe de suporte através do tempo de resolução e taxa de reabertura." />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400">Tempo Médio</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{data.avgResolutionTime}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400">Taxa Reabertura</p>
                    <p className="text-lg font-black text-rose-500">{data.reopenRate}%</p>
                </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{data.resolvedCount} chamados resolvidos este mês</span>
            </div>
        </div>
    )
}

// 8. Recomendação Técnica Automática
export function AutomaticRecommendations({ recommendations }: { recommendations: { title: string, reason: string, priority: string }[] }) {
    const hasReplacement = recommendations.some(r => r.title.includes('Substituição') || r.priority === 'Alta')

    return (
        <div className={cn(
            "p-4 lg:p-6 rounded-[2rem] border transition-all duration-500",
            hasReplacement
                ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 shadow-lg shadow-red-500/5"
                : "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20"
        )}>
            <div className="flex items-center gap-2 mb-4">
                <Zap className={cn(
                    "h-5 w-5 animate-pulse",
                    hasReplacement ? "text-red-500" : "text-indigo-500"
                )} />
                <h3 className="text-sm lg:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Recomendações Automáticas</h3>
                <div className="ml-auto">
                    <KPIInfo text="Sugestões geradas por IA baseadas em padrões identificados nos dados de inventário e manutenção." />
                </div>
            </div>
            <div className="space-y-4">
                {recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-3">
                        {rec.title.includes('Substituição') || rec.priority === 'Alta' ? (
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">{rec.title}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{rec.reason}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
