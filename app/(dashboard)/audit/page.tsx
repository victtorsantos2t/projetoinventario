"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useUser } from "@/contexts/user-context"
import { ShieldCheck, Search, QrCode, ClipboardList, CheckCircle2, XCircle, AlertCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AuditScanner } from "@/components/audit-scanner"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AuditPage() {
    const { profile } = useUser()
    const [isScanning, setIsScanning] = useState(false)
    const [currentAudit, setCurrentAudit] = useState<any>(null)
    const [stats, setStats] = useState({ total: 0, checked: 0 })

    useEffect(() => {
        fetchActiveAudit()
    }, [])

    const fetchActiveAudit = async () => {
        const { data, error } = await supabase
            .from('auditorias')
            .select('*')
            .eq('status', 'em_progresso')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error && error.code !== 'PGRST116') {
            console.error("Erro ao buscar auditoria:", error)
            return
        }

        if (data) {
            setCurrentAudit(data)
            fetchAuditStats(data.id)
        }
    }

    const fetchAuditStats = async (auditId: string) => {
        const { count: total } = await supabase
            .from('ativos')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'Baixado')

        const { count: checked } = await supabase
            .from('auditoria_itens')
            .select('*', { count: 'exact', head: true })
            .eq('auditoria_id', auditId)

        setStats({ total: total || 0, checked: checked || 0 })
    }

    const startNewAudit = async () => {
        if (!profile?.id) {
            toast.error("Perfil do usuário não carregado. Tente recarregar a página.")
            return
        }

        const { data, error } = await supabase
            .from('auditorias')
            .insert({ criado_por: profile.id, status: 'em_progresso' })
            .select()
            .single()

        if (error) {
            console.error("Erro ao iniciar auditoria:", error)
            toast.error("Erro ao iniciar auditoria: " + error.message)
            return
        }

        if (data) {
            setCurrentAudit(data)
            toast.success("Nova auditoria iniciada")
        }
    }

    const handleScanResult = async (assetId: string) => {
        if (!currentAudit) return

        // 1. Verificar se ativo existe
        const { data: asset, error: assetError } = await supabase
            .from('ativos')
            .select('*')
            .eq('id', assetId)
            .single()

        if (assetError || !asset) {
            // Tentar por serial se não for UUID
            const { data: assetBySerial } = await supabase
                .from('ativos')
                .select('*')
                .eq('serial', assetId)
                .single()

            if (!assetBySerial) {
                toast.error("Ativo não encontrado")
                return
            }
            assetId = assetBySerial.id
        }

        // 2. Registrar item na auditoria
        const { error } = await supabase
            .from('auditoria_itens')
            .upsert({
                auditoria_id: currentAudit.id,
                ativo_id: assetId,
                verificado_por: profile?.id,
                status_conferido: 'OK'
            }, { onConflict: 'auditoria_id,ativo_id' })

        if (!error) {
            toast.success("Ativo verificado com sucesso!")
            fetchAuditStats(currentAudit.id)
            setIsScanning(false)
        } else {
            toast.error("Erro ao registrar verificação")
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-lg mx-auto pb-24">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Auditoria Mobile</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Inventário Físico</p>
                </div>
            </div>

            {!currentAudit ? (
                <Card className="border-dashed border-2 bg-slate-50/50">
                    <CardContent className="p-8 text-center">
                        <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhuma auditoria ativa</h3>
                        <p className="text-sm text-slate-500 mb-6">Inicie um novo ciclo de conferência para escanear os ativos físicos do escritório.</p>
                        <Button onClick={startNewAudit} className="w-full h-12 rounded-2xl font-bold gap-2">
                            <Plus className="h-4 w-4" /> Começar Auditoria
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card className="bg-indigo-600 text-white border-0 shadow-lg shadow-indigo-200 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <QrCode className="h-24 w-24" />
                        </div>
                        <CardContent className="p-6 relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Auditoria em Progresso</p>
                                    <h4 className="text-2xl font-bold">Gerencial Jan/2026</h4>
                                </div>
                                <Badge className="bg-white/20 text-white border-0">ATIVO</Badge>
                            </div>

                            <div className="flex gap-8 mb-4">
                                <div>
                                    <p className="text-indigo-200 text-[10px] font-bold uppercase">Progresso</p>
                                    <p className="text-xl font-black">
                                        {stats.checked} <span className="text-sm font-normal text-indigo-200">/ {stats.total}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-indigo-200 text-[10px] font-bold uppercase">Faltam</p>
                                    <p className="text-xl font-black">{stats.total - stats.checked}</p>
                                </div>
                            </div>

                            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-500"
                                    style={{ width: `${(stats.checked / stats.total) * 100}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        onClick={() => setIsScanning(true)}
                        className="w-full h-16 rounded-[2rem] text-lg font-black gap-3 shadow-xl"
                    >
                        <QrCode className="h-6 w-6" /> ESCANEAR ATIVO
                    </Button>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Últimas Verificações</h5>
                            <Button variant="link" className="text-[10px] font-bold text-indigo-600 h-auto p-0">Ver Todos</Button>
                        </div>

                        {/* Lista de itens verificados (mock/subset) */}
                        <div className="space-y-2">
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-800">Note-Dell-123</p>
                                    <p className="text-[10px] text-slate-400">Verificado há 5 min</p>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-bold">OK</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isScanning && (
                <AuditScanner
                    onResult={handleScanResult}
                    onClose={() => setIsScanning(false)}
                />
            )}
        </div>
    )
}
