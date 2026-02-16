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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    X, Save, Monitor, Cpu, Wrench, Activity, User, Wifi, WifiOff, FileText,
    AlertTriangle, AlertCircle, Heart, Hash, History, Plus, Trash2, Calendar, ShieldCheck, Layers, Loader2
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { PasswordConfirmModal } from "./password-confirm-modal"

interface EditAssetModalProps {
    ativo: Ativo | null
    open: boolean
    onClose: () => void
    onSuccess?: () => void
    mode?: 'edit' | 'view'
}

export function EditAssetModal({ ativo, open, onClose, onSuccess, mode = 'edit' }: EditAssetModalProps) {
    const isViewMode = mode === 'view'
    const [activeTab, setActiveTab] = useState<'geral' | 'manutencao' | 'historico'>('geral')
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
        restaurar_saude: false,
        tecnico_id: ""
    })
    const [savingMaint, setSavingMaint] = useState(false)
    const [threshold, setThreshold] = useState(MAINTENANCE_REPLACEMENT_THRESHOLD)
    const [isStatusUnlocked, setIsStatusUnlocked] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletePassword, setDeletePassword] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const [showMaintDeleteConfirm, setShowMaintDeleteConfirm] = useState(false)
    const [maintIdToDelete, setMaintIdToDelete] = useState<string | null>(null)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

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

            Promise.all([
                supabase.from('setores').select('id, nome').order('nome'),
                supabase.from('profiles').select('id, full_name, setor_id, is_setor_responsavel').order('full_name'),
                supabase.from('categorias_ativos').select('id, nome').order('nome'),
                supabase.from('configuracoes').select('valor').eq('chave', 'threshold_substituicao').maybeSingle(),
                supabase.auth.getUser(),
                fetchMaintenances()
            ]).then(([setoresRes, usersRes, catRes, thresholdRes, userRes, maintsRes]) => {
                if (setoresRes.data) setSetores(setoresRes.data)
                if (usersRes.data) setUsuarios(usersRes.data)
                if (catRes.data) setCategories(catRes.data)
                if (thresholdRes.data?.valor) setThreshold(parseInt(thresholdRes.data.valor))
                if (userRes.data?.user) {
                    setNewMaint(prev => ({ ...prev, tecnico_id: userRes.data.user?.id || "" }))
                }
            })

            // Reset maintenance form when switching assets or opening
            setShowMaintForm(false)
            setIsStatusUnlocked(false)
            setNewMaint({
                descricao: "",
                tipo: "Corretiva",
                custo: "",
                data_manutencao: new Date().toISOString().split('T')[0],
                restaurar_saude: false,
                tecnico_id: ""
            })
        }
    }, [ativo, open])

    const fetchMaintenances = async () => {
        if (!ativo) return
        try {
            // Fetch maintenances AND current asset health in parallel
            const [maintsRes, assetRes] = await Promise.all([
                supabase
                    .from('manutencoes')
                    .select(`
                        *,
                        tecnico:profiles!tecnico_id (
                            full_name
                        )
                    `)
                    .eq('ativo_id', ativo.id)
                    .order('data_manutencao', { ascending: false })
                    .order('created_at', { ascending: false }),
                supabase
                    .from('ativos')
                    .select('saude')
                    .eq('id', ativo.id)
                    .single()
            ])

            if (maintsRes.error) {
                console.error("Erro no fetch de manutenções:", maintsRes.error)
                return
            }

            if (maintsRes.data) {
                setMaintenances(maintsRes.data)

                // Calculate expected health based on maintenances
                const calculated = calculateHealth(maintsRes.data as any)

                // Use fresh DB value for comparison, fallback to prop if DB fetch failed (unlikely)
                const currentDbHealth = assetRes.data?.saude ?? ativo.saude

                // Only update if the DB value is different from calculated
                if (currentDbHealth !== calculated) {
                    console.log(`[Health Correction] Updating health from ${currentDbHealth} to ${calculated}`)
                    await updateAssetHealth(maintsRes.data as any)
                    onSuccess?.()
                }
            }
        } catch (error) {
            console.error("Erro ao buscar manutenções:", error)
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
            // Maintenance Workflow Check: Prevent manual escape from "Manutenção"
            // Se o ativo AINDA estiver no banco como manutenção e o formulário tentar mudar sem ter passado pelo fluxo
            const isManualEscape = ativo.status === "Manutenção" && form.status !== "Manutenção" && form.status !== "Baixado"

            if (isManualEscape && !isStatusUnlocked) {
                toast.error("Fluxo de manutenção bloqueado", {
                    description: "Para tirar um ativo de manutenção, você deve registrar uma 'Nova Manutenção' na aba ao lado.",
                    duration: 4000
                });
                setActiveTab('manutencao');
                setForm(prev => ({ ...prev, status: ativo.status })); // Reset status in UI
                setSaving(false);
                return;
            }

            // Availability Check: Prevent 'Disponível' status with active assignments
            if (form.status === "Disponível" && (form.colaborador || form.setor)) {
                toast.error("Vínculos ativos detectados", {
                    description: "Para colocar como disponível, remova o usuário vinculado e o setor primeiro.",
                    duration: 5000
                })
                setForm(prev => ({ ...prev, status: ativo.status })); // Reset status if invalid
                setSaving(false)
                return
            }

            // Usage Check: Prevent 'Em uso' status without required assignments
            if (form.status === "Em uso" && (!form.colaborador || !form.setor)) {
                toast.error("Vínculos obrigatórios ausentes", {
                    description: "Para colocar em uso, informe o usuário vinculado e o setor.",
                    duration: 5000
                })
                setForm(prev => ({ ...prev, status: ativo.status })); // Reset status if invalid
                setSaving(false)
                return
            }

            // Archival Check: Prevent 'Baixado' status with active assignments
            if (form.status === "Baixado" && (form.colaborador || form.setor)) {
                toast.error("Vínculos ativos detectados", {
                    description: "Para arquivar (baixar) o ativo, remova o usuário vinculado e o setor primeiro.",
                    duration: 5000
                })
                setForm(prev => ({ ...prev, status: ativo.status })); // Reset status if invalid
                setSaving(false)
                return
            }

            // Archival Protection: If status changed to 'Baixado', trigger password confirmation
            if (form.status === "Baixado" && ativo.status !== "Baixado") {
                setShowArchiveConfirm(true)
                setSaving(false)
                return
            }

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
                // Find user profile to check if they are a sector responsible
                const userProfile = usuarios.find(u => u.full_name === form.colaborador)

                if (!userProfile?.is_setor_responsavel) {
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
            }

            // If we reached here, validations passed. Execute the actual save.
            await executeSave()
        } catch (error: unknown) {
            let msg = "Erro desconhecido"
            if (error instanceof Error) msg = error.message
            else if (typeof error === 'object' && error !== null && 'message' in error) msg = String((error as { message: unknown }).message)
            toast.error(`Erro ao salvar alterações: ${msg}`)
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmArchive = async () => {
        // This function is called by the PasswordConfirmModal onConfirm
        // It bypasses the checks because they were already done in handleSave
        setSaving(true)
        try {
            await executeSave()
        } finally {
            setSaving(false)
            setShowArchiveConfirm(false)
        }
    }

    const executeSave = async () => {
        if (!ativo) return

        try {
            // Build changes log
            const changes: string[] = []
            const original = ativo as unknown as Record<string, any>
            const formData = form as unknown as Record<string, any>

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
                    processador: (monitoringData?.processador && monitoringData.processador !== 'Desconhecido' && monitoringData.processador !== '') ? monitoringData.processador : (form.processador || null),
                    memoria_ram: (monitoringData?.memoria_ram && monitoringData.memoria_ram !== 'Desconhecido' && monitoringData.memoria_ram !== '') ? monitoringData.memoria_ram : (form.memoria_ram || null),
                    armazenamento: (monitoringData?.armazenamento && monitoringData.armazenamento !== 'Desconhecido' && monitoringData.armazenamento !== '') ? monitoringData.armazenamento : (form.armazenamento || null),
                    acesso_remoto: form.acesso_remoto || null,
                    polegadas: form.polegadas || null,
                    saidas_video: form.saidas_video.length > 0 ? form.saidas_video : null,
                })
                .eq('id', ativo.id)

            if (error) throw error

            const { data: { user } } = await supabase.auth.getUser()
            if (changes.length > 0) {
                await supabase.from('movimentacoes').insert({
                    ativo_id: ativo.id,
                    usuario_id: user?.id,
                    tipo_movimentacao: form.status === 'Baixado' ? 'ARQUIVAR' : 'Edição',
                    observacao: `${isTransfer ? "[TRANSFERÊNCIA] " : ""}Alterações: ${changes.join(' | ')}`,
                })
            }

            toast.success(form.status === 'Baixado' ? "Ativo arquivado!" : "Ativo atualizado!")
            onSuccess?.()
            onClose()
        } catch (error: any) {
            toast.error("Erro ao salvar", { description: error.message })
            throw error
        }
    }

    const handleAddMaintenance = async () => {
        if (!ativo || !newMaint.descricao) {
            toast.error("Preencha a descrição da manutenção", { duration: 4000 })
            return
        }

        // Trava de Status: Só permite gravar se o ativo estiver em manutenção
        if (form.status !== "Manutenção") {
            toast.error("Ativo não está em manutenção", {
                description: "Mude o status do ativo para 'Manutenção' na aba Geral antes de registrar o serviço.",
                duration: 5000
            })
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
                tecnico_id: newMaint.tecnico_id || user?.id,
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
                    description: "Você ainda precisa executar o comando SQL no Supabase para ativar esta função.",
                    duration: 4000
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

            toast.success("Manutenção registrada!", { duration: 4000 })
            setNewMaint({
                descricao: "",
                tipo: "Corretiva",
                custo: "",
                data_manutencao: new Date().toISOString().split('T')[0],
                restaurar_saude: false,
                tecnico_id: user?.id || ""
            })
            setShowMaintForm(false)

            // Update local state and DB health using the helper with join
            await fetchMaintenances()
            setIsStatusUnlocked(true) // Libera a alteração de status manualmente agora que existe um registro


            // Permanecer na aba atual
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

    const handleDeleteAsset = async () => {
        if (!ativo || !deletePassword) {
            toast.error("Informe a senha para confirmar a exclusão")
            return
        }

        setIsDeleting(true)
        try {
            // Verificar senha via re-auth
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) throw new Error("Usuário não identificado")

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: deletePassword,
            })

            if (authError) {
                toast.error("Senha incorreta", { description: "A senha de confirmação não confere." })
                setIsDeleting(false)
                return
            }

            const { error: deleteError } = await supabase
                .from('ativos')
                .delete()
                .eq('id', ativo.id)

            if (deleteError) throw deleteError

            await supabase.from('movimentacoes').insert({
                ativo_id: ativo.id,
                usuario_id: user.id,
                tipo_movimentacao: 'EXCLUIR',
                observacao: `Ativo "${ativo.nome}" excluído do sistema por confirmação de senha.`,
            })

            toast.success("Ativo excluído com sucesso!", { duration: 4000 })
            onSuccess?.()
            onClose()
        } catch (error: any) {
            toast.error("Erro ao excluir ativo", { description: error.message })
        } finally {
            setIsDeleting(false)
            setDeletePassword("")
            setShowDeleteConfirm(false)
        }
    }

    const handleDeleteMaintenance = async () => {
        if (!maintIdToDelete) return

        try {
            const { error } = await supabase
                .from('manutencoes')
                .delete()
                .eq('id', maintIdToDelete)

            if (error) throw error

            toast.success("Manutenção excluída!", { duration: 4000 })
            fetchMaintenances()
        } catch (error: any) {
            toast.error("Erro ao excluir manutenção", { description: error.message })
        } finally {
            setShowMaintDeleteConfirm(false)
            setMaintIdToDelete(null)
        }
    }

    // Health Logic
    const calculateHealth = (maints: Manutencao[]) => {
        // Find last restoration
        const lastRestorationIndex = maints.findIndex(m => m.restaurar_saude)
        const relevantMaints = lastRestorationIndex >= 0 ? maints.slice(0, lastRestorationIndex) : maints

        const correctives = relevantMaints.filter(m => m.tipo === 'Corretiva').length
        // Simple formula: 100% - 20% per corrective maintenance
        return Math.max(0, 100 - (correctives * 20))
    }

    const updateAssetHealth = async (maints: Manutencao[]) => {
        if (!ativo) return
        const health = calculateHealth(maints)
        const status_saude = health > 60 ? 'Excelente' : health > 30 ? 'Alerta' : 'Crítico'

        // Only update if changed
        if (ativo.saude !== health) {
            await supabase.from('ativos').update({
                saude: health,
                // We update the JSONB column or separate columns depending on schema. 
                // types/index.ts has saude: number. 
                // Let's assume we just update saude column for now as the specialized column.
            }).eq('id', ativo.id)
        }
    }

    // Derived values for UI
    const maintenanceCount = maintenances.length

    // Calculate corrective count since last restore
    const lastRestoreIndex = maintenances.findIndex(m => m.restaurar_saude)
    const activeMaints = lastRestoreIndex >= 0 ? maintenances.slice(0, lastRestoreIndex) : maintenances
    const correctiveCount = activeMaints.filter(m => m.tipo === 'Corretiva').length

    const healthPercent = Math.max(0, 100 - (correctiveCount * 20))

    const isHardware = HARDWARE_TYPES.includes(form.tipo as any)
    const isMonitor = MONITOR_TYPES.includes(form.tipo as any)

    const healthColor = healthPercent > 60 ? 'text-emerald-500' : healthPercent > 30 ? 'text-amber-500' : 'text-red-500'
    // State for real-time monitoring data
    const [monitoringData, setMonitoringData] = useState<Partial<Ativo> | null>(null)

    const fetchMonitoringData = async () => {
        if (!ativo) return
        try {
            const { data, error } = await supabase
                .from('ativos')
                .select('sistema_operacional, ultimo_usuario, tempo_ligado, ultima_conexao, processador, memoria_ram, armazenamento')
                .eq('id', ativo.id)
                .single()

            if (data) {
                setMonitoringData(data)
            }
        } catch (error) {
            console.error("Erro ao buscar dados de monitoramento:", error)
        }
    }

    useEffect(() => {
        if (open && ativo) {
            fetchMaintenances()
            fetchMonitoringData()
            // Set up a simple poll every 30 seconds while modal is open
            const interval = setInterval(fetchMonitoringData, 30000)
            return () => clearInterval(interval)
        }
    }, [ativo, open])

    // Use monitoring data if available, otherwise fallback to prop
    const displayAtivo = monitoringData ? { ...ativo, ...monitoringData } : ativo

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) onClose()
        }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-zinc-950 p-0 gap-0 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5">
                    <div>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                    <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                {mode === 'edit' ? 'Editar Ativo' : 'Detalhes do Ativo'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                {displayAtivo?.nome || 'Novo Ativo'}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="px-8 py-8 space-y-8">
                    <Tabs defaultValue="geral" className="w-full">
                        <TabsList className="bg-slate-100/50 dark:bg-white/5 p-1 rounded-2xl mb-8 border border-slate-200/50 dark:border-white/5 w-full justify-start h-auto">
                            <TabsTrigger value="geral" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm transition-all gap-2">
                                <FileText className="h-4 w-4" />
                                Dados Gerais
                            </TabsTrigger>
                            <TabsTrigger value="manutencao" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm transition-all gap-2">
                                <Wrench className="h-4 w-4" />
                                Manutenções
                            </TabsTrigger>
                            <TabsTrigger value="historico" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm transition-all gap-2">
                                <History className="h-4 w-4" />
                                Histórico
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="geral" className="space-y-8 focus-visible:ring-0 mt-0">
                            {/* Health Status Card */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-16 w-16 rounded-full flex items-center justify-center border-4",
                                            displayAtivo?.saude_info?.status_saude === 'Excelente' ? "bg-emerald-50 border-emerald-100 text-emerald-500" :
                                                displayAtivo?.saude_info?.status_saude === 'Alerta' ? "bg-amber-50 border-amber-100 text-amber-500" :
                                                    "bg-rose-50 border-rose-100 text-rose-500"
                                        )}>
                                            <Heart className="h-8 w-8 fill-current" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Saúde Operacional</h3>
                                                <Badge className={cn(
                                                    "text-[10px] px-2 py-0.5 h-5",
                                                    displayAtivo?.saude_info?.status_saude === 'Excelente' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                                                        displayAtivo?.saude_info?.status_saude === 'Alerta' ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                                                            "bg-rose-100 text-rose-700 hover:bg-rose-100"
                                                )}>
                                                    {displayAtivo?.saude ? `${displayAtivo.saude}%` : 'N/A'}
                                                </Badge>
                                            </div>
                                            <p className="text-slate-500 text-sm font-medium">
                                                {displayAtivo?.saude_info?.contagem_saude || 0} intervenções registradas
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Status Atual</label>
                                    <Select
                                        disabled={saving || isViewMode}
                                        onValueChange={(val) => handleChange('status', val)}
                                        value={form.status}
                                    >
                                        <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 transition-all">
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Em uso" className="font-medium">Em uso</SelectItem>
                                            <SelectItem value="Disponível" className="font-medium">Disponível</SelectItem>
                                            <SelectItem value="Em manutenção" className="font-medium">Em manutenção</SelectItem>
                                            <SelectItem value="Baixado" className="font-medium">Baixado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Monitoring Card */}
                            {displayAtivo && (displayAtivo.sistema_operacional || displayAtivo.ultimo_usuario || displayAtivo.ultima_conexao) && (
                                <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Activity className="h-4 w-4 text-blue-500" />
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Monitoramento em Tempo Real</span>
                                        {(() => {
                                            const lastConnection = displayAtivo.ultima_conexao ? new Date(displayAtivo.ultima_conexao) : null
                                            const timeDiff = lastConnection ? (new Date().getTime() - lastConnection.getTime()) / 1000 / 60 : 999
                                            const isOnline = timeDiff < 10 // 10 minutes tolerance

                                            return isOnline ? (
                                                <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-600 border-emerald-200 gap-1">
                                                    <Wifi className="h-3 w-3" /> Online
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="ml-auto bg-slate-100 text-slate-500 border-slate-200 gap-1">
                                                    <WifiOff className="h-3 w-3" /> Offline
                                                </Badge>
                                            )
                                        })()}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Sistema</span>
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                <Monitor className="h-3.5 w-3.5 text-slate-400" />
                                                {displayAtivo.sistema_operacional || "—"}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Usuário Logado</span>
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                <User className="h-3.5 w-3.5 text-slate-400" />
                                                {displayAtivo.ultimo_usuario || "—"}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Tempo Ligado</span>
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                <History className="h-3.5 w-3.5 text-slate-400" />
                                                {displayAtivo.tempo_ligado || "—"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main Form Padronizado */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Nome do Ativo *</label>
                                    <Input value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} disabled={isViewMode} className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tipo *</label>
                                    <select value={form.tipo} onChange={(e) => handleChange('tipo', e.target.value)} disabled={isViewMode} className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white">
                                        <option value="">Selecione</option>
                                        {categories.length > 0 ? (
                                            categories.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)
                                        ) : (
                                            EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Número de Série *</label>
                                    <Input value={form.serial} onChange={(e) => handleChange('serial', e.target.value)} disabled={isViewMode} className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Patrimônio</label>
                                    <Input value={form.patrimonio} onChange={(e) => handleChange('patrimonio', e.target.value)} disabled={isViewMode} className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Setor *</label>
                                    <select
                                        value={form.setor}
                                        onChange={(e) => handleChange('setor', e.target.value)}
                                        disabled={isViewMode}
                                        className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white"
                                    >
                                        <option value="">Selecione um setor...</option>
                                        {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Responsável *</label>
                                    <select
                                        value={form.colaborador}
                                        onChange={(e) => handleChange('colaborador', e.target.value)}
                                        disabled={!form.setor || isViewMode}
                                        className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white disabled:opacity-50"
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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Condição</label>
                                    <select
                                        value={form.condicao}
                                        onChange={(e) => handleChange('condicao', e.target.value)}
                                        disabled={isViewMode}
                                        className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white"
                                    >
                                        <option value="Novo">Novo</option>
                                        <option value="Semi-novo">Semi-novo</option>
                                    </select>
                                </div>
                                {(form as any).condicao === 'Novo' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Garantia (Meses)</label>
                                        <Input
                                            type="number"
                                            value={(form as any).garantia_meses}
                                            onChange={(e) => handleChange('garantia_meses', e.target.value)}
                                            disabled={isViewMode}
                                            className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Technical Specs Sections Padronizadas */}
                            {isHardware && (
                                <div className="space-y-4 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                                            <Cpu className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <h3 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tighter">Especificações de Hardware</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center justify-between">
                                                Processador
                                                {monitoringData?.processador && monitoringData.processador !== 'Desconhecido' && (
                                                    <span className="text-[9px] text-indigo-500 font-black tracking-tighter uppercase flex items-center gap-1">
                                                        <Cpu className="h-2.5 w-2.5" /> Auto
                                                    </span>
                                                )}
                                            </label>
                                            {monitoringData?.processador && monitoringData.processador !== 'Desconhecido' ? (
                                                <div className="h-10 px-3 bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 rounded-xl text-sm font-black flex items-center text-slate-700 dark:text-indigo-300">
                                                    {monitoringData.processador}
                                                </div>
                                            ) : (
                                                <Input
                                                    value={form.processador}
                                                    onChange={(e) => handleChange('processador', e.target.value)}
                                                    disabled={isViewMode}
                                                    placeholder="Ex: Intel Core i5"
                                                    className="h-10 rounded-xl bg-white dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-black text-sm"
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center justify-between">
                                                Memória RAM
                                                {monitoringData?.memoria_ram && monitoringData.memoria_ram !== 'Desconhecido' && (
                                                    <span className="text-[9px] text-indigo-500 font-black tracking-tighter uppercase flex items-center gap-1">
                                                        <Activity className="h-2.5 w-2.5" /> Auto
                                                    </span>
                                                )}
                                            </label>
                                            {monitoringData?.memoria_ram && monitoringData.memoria_ram !== 'Desconhecido' ? (
                                                <div className="h-10 px-3 bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 rounded-xl text-sm font-black flex items-center text-slate-700 dark:text-indigo-300">
                                                    {monitoringData.memoria_ram}
                                                </div>
                                            ) : (
                                                <Input
                                                    value={form.memoria_ram}
                                                    onChange={(e) => handleChange('memoria_ram', e.target.value)}
                                                    disabled={isViewMode}
                                                    placeholder="Ex: 16 GB"
                                                    className="h-10 rounded-xl bg-white dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-black text-sm"
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center justify-between">
                                                Armazenamento
                                                {monitoringData?.armazenamento && monitoringData.armazenamento !== 'Desconhecido' && (
                                                    <span className="text-[9px] text-indigo-500 font-black tracking-tighter uppercase flex items-center gap-1">
                                                        <History className="h-2.5 w-2.5" /> Auto
                                                    </span>
                                                )}
                                            </label>
                                            {monitoringData?.armazenamento && monitoringData.armazenamento !== 'Desconhecido' ? (
                                                <div className="h-10 px-3 bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 rounded-xl text-sm font-black flex items-center text-slate-700 dark:text-indigo-300">
                                                    {monitoringData.armazenamento}
                                                </div>
                                            ) : (
                                                <Input
                                                    value={form.armazenamento}
                                                    onChange={(e) => handleChange('armazenamento', e.target.value)}
                                                    disabled={isViewMode}
                                                    placeholder="Ex: 512 GB SSD"
                                                    className="h-10 rounded-xl bg-white dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm font-black text-sm"
                                                />
                                            )}
                                        </div>

                                        {form.colaborador && isHardware && (
                                            <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-top-2 mt-4">
                                                <input
                                                    type="checkbox"
                                                    disabled={isViewMode}
                                                    checked={form.is_setor_responsavel}
                                                    onChange={(e) => handleChange('is_setor_responsavel', e.target.checked.toString())}
                                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-all disabled:opacity-50"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-text-primary dark:text-white uppercase tracking-tighter">Responsável de Setor</span>
                                                    <span className="text-[10px] text-text-muted font-bold">Permite vincular este computador mesmo se o colaborador já tiver outro.</span>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isMonitor && (
                                <div className="space-y-6 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                                            <Monitor className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <h3 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tighter">Especificações do Display</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tamanho (Pol)</label>
                                            <select value={form.polegadas} onChange={(e) => handleChange('polegadas', e.target.value)} disabled={isViewMode} className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-600/20 transition-all dark:text-white shadow-sm">
                                                <option value="">Selecione</option>
                                                {MONITOR_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Interfaces de Vídeo</label>
                                            <div className="flex flex-wrap gap-2">
                                                {VIDEO_OUTPUTS.map(output => (
                                                    <button
                                                        key={output}
                                                        onClick={() => !isViewMode && toggleVideoOutput(output)}
                                                        disabled={isViewMode}
                                                        className={cn(
                                                            "h-10 px-4 rounded-xl border text-xs font-black transition-all",
                                                            form.saidas_video.includes(output)
                                                                ? "bg-primary-600 text-white border-transparent shadow-md shadow-primary-600/20"
                                                                : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-text-muted hover:border-primary-600"
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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Acesso Remoto</label>
                                    <Input value={form.acesso_remoto} onChange={(e) => handleChange('acesso_remoto', e.target.value)} disabled={isViewMode} placeholder="AnyDesk, TeamViewer..." className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                </div>
                            )}

                            {/* Replacement Suggestion Card Premium */}
                            {correctiveCount >= threshold && (
                                <div className="p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                    <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 flex items-center justify-center text-red-500 shadow-sm shrink-0">
                                        <AlertTriangle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-red-900 dark:text-red-400">Substituição Recomendada</p>
                                        <p className="text-xs text-red-600 dark:text-red-500/80 font-medium">Este ativo atingiu {correctiveCount} manutenções corretivas. Considere a troca por um novo equipamento.</p>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {!isViewMode && (
                            <TabsContent value="manutencao" className="p-8 space-y-6 m-0">
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em]">Registro de Intervenção</span>
                                            <span className="text-xs text-text-muted font-medium">Preencha os dados do serviço realizado.</span>
                                        </div>
                                        {form.status !== "Manutenção" && (
                                            <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 border border-amber-100 dark:border-amber-900/30">
                                                <AlertCircle className="h-3 w-3" /> Status "Manutenção" Obrigatório
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Data do Serviço</label>
                                                <Input
                                                    type="date"
                                                    value={newMaint.data_manutencao}
                                                    onChange={(e) => setNewMaint({ ...newMaint, data_manutencao: e.target.value })}
                                                    className="h-10 rounded-xl bg-white dark:bg-zinc-800 border-transparent shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tipo de Intervenção</label>
                                                <select
                                                    value={newMaint.tipo}
                                                    onChange={(e) => setNewMaint({ ...newMaint, tipo: e.target.value })}
                                                    className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-600/20 transition-all dark:text-white shadow-sm"
                                                >
                                                    <option value="Corretiva">Corretiva</option>
                                                    <option value="Preventiva">Preventiva</option>
                                                    <option value="Upgrade">Upgrade</option>
                                                    <option value="Outro">Outro</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Técnico Responsável</label>
                                                <select
                                                    value={newMaint.tecnico_id}
                                                    onChange={(e) => setNewMaint({ ...newMaint, tecnico_id: e.target.value })}
                                                    className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-600/20 transition-all dark:text-white shadow-sm"
                                                >
                                                    <option value="">Selecione o técnico...</option>
                                                    {usuarios.map(u => (
                                                        <option key={u.id} value={u.id}>{u.full_name || 'Sem nome'}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {(['Upgrade', 'Outro', 'Preventiva'].includes(newMaint.tipo)) && (
                                                <label className="flex items-center gap-3 cursor-pointer group bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={newMaint.restaurar_saude}
                                                        onChange={(e) => setNewMaint({ ...newMaint, restaurar_saude: e.target.checked })}
                                                        className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-600 transition-all"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-text-primary dark:text-white uppercase tracking-tighter">Restaurar Saúde Operational</span>
                                                        <span className="text-[8px] text-text-muted font-medium">Resetar indicadores de desgaste.</span>
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Relatório Técnico</label>
                                        <textarea
                                            value={newMaint.descricao}
                                            onChange={(e) => setNewMaint({ ...newMaint, descricao: e.target.value })}
                                            className="w-full min-h-[120px] p-4 rounded-xl border border-transparent bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-600/20 transition-all shadow-sm resize-none dark:text-white"
                                            placeholder="Descreva detalhadamente o serviço realizado..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={handleAddMaintenance}
                                            disabled={savingMaint || !newMaint.descricao || form.status !== "Manutenção"}
                                            className="px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:grayscale"
                                        >
                                            {savingMaint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Gravar Manutenção
                                        </button>
                                    </div>
                                </div>
                            </TabsContent>
                        )}

                        <TabsContent value="historico" className="p-8 space-y-6 m-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em]">Registro Histórico</span>
                                    <span className="text-xs text-text-muted font-medium">Todas as intervenções realizadas neste ativo.</span>
                                </div>
                                <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-[10px] font-black text-text-muted rounded-lg border border-slate-200 dark:border-white/10">
                                    {maintenances.length} REGISTROS
                                </div>
                            </div>
                            <div className="space-y-4">
                                {maintenances.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 bg-neutral-app dark:bg-white/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 opacity-60">
                                        <History className="h-8 w-8 text-text-muted mb-2" />
                                        <p className="text-sm font-bold text-text-muted">Nenhum histórico disponível</p>
                                    </div>
                                ) : (
                                    maintenances.map(m => (
                                        <div key={m.id} className="p-5 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                            {m.restaurar_saude && (
                                                <div className="absolute top-0 right-0 px-3 py-1 bg-success-600 text-[9px] font-black text-white uppercase tracking-widest rounded-bl-xl flex items-center gap-1">
                                                    <ShieldCheck className="h-3 w-3" /> Saúde Restaurada
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                                        m.tipo === 'Preventiva' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                            m.tipo === 'Upgrade' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                                                                'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                                                    )}>
                                                        {m.tipo}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-text-muted">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span className="text-[11px] font-black">{format(new Date(m.data_manutencao || m.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setMaintIdToDelete(m.id);
                                                        setShowMaintDeleteConfirm(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Excluir manutenção"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-text-secondary dark:text-slate-300 leading-relaxed font-medium">{m.descricao}</p>
                                            <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                                <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black">
                                                    {(Array.isArray(m.tecnico) ? m.tecnico[0]?.full_name : m.tecnico?.full_name)?.charAt(0) || 'T'}
                                                </div>
                                                <span className="text-[11px] font-bold text-text-muted uppercase tracking-tighter">
                                                    Técnico: {(() => {
                                                        const name = Array.isArray(m.tecnico) ? m.tecnico[0]?.full_name : m.tecnico?.full_name;
                                                        if (name) return name;
                                                        if (m.tecnico_id) {
                                                            const u = usuarios.find(u => u.id === m.tecnico_id);
                                                            return u?.full_name || 'Técnico Identificado';
                                                        }
                                                        return 'Sistema';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Footer Padronizado e Contextual */}
                <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center justify-between">
                    <div>
                        {!isViewMode && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-6 py-2.5 text-red-600 dark:text-red-400 text-sm font-black hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                                Excluir Ativo
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-black text-text-muted hover:text-text-primary transition-all"
                        >
                            {isViewMode ? "Fechar" : "Cancelar"}
                        </button>
                        {!isViewMode && activeTab === 'geral' && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Salvar Ativo
                            </button>
                        )}
                        {!isViewMode && activeTab === 'manutencao' && (
                            <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-black text-text-muted uppercase tracking-widest border border-slate-200 dark:border-white/10">
                                Use o botão interno para gravar
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>

            {/* Password Confirmation for Asset Deletion */}
            <PasswordConfirmModal
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Confirmar Exclusão"
                description={
                    <span>
                        Você está prestes a excluir o ativo <strong className="text-red-600">"{ativo?.nome}"</strong>. Esta ação é irreversível.
                    </span>
                }
                onConfirm={handleDeleteAsset}
                confirmText="Excluir Ativo"
            />

            {/* Password Confirmation for Maintenance Deletion */}
            <PasswordConfirmModal
                open={showMaintDeleteConfirm}
                onOpenChange={setShowMaintDeleteConfirm}
                title="Confirmar Exclusão de Manutenção"
                description="Deseja realmente excluir este registro de manutenção? Esta ação apagará o histórico e os custos associados a este serviço."
                onConfirm={handleDeleteMaintenance}
                confirmText="Excluir Registro"
            />

            {/* Password Confirmation for Archiving (Status: Baixado) */}
            <PasswordConfirmModal
                open={showArchiveConfirm}
                onOpenChange={setShowArchiveConfirm}
                title="Confirmar Arquivamento"
                description={
                    <span>
                        Você está marcando o ativo <strong className="text-amber-600">"{ativo?.nome}"</strong> como <strong>Baixado</strong>. Ele sairá da lista principal, mas o histórico será mantido.
                    </span>
                }
                onConfirm={handleConfirmArchive}
                confirmText="Confirmar Arquivamento"
            />
        </Dialog>
    )
}
