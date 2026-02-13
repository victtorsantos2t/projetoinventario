"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Ativo } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
    Cpu, Laptop, Monitor, Printer, Smartphone,
    Hash, User, MapPin, Calendar, AlertTriangle,
    ShieldCheck, Loader2, ArrowLeft
} from "lucide-react"
import { STATUS_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export default function PublicAssetPage() {
    const { id } = useParams()
    const router = useRouter()
    const [ativo, setAtivo] = useState<Ativo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return

        const fetchAtivo = async () => {
            try {
                const { data, error } = await supabase
                    .from('v_inventario_geral')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error
                setAtivo(data)
            } catch (err: any) {
                console.error("Erro ao carregar ativo:", err.message)
                setError("Equipamento não encontrado ou acesso negado.")
            } finally {
                setLoading(false)
            }
        }

        fetchAtivo()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-slate-500 font-medium">Carregando informações...</p>
                </div>
            </div>
        )
    }

    if (error || !ativo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-rose-100 text-center max-w-sm w-full">
                    <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Ops! Algo deu errado</h2>
                    <p className="text-slate-400 text-sm mb-6">{error || "Não conseguimos localizar este equipamento."}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200"
                    >
                        Página Inicial
                    </button>
                </div>
            </div>
        )
    }

    const statusClass = STATUS_COLORS[ativo.status] || "bg-slate-50 text-slate-500 border-slate-200"

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* Header / Banner */}
            <div className="bg-white border-b border-slate-100 px-6 pt-10 pb-10 rounded-b-[3rem] shadow-sm">
                <button
                    onClick={() => router.push('/inventory')}
                    className="mb-6 flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center">
                        <Cpu className="h-8 w-8" />
                    </div>
                    <div>
                        <Badge className={cn("mb-1 font-black uppercase text-[10px]", statusClass)}>
                            {ativo.status}
                        </Badge>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">{ativo.nome}</h1>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patrimônio</p>
                        <p className="text-sm font-black text-primary">{ativo.patrimonio || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cód. Saúde</p>
                        <p className={cn(
                            "text-sm font-black",
                            ativo.saude > 70 ? "text-emerald-500" : ativo.saude > 30 ? "text-amber-500" : "text-rose-500"
                        )}>{ativo.saude}%</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 -mt-6">
                <div className="space-y-4">
                    {/* Detalhes Técnicos */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" /> Ficha Técnica
                        </h3>

                        <div className="space-y-5">
                            <InfoItem icon={<Hash className="h-4 w-4" />} label="Número de Série" value={ativo.serial} />
                            <InfoItem icon={<User className="h-4 w-4" />} label="Responsável Atual" value={ativo.colaborador || 'Sem responsável'} />
                            <InfoItem icon={<MapPin className="h-4 w-4" />} label="Setor / Localização" value={ativo.setor || 'N/A'} />
                            <InfoItem icon={<Calendar className="h-4 w-4" />} label="Desde (Criação)" value={new Date(ativo.created_at).toLocaleDateString()} />
                        </div>
                    </div>

                    {/* Especificações */}
                    {(ativo.processador || ativo.memoria_ram || ativo.armazenamento) && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-indigo-500" /> Hardware
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                {ativo.processador && <SpecBadge label="CPU" value={ativo.processador} color="bg-indigo-50 text-indigo-700" />}
                                {ativo.memoria_ram && <SpecBadge label="RAM" value={ativo.memoria_ram} color="bg-emerald-50 text-emerald-700" />}
                                {ativo.armazenamento && <SpecBadge label="Disco" value={ativo.armazenamento} color="bg-amber-50 text-amber-700" />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-sm font-bold text-slate-700">{value}</p>
            </div>
        </div>
    )
}

function SpecBadge({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className={cn("px-4 py-3 rounded-2xl border border-transparent flex justify-between items-center", color)}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
            <span className="text-sm font-black">{value}</span>
        </div>
    )
}
