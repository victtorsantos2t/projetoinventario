"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Setor } from "@/types"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"
import {
    EQUIPMENT_TYPES, STATUS_OPTIONS, RAM_OPTIONS, STORAGE_OPTIONS,
    CPU_GENERATIONS, HARDWARE_TYPES, MONITOR_TYPES, MONITOR_SIZES,
    VIDEO_OUTPUTS, ASSET_CONDITIONS
} from "@/lib/constants"
import { Plus, X, Cpu, Monitor, ShieldCheck, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

export function AddAssetModal() {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [setores, setSetores] = useState<Setor[]>([])
    const [usuarios, setUsuarios] = useState<{ id: string, full_name: string | null, setor_id: string | null, is_setor_responsavel?: boolean | null }[]>([])
    const [categories, setCategories] = useState<{ id: string, nome: string }[]>([])

    const emptyForm = {
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
    }
    const [form, setForm] = useState(emptyForm)

    useEffect(() => {
        if (open) {
            Promise.all([
                supabase.from('setores').select('id, nome').order('nome'),
                supabase.from('profiles').select('id, full_name, setor_id, is_setor_responsavel').order('full_name'),
                supabase.from('categorias_ativos').select('id, nome').order('nome'),
                supabase.from('configuracoes').select('valor').eq('chave', 'garantia_padrao_meses').maybeSingle()
            ]).then(([setoresRes, usersRes, catRes, configRes]) => {
                if (setoresRes.data) setSetores(setoresRes.data)
                if (usersRes.data) setUsuarios(usersRes.data as any)
                if (catRes.data) setCategories(catRes.data)
                if (configRes.data?.valor) {
                    setForm(prev => ({ ...prev, garantia_meses: parseInt(configRes.data!.valor) }))
                }
            })
        }
    }, [open])

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

    const handleSubmit = async () => {
        if (!form.nome || !form.serial || !form.tipo) {
            toast.error("Preencha os campos obrigatórios: Nome, Tipo e Serial")
            return
        }
        setSaving(true)

        try {
            // 1. Validations
            // Uniqueness check for Serial
            const { data: existingSerial } = await supabase
                .from('ativos')
                .select('id')
                .eq('serial', form.serial)
                .maybeSingle()

            if (existingSerial) {
                toast.error("Este Número de Série já está cadastrado!")
                setSaving(false)
                return
            }

            // Uniqueness check for Patrimonio
            if (form.patrimonio) {
                const { data: existingPatrimonio } = await supabase
                    .from('ativos')
                    .select('id')
                    .eq('patrimonio', form.patrimonio)
                    .maybeSingle()

                if (existingPatrimonio) {
                    toast.error("Este Número de Patrimônio já está cadastrado!")
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
                        .maybeSingle()

                    if (existingHardware) {
                        toast.error(`${form.colaborador} já possui um computador/notebook vinculado (${existingHardware.nome})!`)
                        setSaving(false)
                        return
                    }
                }
            }

            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase.from('ativos').insert({
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
                condicao: form.condicao,
                tem_garantia: form.tem_garantia,
                garantia_meses: form.tem_garantia ? form.garantia_meses : 0,
            })

            if (error) throw error

            await supabase.from('movimentacoes').insert({
                ativo_id: (await supabase.from('ativos').select('id').eq('serial', form.serial).single()).data?.id,
                usuario_id: user?.id,
                tipo_movimentacao: 'Criação',
                observacao: `Ativo "${form.nome}" cadastrado como ${form.tipo}`,
            })

            toast.success("Ativo cadastrado com sucesso!")
            setForm(emptyForm)
            setOpen(false)
        } catch (error: unknown) {
            let msg = "Erro desconhecido"
            if (error instanceof Error) msg = error.message
            else if (typeof error === 'object' && error !== null && 'message' in error) msg = String((error as { message: unknown }).message)
            else if (typeof error === 'string') msg = error

            logger.error("Erro ao cadastrar ativo:", msg)
            toast.error(`Erro ao cadastrar ativo: ${msg}`)
        } finally {
            setSaving(false)
        }
    }

    const isHardware = HARDWARE_TYPES.includes(form.tipo as typeof HARDWARE_TYPES[number])
    const isMonitor = MONITOR_TYPES.includes(form.tipo as typeof MONITOR_TYPES[number])

    const [activeTab, setActiveTab] = useState<'geral' | 'tecnico'>('geral')

    return (
        <>
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 active:scale-95">
                <Plus className="h-4 w-4" />
                Novo Ativo
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300 flex flex-col max-h-[90vh]">
                    {/* Header Padronizado */}
                    <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                                <Plus className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-text-primary dark:text-white">
                                    Cadastrar Novo Ativo
                                </DialogTitle>
                                <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium">
                                    Preencha as informações técnicas e administrativas do equipamento.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Tabs System */}
                    <div className="px-8 pt-2 border-b border-slate-100 dark:border-white/5 flex gap-8 bg-white dark:bg-zinc-900 shrink-0">
                        <button
                            onClick={() => setActiveTab('geral')}
                            className={`pb-3 text-sm font-black border-b-2 transition-all ${activeTab === 'geral' ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                        >
                            Dados Gerais
                        </button>
                        {(isHardware || isMonitor) && (
                            <button
                                onClick={() => setActiveTab('tecnico')}
                                className={`pb-3 text-sm font-black border-b-2 transition-all ${activeTab === 'tecnico' ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                            >
                                Especificações Técnicas
                            </button>
                        )}
                    </div>

                    <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-white dark:bg-zinc-900">
                        {activeTab === 'geral' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {/* Basic Info Padronizado */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Nome do Ativo *</label>
                                        <Input value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} placeholder="Ex: PC-RH-001" className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tipo de Equipamento *</label>
                                        <select value={form.tipo} onChange={(e) => handleChange('tipo', e.target.value)} className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white">
                                            <option value="">Selecione...</option>
                                            {categories.length > 0 ? (
                                                categories.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)
                                            ) : (
                                                EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Número de Série *</label>
                                        <Input value={form.serial} onChange={(e) => handleChange('serial', e.target.value)} placeholder="SN-XXXXX" className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Patrimônio (Tag)</label>
                                        <Input value={form.patrimonio} onChange={(e) => handleChange('patrimonio', e.target.value)} placeholder="Nº do patrimônio" className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Setor / Departamento</label>
                                        <select value={form.setor} onChange={(e) => handleChange('setor', e.target.value)} className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white">
                                            <option value="">Sem setor (Estoque)</option>
                                            {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status Operacional</label>
                                        <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full h-11 px-4 bg-neutral-app dark:bg-white/5 border border-transparent rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-primary-600/20 transition-all outline-none shadow-sm dark:text-white">
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Warranty Section Padronizada */}
                                <div className="space-y-4 p-6 bg-emerald-50 dark:bg-white/5 rounded-2xl border border-transparent">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                                                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <h3 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tighter">Políticas & Garantia</h3>
                                        </div>
                                        <select
                                            value={form.condicao}
                                            onChange={(e) => handleChange('condicao', e.target.value)}
                                            className="h-10 px-3 bg-white dark:bg-zinc-800 border-transparent rounded-xl text-xs font-black outline-none shadow-sm dark:text-white"
                                        >
                                            <option value="Novo">Novo</option>
                                            <option value="Semi-novo">Semi-novo</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                        <label className="flex items-center gap-3 cursor-pointer group bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                            <input
                                                type="checkbox"
                                                checked={form.tem_garantia}
                                                onChange={(e) => handleChange('tem_garantia', e.target.checked.toString())}
                                                className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-600 transition-all"
                                            />
                                            <span className="text-xs font-black text-text-primary dark:text-white uppercase tracking-tighter">Ativar Cobertura de Garantia</span>
                                        </label>

                                        {form.tem_garantia && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Duração (Meses)</label>
                                                <Input
                                                    type="number"
                                                    value={form.garantia_meses}
                                                    onChange={(e) => handleChange('garantia_meses', e.target.value)}
                                                    className="h-11 rounded-xl bg-white dark:bg-zinc-800 border-transparent transition-all shadow-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Colaborador Responsável</label>
                                        <select
                                            value={form.colaborador}
                                            onChange={(e) => handleChange('colaborador', e.target.value)}
                                            disabled={!form.setor}
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
                                </div>
                            </div>
                        )}

                        {activeTab === 'tecnico' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {/* Hardware Specs Padronizado */}
                                {isHardware && (
                                    <div className="space-y-6">
                                        <div className="space-y-4 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                                                    <Cpu className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                                                </div>
                                                <h3 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tighter">Especificações de Hardware</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Processador</label>
                                                    <select value={form.processador} onChange={(e) => handleChange('processador', e.target.value)} className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-600/20 transition-all dark:text-white shadow-sm">
                                                        <option value="">Selecione</option>
                                                        {CPU_GENERATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Memória RAM</label>
                                                    <select value={form.memoria_ram} onChange={(e) => handleChange('memoria_ram', e.target.value)} className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-600/20 transition-all dark:text-white shadow-sm">
                                                        <option value="">Selecione</option>
                                                        {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Armazenamento</label>
                                                    <select value={form.armazenamento} onChange={(e) => handleChange('armazenamento', e.target.value)} className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-600/20 transition-all dark:text-white shadow-sm">
                                                        <option value="">Selecione</option>
                                                        {STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Acesso Remoto</label>
                                            <Input value={form.acesso_remoto} onChange={(e) => handleChange('acesso_remoto', e.target.value)} placeholder="Ex: ID AnyDesk / TeamViewer" className="h-11 rounded-xl bg-neutral-app dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-zinc-800 transition-all shadow-sm" />
                                        </div>
                                    </div>
                                )}

                                {/* Monitor Specs Padronizado */}
                                {isMonitor && (
                                    <div className="space-y-4 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                                                <Monitor className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                                            </div>
                                            <h3 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tighter">Especificações do Display</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tamanho (Pol)</label>
                                                <select value={form.polegadas} onChange={(e) => handleChange('polegadas', e.target.value)} className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-600/20 transition-all dark:text-white shadow-sm">
                                                    <option value="">Selecione</option>
                                                    {MONITOR_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 block">Interfaces de Vídeo</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {VIDEO_OUTPUTS.map(output => (
                                                        <button
                                                            key={output}
                                                            type="button"
                                                            onClick={() => toggleVideoOutput(output)}
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
                            </div>
                        )}
                    </div>

                    {/* Footer Padronizado */}
                    <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center justify-end gap-3 shrink-0">
                        <button
                            onClick={() => setOpen(false)}
                            className="px-6 py-2.5 text-sm font-black text-text-muted hover:text-text-primary transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !form.nome || !form.serial || !form.tipo}
                            className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-black hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Cadastrar Ativo
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
