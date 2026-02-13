"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"

import { useUser } from "@/contexts/user-context"

import { exportToExcel, INVENTORY_COLUMNS } from "@/lib/export-utils"
import {
    Wrench, Download, Activity, AlertTriangle, TrendingUp,
    Calendar, Filter, Heart, Shield, BarChart3
} from "lucide-react"
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area, Legend, RadialBarChart, RadialBar,
} from "recharts"

// ── Paleta & constantes ──
const COLORS = {
    primary: "#6366f1",    // indigo
    success: "#10b981",    // emerald
    warning: "#f59e0b",    // amber
    danger: "#ef4444",     // red
    info: "#3b82f6",       // blue
    purple: "#8b5cf6",
    pink: "#ec4899",
    orange: "#f97316",
    teal: "#14b8a6",
    slate: "#64748b",
}

const STATUS_COLORS: Record<string, string> = {
    "Em uso": COLORS.primary,
    "Disponível": COLORS.success,
    "Manutenção": COLORS.warning,
    "Baixado": COLORS.danger,
}

const TIPO_MANUT_COLORS: Record<string, string> = {
    "Corretiva": COLORS.danger,
    "Preventiva": COLORS.success,
    "Upgrade": COLORS.info,
    "Outro": COLORS.slate,
}

const SAUDE_COLORS: Record<string, string> = {
    "Excelente": COLORS.success,
    "Bom": COLORS.teal,
    "Atenção": COLORS.warning,
    "Crítico": COLORS.danger,
}

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// ── Tooltip customizado ──
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 shadow-xl">
            {label && <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>}
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-sm font-black" style={{ color: p.color || p.fill }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    )
}

// ── Label do Pie ──
function renderPieLabel({ name, percent }: any) {
    if (percent < 0.05) return null
    return `${name} ${(percent * 100).toFixed(0)}%`
}

// ── Componente KPI ──
function KpiCard({ icon: Icon, label, value, color, sub }: {
    icon: any; label: string; value: string | number; color: string; sub?: string
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{label}</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
        </div>
    )
}

