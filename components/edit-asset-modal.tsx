"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Ativo, Setor, Manutencao } from "@/types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import {
    EQUIPMENT_TYPES, STATUS_OPTIONS, RAM_OPTIONS, STORAGE_OPTIONS,
    CPU_GENERATIONS, HARDWARE_TYPES, MONITOR_TYPES, MONITOR_SIZES,
    VIDEO_OUTPUTS, MAINTENANCE_REPLACEMENT_THRESHOLD
} from "@/lib/constants"
import {
    X, Save, Monitor, Cpu, Wrench,
    AlertTriangle, Heart, Hash, History, Plus, Trash2, Calendar, ShieldCheck
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface EditAssetModalProps {
    ativo: Ativo | null
    open: boolean
    onClose: () => void
    onSuccess?: () => void
    mode?: 'edit' | 'view'
}

export function EditAssetModal({ ativo, open, onClose, onSuccess, mode = 'edit' }: EditAssetModalProps) {
    const isViewMode = mode === 'view'
    const [form, setForm] = useState({
        nome: "",
        tipo: "",
        serial: "",
        status: "Disponível",
        colaborador: "",
        setor: "",
        patrimonio: "",
        processador: "",
        memoria_ram: "",
        armazenamento: "",
        acesso_remoto: "",
        polegadas: "",
        saidas_video: [] as string[],
        condicao: "Novo" as "Novo" | "Semi-novo",
        tem_garantia: false,
        garantia_meses: 12,
    })
    const [saving, setSaving] = useState(false)
    const [setores, setSetores] = useState<Setor[]>([])
    const [usuarios, setUsuarios] = useState<{ id: string, full_name: string | null, setor_id: string | null }[]>([])
    const [categories, setCategories] = useState<{ id: string, nome: string }[]>([])

    // Maintenance State
    const [maintenances, setMaintenances] = useState<Manutencao[]>([])
    const [showMaintForm, setShowMaintForm] = useState(false)
    const [newMaint, setNewMaint] = useState({
        descricao: "",
        tipo: "Corretiva",
        custo: "",
        data_manutencao: new Date().toISOString().split('T')[0],
        restaurar_saude: false
    })
    const [savingMaint, setSavingMaint] = useState(false)
    const [threshold, setThreshold] = useState(MAINTENANCE_REPLACEMENT_THRESHOLD)

    useEffect(() => {
        if (ativo && open) {
            setForm({
                nome: ativo.nome || "",
                tipo: ativo.tipo || "",
                serial: ativo.serial || "",
                status: ativo.status || "Disponível",
                colaborador: ativo.colaborador || "",
                setor: ativo.setor || "",
                patrimonio: ativo.patrimonio || "",
                processador: ativo.processador || "",
                memoria_ram: ativo.memoria_ram || "",
                armazenamento: ativo.armazenamento || "",
                acesso_remoto: ativo.acesso_remoto || "",
                polegadas: ativo.polegadas || "",
                saidas_video: ativo.saidas_video || [],
                condicao: (ativo as any).condicao || "Novo",
                tem_garantia: (ativo as any).tem_garantia || false,
                garantia_meses: (ativo as any).garantia_meses || 12,
            })

            // Fetch generic data
            Promise.all([
                supabase.from('setores').select('id, nome').order('nome'),
                supabase.from('profiles').select('id, full_name, setor_id').order('full_name'),
                supabase.from('categorias_ativos').select('id, nome').order('nome'),
                supabase.from('configuracoes').select('valor').eq('chave', 'threshold_substituicao').maybeSingle(),
                fetchMaintenances()
            ]).then(([setoresRes, usersRes, catRes, thresholdRes]) => {
                if (setoresRes.data) setSetores(setoresRes.data)
                if (usersRes.data) setUsuarios(usersRes.data)
                if (catRes.data) setCategories(catRes.data)
                if (thresholdRes.data?.valor) setThreshold(parseInt(thresholdRes.data.valor))
            })

            // Reset maintenance form when switching assets or opening
            setShowMaintForm(false)
            setNewMaint({
                descricao: "",
                tipo: "Corretiva",
                custo: "",
                data_manutencao: new Date().toISOString().split('T')[0],
                restaurar_saude: false
            })
        }
    }, [ativo, open])

    const fetchMaintenances = async () => {
        if (!ativo) return
        try {
            const { data, error } = await supabase
                .from('manutencoes')
                .select(`
                    *,
                    tecnico:profiles (
                        full_name
                    )
                `)
                .eq('ativo_id', ativo.id)
                .order('data_manutencao', { ascending: false })

            if (error) {
                console.error("Erro detalhado no fetch:", {
                    message: error.message,
                    code: error.code,
                    hint: error.hint,
                    details: error.details
                })

                // Fallback sem o join do técnico
                const { data: fallbackData } = await supabase
                    .from('manutencoes')
                    .select('*')
                    .eq('ativo_id', ativo.id)
                    .order('data_manutencao', { ascending: false })

                if (fallbackData) setMaintenances(fallbackData as any)
                return
            }

            if (data) {
                setMaintenances(data)
                // Sync health if it's the first time or mismatch
                const calculated = calculateHealth(data as any)
                if (ativo.saude !== calculated) {
                    await updateAssetHealth(data as any)
                    onSuccess?.() // Refresh parent to show correct health
                }
            }
        } catch (err: any) {
            console.error("Erro catastrófico no fetch:", err.message)
        }
    }

    const handleChange = (field: string, value: string | string[]) => {
        setForm(prev => {
            const next = { ...prev, [field]: value }
            // Se mudou o setor, limpar responsável
            if (field === 'setor' && prev.setor !== value) {
                next.colaborador = ""
            }
            return next
        })
    }

    const toggleVideoOutput = (output: string) => {
        setForm(prev => ({
            ...prev,
            saidas_video: prev.saidas_video.includes(output)
                ? prev.saidas_video.filter(v => v !== output)
                : [...prev.saidas_video, output]
        }))
    }

    const handleSave = async () => {
        if (!ativo) return
        setSaving(true)

        try {
            // 1. Validations
            // Uniqueness check for Serial
            if (form.serial !== ativo.serial) {
                const { data: existingSerial } = await supabase
                    .from('ativos')
                    .select('id')
                    .eq('serial', form.serial)
                    .neq('id', ativo.id)
                    .maybeSingle()

                if (existingSerial) {
                    toast.error("Este Número de Série já pertence a outro ativo!")
                    setSaving(false)
                    return
                }
            }

            // Uniqueness check for Patrimonio
            if (form.patrimonio && form.patrimonio !== ativo.patrimonio) {
                const { data: existingPatrimonio } = await supabase
                    .from('ativos')
                    .select('id')
                    .eq('patrimonio', form.patrimonio)
                    .neq('id', ativo.id)
                    .maybeSingle()

                if (existingPatrimonio) {
                    toast.error("Este Número de Patrimônio já pertence a outro ativo!")
                    setSaving(false)
                    return
                }
            }

            // Computer/Notebook limit check
            if (form.colaborador && HARDWARE_TYPES.includes(form.tipo as any)) {
                const { data: existingHardware } = await supabase
                    .from('ativos')
                    .select('id, nome')
                    .eq('colaborador', form.colaborador)
                    .in('tipo', Array.from(HARDWARE_TYPES))
                    .neq('id', ativo.id)
                    .maybeSingle()

                if (existingHardware) {
                    toast.error(`${form.colaborador} já possui um computador/notebook vinculado (${existingHardware.nome})!`)
                    setSaving(false)
                    return
                }
            }

            // Build changes log
            const changes: string[] = []
            const original = ativo as unknown as Record<string, any>
            const formData = form as unknown as Record<string, any>

            // Mapeamento de nomes técnicos para amigáveis
            const fieldLabels: Record<string, string> = {
                nome: 'Nome',
                tipo: 'Tipo',
                serial: 'Nº de Série',
                status: 'Status',
                colaborador: 'Responsável',
                setor: 'Setor',
                patrimonio: 'Patrimônio',
                processador: 'Processador',
                memoria_ram: 'RAM',
                armazenamento: 'Disco',
                acesso_remoto: 'Acesso Remoto',
                polegadas: 'Polegadas',
                condicao: 'Condição',
                garantia_meses: 'Garantia',
                saidas_video: 'Saídas de Vídeo'
            }

            let isTransfer = false
            if ((ativo.setor || "") !== (form.setor || "") || (ativo.colaborador || "") !== (form.colaborador || "")) {
                isTransfer = true
            }

            Object.entries(fieldLabels).forEach(([field, label]) => {
                let oldVal = original[field]
                let newVal = formData[field]

                // Normalização para comparação
                if (Array.isArray(oldVal)) oldVal = oldVal.sort().join(', ')
                if (Array.isArray(newVal)) newVal = newVal.sort().join(', ')

                const sOld = String(oldVal || "").trim()
                const sNew = String(newVal || "").trim()

                if (sOld !== sNew) {
                    changes.push(`${label}: ${sOld || '—'} -> ${sNew || '—'}`)
                }
            })

            const { error } = await supabase
                .from('ativos')
                .update({
                    nome: form.nome,
                    tipo: form.tipo,
                    serial: form.serial,
                    status: form.status,
                    colaborador: form.colaborador || null,
                    setor: form.setor || null,
                    patrimonio: form.patrimonio || null,
                    processador: form.processador || null,
                    memoria_ram: form.memoria_ram || null,
                    armazenamento: form.armazenamento || null,
                    acesso_remoto: form.acesso_remoto || null,
                    polegadas: form.polegadas || null,
                    saidas_video: form.saidas_video.length > 0 ? form.saidas_video : null,
                })
                .eq('id', ativo.id)

            if (error) throw error

            // Log movement
            const { data: { user } } = await supabase.auth.getUser()
            if (changes.length > 0) {
                await supabase.from('movimentacoes').insert({
                    ativo_id: ativo.id,
                    usuario_id: user?.id,
                    tipo_movimentacao: 'EDITAR',
                    observacao: `${isTransfer ? "[TRANSFERÊNCIA] " : ""}Alterações: ${changes.join(' | ')}`,
                })
            }

            toast.success("Ativo atualizado com sucesso!")
            onSuccess?.()
            onClose()
        } catch (error: unknown) {
            let msg = "Erro desconhecido"
            if (error instanceof Error) msg = error.message
            else if (typeof error === 'object' && error !== null && 'message' in error) msg = String((error as { message: unknown }).message)
            toast.error(`Erro ao salvar alterações: ${msg}`)
        } finally {
            setSaving(false)
        }
    }

    const handleAddMaintenance = async () => {
        if (!ativo || !newMaint.descricao) {
            toast.error("Preencha a descrição da manutenção")
            return
        }
        setSavingMaint(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            let insertData: any = {
                ativo_id: ativo.id,
                descricao: newMaint.descricao,
                tipo: newMaint.tipo,
                custo: newMaint.custo ? parseFloat(newMaint.custo) : null,
                data_manutencao: newMaint.data_manutencao,
                tecnico_id: user?.id,
                restaurar_saude: newMaint.restaurar_saude
            }

            let { error } = await supabase.from('manutencoes').insert(insertData)

            // Se o erro for "coluna não encontrada", tenta inserir sem o campo restaurar_saude
            if (error && (error.code === '42703' || error.message?.includes('restaurar_saude'))) {
                console.warn("Coluna 'restaurar_saude' não encontrada. Tentando inserir sem ela...")
                const { restaurar_saude, ...fallbackData } = insertData
                const { error: retryError } = await supabase.from('manutencoes').insert(fallbackData)

                if (retryError) throw retryError

                toast.warning("Manutenção salva, mas a opção de restaurar saúde não funcionou.", {
                    description: "Você ainda precisa executar o comando SQL no Supabase para ativar esta função."
                })
            } else if (error) {
                throw error
            }

            // Update status if needed (optional logic, kept manual for now)
            // But log in movements
            const { error: insertError } = await supabase.from('movimentacoes').insert({
                ativo_id: ativo.id,
                usuario_id: user?.id,
                tipo_movimentacao: 'MANUTENÇÃO',
                observacao: `[MANUTENÇÃO] ${newMaint.tipo}: ${newMaint.descricao}${newMaint.restaurar_saude ? " (Saúde Restaurada)" : ""}`
            })
            if (insertError) throw insertError

            toast.success("Manutenção registrada!")
            setNewMaint({
                descricao: "",
                tipo: "Corretiva",
                custo: "",
                data_manutencao: new Date().toISOString().split('T')[0],
                restaurar_saude: false
            })
            setShowMaintForm(false)

            // Update local state and DB health
            const { data: updatedMaintenances } = await supabase
                .from('manutencoes')
                .select('*')
                .eq('ativo_id', ativo.id)

            if (updatedMaintenances) {
                setMaintenances(updatedMaintenances as any)
                await updateAssetHealth(updatedMaintenances as any)
            }

            onSuccess?.()
        } catch (error: any) {
            console.error("Erro completo:", error)
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
            toast.error("Erro ao registrar manutenção", {
                description: errorMsg,
                duration: 10000 // Show longer to allow reading
            })
        } finally {
            setSavingMaint(false)
        }
    }

    if (!open || !ativo) return null

    const isHardware = HARDWARE_TYPES.includes(form.tipo as typeof HARDWARE_TYPES[number])
    const isMonitor = MONITOR_TYPES.includes(form.tipo as typeof MONITOR_TYPES[number])

    const calculateHealth = (maintList: Manutencao[]) => {
        const sorted = [...maintList].sort((a, b) => {
            const dateA = new Date(a.data_manutencao || a.created_at).getTime()
            const dateB = new Date(b.data_manutencao || b.created_at).getTime()
            if (dateA === dateB && a.created_at && b.created_at) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            }
            return dateB - dateA
        })

        const lastRestoreIndex = sorted.findIndex(m => m.restaurar_saude)
        const relevant = lastRestoreIndex === -1 ? sorted : sorted.slice(0, lastRestoreIndex)
        const correctiveCount = relevant.filter(m => m.tipo === 'Corretiva').length
        return Math.max(0, 100 - (correctiveCount * 15))
    }

    const updateAssetHealth = async (maintList: Manutencao[]) => {
        if (!ativo) return
        const newHealth = calculateHealth(maintList)
        await supabase
            .from('ativos')
            .update({ saude: newHealth })
            .eq('id', ativo.id)
    }

    const healthPercent = calculateHealth(maintenances)
    const maintenanceCount = maintenances.length

    // Contagem de corretivas após restauração (Sincronizado com a nova lógica da Fase 2)
    const getHealthCorrectiveCount = (maintList: Manutencao[]) => {
        const sorted = [...maintList].sort((a, b) => new Date(b.data_manutencao || b.created_at).getTime() - new Date(a.data_manutencao || a.created_at).getTime())
        const lastRestoreIndex = sorted.findIndex(m => m.restaurar_saude)
        const relevant = lastRestoreIndex === -1 ? sorted : sorted.slice(0, lastRestoreIndex)
        return relevant.filter(m => m.tipo === 'Corretiva').length
    }
    const correctiveCount = getHealthCorrectiveCount(maintenances)
    const healthColor = healthPercent > 60 ? 'text-emerald-500' : healthPercent > 30 ? 'text-amber-500' : 'text-red-500'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">{isViewMode ? "Detalhes do Ativo" : "Editar Ativo"}</h2>
                        <p className="text-sm text-slate-400 font-medium">{form.nome}</p>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Health & Status Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Health Status */}
                        <div className="col-span-1 md:col-span-2 flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="relative h-14 w-14 flex-shrink-0">
                                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                                    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831" fill="none" className={healthColor.replace('text-', 'stroke-')} strokeWidth="3" strokeDasharray={`${healthPercent}, 100`} strokeLinecap="round" />
                                </svg>
                                <Heart className={`h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${healthColor}`} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-700">Saúde do Equipamento</span>
                                    <span className={`text-xs font-black ${healthColor}`}>{healthPercent}%</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{maintenanceCount} intervenções no histórico total</p>

                                {(() => {
                                    const lastRestore = [...maintenances]
                                        .sort((a, b) => new Date(b.data_manutencao || b.created_at).getTime() - new Date(a.data_manutencao || a.created_at).getTime())
                                        .find(m => m.restaurar_saude);

                                    if (!lastRestore) return null;

                                    return (
                                        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg w-fit animate-in fade-in zoom-in duration-300">
                                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">
                                                Saúde Restaurada (Upgrade) em {new Date(lastRestore.data_manutencao!).toLocaleDateString()}
                                            </span>
                                        </div>
                                    );
                                })()}

                                {maintenanceCount >= threshold && (
                                    <Badge className="mt-2 bg-red-100 text-red-700 border-red-200 font-bold text-[10px] flex w-fit items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> Substituição Sugerida
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Status Select */}
                        <div className="col-span-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wide">Status Atual</label>
                            <select
                                value={form.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                disabled={isViewMode}
                                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-80 disabled:bg-slate-50"
                            >
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Main Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Nome *</label>
                            <Input value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} disabled={isViewMode} className="rounded-xl h-11 border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Tipo *</label>
                            <select value={form.tipo} onChange={(e) => handleChange('tipo', e.target.value)} disabled={isViewMode} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium disabled:opacity-80 disabled:bg-slate-50">
                                <option value="">Selecione</option>
                                {categories.length > 0 ? (
                                    categories.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)
                                ) : (
                                    EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)
                                )}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Número de Série *</label>
                            <Input value={form.serial} onChange={(e) => handleChange('serial', e.target.value)} disabled={isViewMode} className="rounded-xl h-11 border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Patrimônio</label>
                            <Input value={form.patrimonio} onChange={(e) => handleChange('patrimonio', e.target.value)} disabled={isViewMode} className="rounded-xl h-11 border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Setor *</label>
                            <select
                                value={form.setor}
                                onChange={(e) => handleChange('setor', e.target.value)}
                                disabled={isViewMode}
                                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium disabled:opacity-80 disabled:bg-slate-50"
                            >
                                <option value="">Selecione um setor...</option>
                                {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Responsável *</label>
                            <select
                                value={form.colaborador}
                                onChange={(e) => handleChange('colaborador', e.target.value)}
                                disabled={!form.setor || isViewMode}
                                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium disabled:bg-slate-50 disabled:text-slate-400"
                            >
                                <option value="">{form.setor ? "Selecione um responsável..." : "Selecione um setor primeiro"}</option>
                                {usuarios
                                    .filter(u => {
                                        if (!form.setor) return false
                                        const currentSetorId = setores.find(s => s.nome === form.setor)?.id
                                        return u.setor_id === currentSetorId
                                    })
                                    .map(u => <option key={u.id} value={u.full_name || ""}>{u.full_name}</option>)
                                }
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Condição</label>
                            <select
                                value={form.condicao}
                                onChange={(e) => handleChange('condicao', e.target.value)}
                                disabled={isViewMode}
                                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium disabled:bg-slate-50"
                            >
                                <option value="Novo">Novo</option>
                                <option value="Semi-novo">Semi-novo</option>
                            </select>
                        </div>
                        {form.condicao === 'Novo' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Garantia (Meses)</label>
                                <Input
                                    type="number"
                                    value={form.garantia_meses}
                                    onChange={(e) => handleChange('garantia_meses', e.target.value)}
                                    disabled={isViewMode}
                                    className="rounded-xl h-11 border-slate-200"
                                />
                            </div>
                        )}
                    </div>

                    {/* Technical Specs Sections (Hardware/Monitor) */}
                    {isHardware && (
                        <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-700">Configuração de Hardware</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 ml-1">Processador</label>
                                    <select value={form.processador} onChange={(e) => handleChange('processador', e.target.value)} disabled={isViewMode} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm disabled:opacity-80 disabled:bg-slate-50">
                                        <option value="">Selecione</option>
                                        {CPU_GENERATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 ml-1">Memória RAM</label>
                                    <select value={form.memoria_ram} onChange={(e) => handleChange('memoria_ram', e.target.value)} disabled={isViewMode} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm disabled:opacity-80 disabled:bg-slate-50">
                                        <option value="">Selecione</option>
                                        {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 ml-1">Armazenamento</label>
                                    <select value={form.armazenamento} onChange={(e) => handleChange('armazenamento', e.target.value)} disabled={isViewMode} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm disabled:opacity-80 disabled:bg-slate-50">
                                        <option value="">Selecione</option>
                                        {STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {isMonitor && (
                        <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-blue-500" />
                                <h3 className="text-sm font-bold text-slate-700">Especificações Técnicas do Monitor</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 ml-1">Tamanho (Pol)</label>
                                    <select value={form.polegadas} onChange={(e) => handleChange('polegadas', e.target.value)} disabled={isViewMode} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm disabled:opacity-80 disabled:bg-slate-50">
                                        <option value="">Selecione</option>
                                        {MONITOR_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 ml-1 block">Saídas de Vídeo</label>
                                    <div className="flex flex-wrap gap-2">
                                        {VIDEO_OUTPUTS.map(output => (
                                            <button
                                                key={output}
                                                onClick={() => !isViewMode && toggleVideoOutput(output)}
                                                disabled={isViewMode}
                                                className={cn(
                                                    "h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                                                    form.saidas_video.includes(output)
                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-100"
                                                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                                )}
                                            >
                                                {output}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Access Remote */}
                    {isHardware && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1">Acesso Remoto</label>
                            <Input value={form.acesso_remoto} onChange={(e) => handleChange('acesso_remoto', e.target.value)} disabled={isViewMode} placeholder="AnyDesk, TeamViewer..." className="rounded-xl h-11 border-slate-200" />
                        </div>
                    )}

                    {/* Replacement Suggestion */}
                    {correctiveCount >= threshold && (
                        <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-300">
                            <div className="h-12 w-12 rounded-xl bg-white border border-red-200 flex items-center justify-center text-red-500 shadow-sm shrink-0">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-red-900">Sugestão de Substituição</p>
                                <p className="text-xs text-red-600 font-medium italic">Este equipamento atingiu {correctiveCount} intervenções corretivas. Considere a troca por um novo ativo.</p>
                            </div>
                        </div>
                    )}

                    {/* Maintenance History Section */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-orange-500" />
                                <h3 className="text-lg font-bold text-slate-800">Histórico de Manutenções</h3>
                            </div>
                            {!isViewMode && (
                                <button
                                    onClick={() => setShowMaintForm(!showMaintForm)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors"
                                >
                                    <Plus className="h-3 w-3" /> Nova Manutenção
                                </button>
                            )}
                        </div>

                        {/* Add Maintenance Form */}
                        {showMaintForm && (
                            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                                        <Input
                                            type="date"
                                            value={newMaint.data_manutencao}
                                            onChange={(e) => setNewMaint({ ...newMaint, data_manutencao: e.target.value })}
                                            className="bg-white border-orange-200 h-9"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                                        <select
                                            value={newMaint.tipo}
                                            onChange={(e) => setNewMaint({ ...newMaint, tipo: e.target.value })}
                                            className="w-full h-9 px-3 bg-white border border-orange-200 rounded-md text-sm"
                                        >
                                            <option value="Corretiva">Corretiva</option>
                                            <option value="Preventiva">Preventiva</option>
                                            <option value="Upgrade">Upgrade</option>
                                            <option value="Outro">Outro</option>
                                        </select>
                                    </div>
                                </div>

                                {(['Upgrade', 'Outro', 'Preventiva'].includes(newMaint.tipo)) && (
                                    <div className="flex items-center gap-2 px-1">
                                        <input
                                            type="checkbox"
                                            id="restaurar_saude"
                                            checked={newMaint.restaurar_saude}
                                            onChange={(e) => setNewMaint({ ...newMaint, restaurar_saude: e.target.checked })}
                                            className="h-4 w-4 rounded border-orange-200 text-orange-500 focus:ring-orange-200"
                                        />
                                        <label htmlFor="restaurar_saude" className="text-xs font-bold text-orange-600 cursor-pointer">
                                            Restaurar saúde do equipamento para 100%?
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição do Serviço</label>
                                    <textarea
                                        value={newMaint.descricao}
                                        onChange={(e) => setNewMaint({ ...newMaint, descricao: e.target.value })}
                                        className="w-full min-h-[80px] p-3 rounded-lg border border-orange-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                                        placeholder="O que foi feito..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowMaintForm(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                                    <button
                                        onClick={handleAddMaintenance}
                                        disabled={savingMaint}
                                        className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 shadow-sm shadow-orange-200"
                                    >
                                        {savingMaint ? "Salvando..." : "Salvar Registro"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="space-y-3">
                            {maintenances.length === 0 ? (
                                <p className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    Nenhuma manutenção registrada
                                </p>
                            ) : (
                                maintenances.map(m => (
                                    <div key={m.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-300 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`
                                                    ${m.tipo === 'Preventiva' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                        m.tipo === 'Upgrade' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                                            'bg-orange-50 text-orange-600 border-orange-200'}
                                                `}>
                                                    {m.tipo}
                                                </Badge>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-500">
                                                        {(() => {
                                                            try {
                                                                // Forçar data local para evitar problemas de UTC
                                                                const [year, month, day] = (m.data_manutencao || '').split('-')
                                                                if (!year) return 'Data não informada'
                                                                return format(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)), "dd 'de' MMM, yyyy", { locale: ptBR })
                                                            } catch (e) {
                                                                return 'Data inválida'
                                                            }
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {m.restaurar_saude && (
                                                    <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase py-0 px-1.5 h-4">
                                                        Saúde Restaurada
                                                    </Badge>
                                                )}
                                                {m.tecnico?.full_name && (
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                                                        Por: {m.tecnico.full_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{m.descricao}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-100 px-8 py-4 flex items-center justify-end gap-3 rounded-b-3xl mt-auto">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                        {isViewMode ? "Fechar" : "Cancelar"}
                    </button>
                    {!isViewMode && (
                        <button onClick={handleSave} disabled={saving || !form.nome} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                            <Save className="h-4 w-4" />
                            {saving ? "Salvando..." : "Salvar Alterações"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
