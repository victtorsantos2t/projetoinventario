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
    const [recentItems, setRecentItems] = useState<any[]>([])
    const [showAllItems, setShowAllItems] = useState(false)
    const [pendingAsset, setPendingAsset] = useState<any>(null)
    const [manualSearch, setManualSearch] = useState("")
    const [observation, setObservation] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

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
            fetchRecentItems(data.id)
        }
    }

    const fetchRecentItems = async (auditId: string) => {
        const { data, error } = await supabase
            .from('auditoria_itens')
            .select(`
                id,
                created_at,
                status_conferido,
                obs,
                ativos (
                    nome,
                    patrimonio,
                    setor,
                    colaborador
                )
            `)
            .eq('auditoria_id', auditId)
            .order('created_at', { ascending: false })
            .limit(showAllItems ? 100 : 5)

        if (!error && data) {
            setRecentItems(data)
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

    useEffect(() => {
        if (currentAudit?.id) {
            fetchRecentItems(currentAudit.id)
        }
    }, [showAllItems])

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
            fetchAuditStats(data.id)
            toast.success("Nova auditoria iniciada")
        }
    }

    const handleScanResult = async (scannedValue: string) => {
        if (!currentAudit) return

        let idToSearch = scannedValue

        // 1. Extrair ID se for uma URL do sistema
        if (scannedValue.includes('/p/')) {
            idToSearch = scannedValue.split('/p/').pop() || scannedValue
        }

        // 2. Buscar Ativo (Ordem: ID -> Serial -> Patrimônio)
        let asset: any = null

        // Tenta por ID (UUID)
        if (idToSearch.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const { data } = await supabase.from('ativos').select('*').eq('id', idToSearch).maybeSingle()
            if (data) asset = data
        }

        // Tenta por Serial
        if (!asset) {
            const { data } = await supabase.from('ativos').select('*').eq('serial', scannedValue).maybeSingle()
            if (data) asset = data
        }

        // Tenta por Patrimônio
        if (!asset) {
            const { data } = await supabase.from('ativos').select('*').eq('patrimonio', scannedValue).maybeSingle()
            if (data) asset = data
        }

        if (!asset) {
            toast.error("Ativo não encontrado")
            return
        }

        setPendingAsset(asset)
        setIsScanning(false)
        setManualSearch("")
    }

    const confirmVerification = async () => {
        if (!pendingAsset || !currentAudit) return

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('auditoria_itens')
                .upsert({
                    auditoria_id: currentAudit.id,
                    ativo_id: pendingAsset.id,
                    verificado_por: profile?.id,
                    status_conferido: 'OK',
                    obs: observation || null
                }, { onConflict: 'auditoria_id,ativo_id' })

            if (error) {
                console.error("Erro ao registrar no Supabase:", error)
                throw error
            }

            toast.success("Ativo registrado!")
            await fetchAuditStats(currentAudit.id)
            await fetchRecentItems(currentAudit.id)
            setPendingAsset(null)
            setObservation("")
        } catch (error: any) {
            console.error("Erro completo na confirmação:", error)
            toast.error("Erro ao registrar: " + (error.message || "Erro desconhecido"))
        } finally {
            setIsSubmitting(false)
        }
    }

    const finalizeAudit = async () => {
        if (!currentAudit || !confirm("Deseja realmente finalizar este ciclo de auditoria?")) return

        const { error } = await supabase
            .from('auditorias')
            .update({ status: 'concluido', finalizada_at: new Date().toISOString() })
            .eq('id', currentAudit.id)

        if (!error) {
            toast.success("Auditoria finalizada com sucesso!")
            setCurrentAudit(null)
        } else {
            toast.error("Erro ao finalizar")
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
                                    <h4 className="text-2xl font-bold">Ciclo Atual</h4>
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
                                    style={{ width: `${(stats.checked / (stats.total || 1)) * 100}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => setIsScanning(true)}
                            className="flex-1 h-16 rounded-[2rem] text-lg font-black gap-3 shadow-xl"
                        >
                            <QrCode className="h-6 w-6" /> ESCANEAR
                        </Button>
                        <Button
                            variant="outline"
                            onClick={finalizeAudit}
                            className="h-16 w-16 rounded-[2rem] border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all flex items-center justify-center p-0"
                            title="Finalizar Auditoria"
                        >
                            <ShieldCheck className="h-8 w-8" />
                        </Button>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                            placeholder="Buscar patrimônio ou serial manualmente..."
                            value={manualSearch}
                            onChange={(e) => setManualSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScanResult(manualSearch)}
                            className="h-12 pl-12 rounded-2xl bg-white border-slate-100 shadow-sm focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {showAllItems ? 'Todas as Verificações' : 'Últimas Verificações'}
                            </h5>
                            <Button
                                onClick={() => setShowAllItems(!showAllItems)}
                                variant="link"
                                className="text-[10px] font-bold text-indigo-600 h-auto p-0"
                            >
                                {showAllItems ? 'Ver Menos' : 'Ver Todos'}
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {recentItems.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhum item escaneado ainda</p>
                                </div>
                            ) : (
                                recentItems.map((item) => (
                                    <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-3 relative group">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{item.ativos?.nome}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                <span className="font-mono bg-slate-100 px-1 rounded text-slate-500">{item.ativos?.patrimonio || 'S/P'}</span>
                                                <span>•</span>
                                                <span>{item.ativos?.setor || 'Sem Setor'}</span>
                                                <span>•</span>
                                                <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        {item.obs && (
                                            <div className="h-6 w-6 rounded bg-amber-50 flex items-center justify-center" title={item.obs}>
                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                            </div>
                                        )}
                                        <Badge variant="outline" className="text-[9px] font-bold">{item.status_conferido}</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {pendingAsset && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-0 animate-in fade-in slide-in-from-bottom-10 duration-300">
                        <CardContent className="p-8">
                            <div className="flex justify-center mb-6">
                                <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
                                    <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                        <ShieldCheck className="h-8 w-8" />
                                    </div>
                                </div>
                            </div>

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1">{pendingAsset.nome}</h3>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Confirmação de Inventário</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Setor Atual</p>
                                    <p className="text-sm font-bold text-slate-700">{pendingAsset.setor || 'Não definido'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Patrimônio</p>
                                    <p className="text-sm font-bold text-slate-700">{pendingAsset.patrimonio || 'S/P'}</p>
                                </div>
                                <div className="col-span-2 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Responsável</p>
                                    <p className="text-sm font-bold text-slate-700">{pendingAsset.colaborador || 'Sem responsável'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1.5 block">Observações (Opcional)</label>
                                    <Input
                                        placeholder="Ex: Teclado falhando, gabinete arranhado..."
                                        value={observation}
                                        onChange={(e) => setObservation(e.target.value)}
                                        className="h-14 rounded-2xl bg-slate-50 border-slate-100"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setPendingAsset(null)
                                            setObservation("")
                                        }}
                                        disabled={isSubmitting}
                                        className="flex-1 h-14 rounded-2xl font-bold border-slate-200 text-slate-500"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={confirmVerification}
                                        disabled={isSubmitting}
                                        className="flex-[2] h-14 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                                    >
                                        {isSubmitting ? 'Salvando...' : 'Confirmar'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