// ── Componente Card gráfico ──
function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${className}`}>
            <h3 className="text-sm font-black text-slate-700 mb-4">{title}</h3>
            {children}
        </div>
    )
}

// ════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════
export default function AnalyticsPage() {
    const { profile } = useUser()
    const isViewer = profile?.role === "Viewer"

    // State
    const [ativos, setAtivos] = useState<any[]>([])
    const [manutencoes, setManutencoes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [periodo, setPeriodo] = useState<"6m" | "1y" | "all">("1y")

    // ── Fetch Data ──
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Ativos
                let qAtivos = supabase.from("v_inventario_geral").select("*")
                if (isViewer && profile?.setor_id) {
                    const { data: setorData } = await supabase.from("setores").select("nome").eq("id", profile.setor_id).single()
                    if (setorData?.nome) qAtivos = qAtivos.eq("setor", setorData.nome)
                }
                const { data: ativosData } = await qAtivos
                if (ativosData) setAtivos(ativosData)

                // Manutenções
                let qManut = supabase.from("manutencoes").select(`
                    *,
                    ativo:ativos ( nome, tipo, serial )
                `).order("data_manutencao", { ascending: false })
                const { data: manutData } = await qManut
                if (manutData) setManutencoes(manutData)
            } catch (e) {
                console.error("Erro ao carregar analytics:", e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [isViewer, profile])

    // ── Filtro de período ──
    const cutoffDate = useMemo(() => {
        if (periodo === "all") return null
        const d = new Date()
        d.setMonth(d.getMonth() - (periodo === "6m" ? 6 : 12))
        return d
    }, [periodo])

    const manutFiltradas = useMemo(() => {
        if (!cutoffDate) return manutencoes
        return manutencoes.filter(m => new Date(m.data_manutencao) >= cutoffDate)
    }, [manutencoes, cutoffDate])

    // ════════════════════════
    // KPIs
    // ════════════════════════
    const kpis = useMemo(() => {
        const totalManut = manutFiltradas.length
        const corretivas = manutFiltradas.filter(m => m.tipo === "Corretiva").length
        const preventivas = manutFiltradas.filter(m => m.tipo === "Preventiva").length
        const upgrades = manutFiltradas.filter(m => m.tipo === "Upgrade").length

        // Ativos em manutenção agora
        const emManutencao = ativos.filter(a => a.status === "Manutenção").length

        // Saúde média
        const comSaude = ativos.filter(a => a.saude != null)
        const saudeMedia = comSaude.length > 0
            ? Math.round(comSaude.reduce((s, a) => s + (a.saude || 0), 0) / comSaude.length)
            : 100

        // Ativos únicos que receberam manutenção
        const ativosUnicos = new Set(manutFiltradas.map(m => m.ativo_id)).size

        return { totalManut, corretivas, preventivas, upgrades, emManutencao, saudeMedia, ativosUnicos }
    }, [manutFiltradas, ativos])

    // ════════════════════════
    // GRÁFICO 1: Manutenções por Tipo (Donut)
    // ════════════════════════
    const manutPorTipo = useMemo(() => {
        const map: Record<string, number> = {}
        manutFiltradas.forEach(m => {
            const tipo = m.tipo || "Outro"
            map[tipo] = (map[tipo] || 0) + 1
        })
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [manutFiltradas])

    // ════════════════════════
    // GRÁFICO 2: Manutenções por Mês (Area)
    // ════════════════════════
    const manutPorMes = useMemo(() => {
        const map: Record<string, { corretiva: number; preventiva: number; upgrade: number; outro: number }> = {}
        manutFiltradas.forEach(m => {
            const d = new Date(m.data_manutencao)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
            if (!map[key]) map[key] = { corretiva: 0, preventiva: 0, upgrade: 0, outro: 0 }
            const tipo = (m.tipo || "Outro").toLowerCase() as keyof typeof map[string]
            if (tipo in map[key]) map[key][tipo]++
        })
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => {
                const [y, m] = key.split("-")
                return { name: `${months[parseInt(m) - 1]}/${y.slice(2)}`, ...val }
            })
    }, [manutFiltradas])

    // ════════════════════════
    // GRÁFICO 3: Top 10 Ativos com mais manutenções (Bar horizontal)
    // ════════════════════════
    const topAtivos = useMemo(() => {
        const map: Record<string, { nome: string; total: number; corretiva: number }> = {}
        manutFiltradas.forEach(m => {
            const id = m.ativo_id
            const nome = m.ativo?.nome || "Desconhecido"
            if (!map[id]) map[id] = { nome, total: 0, corretiva: 0 }
            map[id].total++
            if (m.tipo === "Corretiva") map[id].corretiva++
        })
        return Object.values(map)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
    }, [manutFiltradas])

    // ════════════════════════
    // GRÁFICO 4: Saúde da Frota (Distribuição)
    // ════════════════════════
    const saudeDistrib = useMemo(() => {
        const faixas = { "Excelente": 0, "Bom": 0, "Atenção": 0, "Crítico": 0 }
        ativos.forEach(a => {
            const s = a.saude ?? 100
            if (s > 75) faixas["Excelente"]++
            else if (s > 50) faixas["Bom"]++
            else if (s > 25) faixas["Atenção"]++
            else faixas["Crítico"]++
        })
        return Object.entries(faixas)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name, value }))
    }, [ativos])

    // ════════════════════════
    // GRÁFICO 5: Status dos Ativos (Donut simples)
    // ════════════════════════
    const statusDistrib = useMemo(() => {
        const map: Record<string, number> = {}
        ativos.forEach(a => {
            const s = a.status || "Disponível"
            map[s] = (map[s] || 0) + 1
        })
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [ativos])

    // ════════════════════════
    // GRÁFICO 6: Manutenções por Tipo de Ativo (Bar)
    // ════════════════════════
    const manutPorTipoAtivo = useMemo(() => {
        const map: Record<string, number> = {}
        manutFiltradas.forEach(m => {
            const tipo = m.ativo?.tipo || "Outro"
            map[tipo] = (map[tipo] || 0) + 1
        })
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [manutFiltradas])

    // ── Export ──
    const handleExport = async () => {
        try {
            const { data } = await supabase.from("v_inventario_geral").select("*")
            if (data) exportToExcel(data, INVENTORY_COLUMNS, `inventario_completo_${new Date().toISOString().slice(0, 10)}`)
        } catch (e) {
            console.error("Erro ao exportar:", e)
        }
    }

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-400">Carregando analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Wrench className="h-7 w-7 text-indigo-500" />
                        Central de Manutenções
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Inteligência de dados sobre manutenções e saúde dos ativos</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filtro de período */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
                        <Filter className="h-4 w-4 text-slate-400 ml-2" />
                        {(["6m", "1y", "all"] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriodo(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === p
                                    ? "bg-indigo-500 text-white shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                {p === "6m" ? "6 meses" : p === "1y" ? "1 ano" : "Tudo"}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 shadow-sm shadow-indigo-200 transition-all"
                    >
                        <Download className="h-4 w-4" /> Exportar Excel
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={Wrench} label="Total de Manutenções" value={kpis.totalManut} color={COLORS.primary}
                    sub={`${kpis.ativosUnicos} ativos distintos`} />
                <KpiCard icon={AlertTriangle} label="Corretivas" value={kpis.corretivas} color={COLORS.danger}
                    sub={kpis.totalManut > 0 ? `${Math.round(kpis.corretivas / kpis.totalManut * 100)}% do total` : "—"} />
                <KpiCard icon={Shield} label="Preventivas" value={kpis.preventivas} color={COLORS.success}
                    sub={kpis.totalManut > 0 ? `${Math.round(kpis.preventivas / kpis.totalManut * 100)}% do total` : "—"} />
                <KpiCard icon={Heart} label="Saúde Média da Frota" value={`${kpis.saudeMedia}%`} color={
                    kpis.saudeMedia > 75 ? COLORS.success : kpis.saudeMedia > 50 ? COLORS.warning : COLORS.danger
                } sub={`${kpis.emManutencao} ativo(s) em manutenção agora`} />
            </div>

            {/* Row 1: Tipo de manutenção + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Donut: Tipo */}
                <ChartCard title="Manutenções por Tipo" className="lg:col-span-2">
                    {manutPorTipo.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Nenhuma manutenção registrada</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={manutPorTipo}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={renderPieLabel}
                                    labelLine={false}
                                >
                                    {manutPorTipo.map((entry) => (
                                        <Cell key={entry.name} fill={TIPO_MANUT_COLORS[entry.name] || COLORS.slate} />
                                    ))}
                                </Pie>
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(v: string) => <span className="text-xs font-bold text-slate-600">{v}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Area: Evolução mensal */}
                <ChartCard title="Evolução de Manutenções por Mês" className="lg:col-span-3">
                    {manutPorMes.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Dados insuficientes</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={manutPorMes}>
                                <defs>
                                    <linearGradient id="gradCorretiva" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradPreventiva" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradUpgrade" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(v: string) => <span className="text-xs font-bold text-slate-600 capitalize">{v}</span>}
                                />
                                <Area type="monotone" dataKey="corretiva" name="Corretiva" stroke={COLORS.danger} fill="url(#gradCorretiva)" strokeWidth={2} />
                                <Area type="monotone" dataKey="preventiva" name="Preventiva" stroke={COLORS.success} fill="url(#gradPreventiva)" strokeWidth={2} />
                                <Area type="monotone" dataKey="upgrade" name="Upgrade" stroke={COLORS.info} fill="url(#gradUpgrade)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* Row 2: Top ativos + Saúde */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bar: Top ativos */}
                <ChartCard title="Top 10 — Ativos com Mais Manutenções">
                    {topAtivos.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Nenhum dado disponível</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(280, topAtivos.length * 36)}>
                            <BarChart data={topAtivos} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                                <YAxis
                                    dataKey="nome" type="category"
                                    tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                                    width={130}
                                />
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend formatter={(v: string) => <span className="text-xs font-bold text-slate-600">{v}</span>} />
                                <Bar dataKey="corretiva" name="Corretivas" fill={COLORS.danger} radius={[0, 4, 4, 0]} stackId="a" />
                                <Bar dataKey="total" name="Total" fill={COLORS.primary} radius={[0, 4, 4, 0]} stackId="b" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Donut: Saúde da Frota */}
                <ChartCard title="Saúde da Frota">
                    {saudeDistrib.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Nenhum dado disponível</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={saudeDistrib}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={95}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={renderPieLabel}
                                    labelLine={false}
                                >
                                    {saudeDistrib.map((entry) => (
                                        <Cell key={entry.name} fill={SAUDE_COLORS[entry.name] || COLORS.slate} />
                                    ))}
                                </Pie>
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(v: string) => <span className="text-xs font-bold text-slate-600">{v}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* Row 3: Status dos ativos + Manutenções por tipo de ativo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Donut: Status */}
                <ChartCard title="Distribuição por Status">
                    {statusDistrib.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Nenhum dado disponível</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={statusDistrib}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={95}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={renderPieLabel}
                                    labelLine={false}
                                >
                                    {statusDistrib.map((entry) => (
                                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || COLORS.slate} />
                                    ))}
                                </Pie>
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(v: string) => <span className="text-xs font-bold text-slate-600">{v}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Bar: Manutenções por tipo de ativo */}
                <ChartCard title="Manutenções por Tipo de Equipamento">
                    {manutPorTipoAtivo.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Nenhum dado disponível</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={manutPorTipoAtivo}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                                <ReTooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Manutenções" radius={[8, 8, 0, 0]}>
                                    {manutPorTipoAtivo.map((_, i) => (
                                        <Cell key={i} fill={[COLORS.primary, COLORS.info, COLORS.purple, COLORS.teal, COLORS.orange, COLORS.pink][i % 6]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* ══════════════════════════════════════════════════ */}
            {/* SEÇÃO 2: LICENCIAMENTO DE SOFTWARE (Nova)          */}
            {/* ══════════════════════════════════════════════════ */}
            <SoftwareAnalyticsSection />
        </div >
    )
}

function SoftwareAnalyticsSection() {
    const [softwares, setSoftwares] = useState<any[]>([])
    const [licencas, setLicencas] = useState<any[]>([])
    const [instalacoes, setInstalacoes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSoftwareData = async () => {
            try {
                const { data: sData } = await supabase.from('softwares').select('id, nome, fabricante, categoria')
                if (sData) setSoftwares(sData)

                const { data: lData } = await supabase.from('licencas').select('*')
                if (lData) setLicencas(lData)

                const { data: iData } = await supabase.from('licencas_ativos').select('*')
                if (iData) setInstalacoes(iData)
            } catch (error) {
                console.error("Erro ao carregar dados de software:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchSoftwareData()
    }, [])

    const kpis = useMemo(() => {
        const totalSoftwares = softwares.length
        const totalLicencas = licencas.reduce((acc, l) => acc + (l.qtd_adquirida || 0), 0)
        const totalInstaladas = instalacoes.length

        // Estimativa de custo (apenas licenças com custo preenchido)
        const custoTotal = licencas.reduce((acc, l) => acc + (l.custo || 0), 0)

        // Licenças expirando em 30 dias
        const hoje = new Date()
        const trintaDias = new Date()
        trintaDias.setDate(hoje.getDate() + 30)

        const expirando = licencas.filter(l => {
            if (!l.data_expiracao) return false
            const d = new Date(l.data_expiracao)
            return d >= hoje && d <= trintaDias
        }).length

        return { totalSoftwares, totalLicencas, totalInstaladas, custoTotal, expirando }
    }, [softwares, licencas, instalacoes])

    const instalacoesPorSoftware = useMemo(() => {
        const map: Record<string, number> = {}
        instalacoes.forEach(i => {
            // Como instalacoes nao tem nome do software direto (tem licenca_id), precisamos cruzar
            const lic = licencas.find(l => l.id === i.licenca_id)
            if (lic) {
                const soft = softwares.find(s => s.id === lic.software_id)
                const nome = soft?.nome || "Desconhecido"
                map[nome] = (map[nome] || 0) + 1
            }
        })
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10) // Top 10
    }, [instalacoes, licencas, softwares])

    const licencaPorTipo = useMemo(() => {
        const map: Record<string, number> = {}
        licencas.forEach(l => {
            const tipo = l.tipo || "Outro"
            map[tipo] = (map[tipo] || 0) + 1
        })
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [licencas])

    if (loading) return <div className="py-10 text-center text-slate-400 text-sm">Carregando dados de software...</div>

    return (
        <div className="space-y-6 mt-10">
            <div className="border-t border-slate-200 pt-8">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-1">
                    <Activity className="h-6 w-6 text-indigo-500" />
                    Licenças e Softwares
                </h2>
                <p className="text-sm text-slate-400">Visão geral do parque de software instalado</p>
            </div>

            {/* KPIs Software */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={Download} label="Softwares Homologados" value={kpis.totalSoftwares} color={COLORS.purple} />
                <KpiCard icon={Shield} label="Total Licenças" value={kpis.totalLicencas} color={COLORS.info}
                    sub={`${kpis.totalInstaladas} em uso (${kpis.totalLicencas > 0 ? Math.round(kpis.totalInstaladas / kpis.totalLicencas * 100) : 0}%)`} />
                <KpiCard icon={TrendingUp} label="Valor Investido" value={`R$ ${kpis.custoTotal.toLocaleString('pt-BR')}`} color={COLORS.success} />
                <KpiCard icon={AlertTriangle} label="Expirando em 30 dias" value={kpis.expirando} color={kpis.expirando > 0 ? COLORS.danger : COLORS.slate}
                    sub="Licenças próximas do vencimento" />
            </div>

            {/* Gráficos Software */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Top Softwares Instalados">
                    {instalacoesPorSoftware.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Nenhuma instalação registrada</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={instalacoesPorSoftware} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                                <YAxis
                                    dataKey="name" type="category"
                                    tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                                    width={130}
                                />
                                <ReTooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Instalações" fill={COLORS.purple} radius={[0, 4, 4, 0]}>
                                    {instalacoesPorSoftware.map((chat, index) => (
                                        <Cell key={`cell-${index}`} fill={[COLORS.purple, COLORS.info, COLORS.teal, COLORS.primary][index % 4]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                <ChartCard title="Tipos de Licença">
                    {licencaPorTipo.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 text-sm">Nenhuma licença cadastrada</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={licencaPorTipo}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={renderPieLabel}
                                    labelLine={false}
                                >
                                    {licencaPorTipo.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={[COLORS.success, COLORS.warning, COLORS.info, COLORS.slate][index % 4]} />
                                    ))}
                                </Pie>
                                <ReTooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(v: string) => <span className="text-xs font-bold text-slate-600">{v}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
        </div>
    )
}
