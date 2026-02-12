"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Setor } from "@/types"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import {
    EQUIPMENT_TYPES, STATUS_OPTIONS, RAM_OPTIONS, STORAGE_OPTIONS,
    CPU_GENERATIONS, HARDWARE_TYPES, MONITOR_TYPES, MONITOR_SIZES,
    VIDEO_OUTPUTS, ASSET_CONDITIONS
} from "@/lib/constants"
import { Plus, X, Cpu, Monitor, ShieldCheck } from "lucide-react"

export function AddAssetModal() {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [setores, setSetores] = useState<Setor[]>([])
    const [usuarios, setUsuarios] = useState<{ id: string, full_name: string | null, setor_id: string | null }[]>([])
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
                supabase.from('profiles').select('id, full_name, setor_id').order('full_name'),
                supabase.from('categorias_ativos').select('id, nome').order('nome'),
                supabase.from('configuracoes').select('valor').eq('chave', 'garantia_padrao_meses').maybeSingle()
            ]).then(([setoresRes, usersRes, catRes, configRes]) => {
                if (setoresRes.data) setSetores(setoresRes.data)
                if (usersRes.data) setUsuarios(usersRes.data)
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
                tipo_movimentacao: 'CRIAR',
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

    return (
        <>
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Novo Ativo
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Cadastrar Novo Ativo</h2>
                                <p className="text-sm text-slate-400 font-medium">Preencha as informações do equipamento</p>
                            </div>
                            <button onClick={() => setOpen(false)} className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nome *</label>
                                    <Input value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} placeholder="Ex: PC-RH-001" className="rounded-xl h-11" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Tipo *</label>
                                    <select value={form.tipo} onChange={(e) => handleChange('tipo', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium">
                                        <option value="">Selecione</option>
                                        {categories.length > 0 ? (
                                            categories.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)
                                        ) : (
                                            EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Número de Série *</label>
                                    <Input value={form.serial} onChange={(e) => handleChange('serial', e.target.value)} placeholder="SN-XXXXX" className="rounded-xl h-11" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Patrimônio</label>
                                    <Input value={form.patrimonio} onChange={(e) => handleChange('patrimonio', e.target.value)} placeholder="Nº do patrimônio" className="rounded-xl h-11" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Status</label>
                                    <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium">
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Setor</label>
                                    <select value={form.setor} onChange={(e) => handleChange('setor', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium">
                                        <option value="">Sem setor</option>
                                        {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Condição do Item</label>
                                    <select value={form.condicao} onChange={(e) => handleChange('condicao', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium">
                                        {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-4 col-span-1 md:col-span-2 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                            <h3 className="text-sm font-bold text-slate-700">Informações de Garantia</h3>
                                        </div>
                                        {form.condicao === 'Novo' && (
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={form.tem_garantia}
                                                    onChange={(e) => handleChange('tem_garantia', e.target.checked.toString())}
                                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-xs font-bold text-slate-600 group-hover:text-primary transition-colors">Possui Garantia?</span>
                                            </label>
                                        )}
                                        {form.condicao === 'Semi-novo' && (
                                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-wider">Depreciação Acelerada (50%)</span>
                                        )}
                                    </div>

                                    {form.tem_garantia && form.condicao === 'Novo' && (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <label className="text-xs font-bold text-slate-400 mb-1.5 block">Tempo de Garantia (Meses)</label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    value={form.garantia_meses}
                                                    onChange={(e) => handleChange('garantia_meses', e.target.value)}
                                                    className="rounded-xl h-10 w-32"
                                                />
                                                <span className="text-sm font-medium text-slate-500">meses a partir da data de cadastro</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Responsável</label>
                                    <select
                                        value={form.colaborador}
                                        onChange={(e) => handleChange('colaborador', e.target.value)}
                                        disabled={!form.setor}
                                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">{form.setor ? "Selecione um responsável..." : "Selecione um setor primeiro"}</option>
                                        {usuarios
                                            .filter(u => {
                                                if (!form.setor) return false
                                                const currentSetorId = setores.find(s => s.nome === form.setor)?.id
                                                // Se usuário não tem setor_id (ex: admin geral sem setor), talvez permitir? 
                                                // Mas a regra diz "tem que pertencer ao setor indicado".
                                                // Então filtragem estrita.
                                                return u.setor_id === currentSetorId
                                            })
                                            .map(u => <option key={u.id} value={u.full_name || ""}>{u.full_name}</option>)
                                        }
                                    </select>
                                </div>
                            </div>

                            {/* Computer Specs */}
                            {isHardware && (
                                <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Cpu className="h-4 w-4 text-indigo-500" />
                                        <h3 className="text-sm font-bold text-slate-700">Configuração de Hardware</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1.5 block">Processador</label>
                                            <select value={form.processador} onChange={(e) => handleChange('processador', e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm">
                                                <option value="">Selecione</option>
                                                {CPU_GENERATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1.5 block">Memória RAM</label>
                                            <select value={form.memoria_ram} onChange={(e) => handleChange('memoria_ram', e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm">
                                                <option value="">Selecione</option>
                                                {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1.5 block">Armazenamento</label>
                                            <select value={form.armazenamento} onChange={(e) => handleChange('armazenamento', e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm">
                                                <option value="">Selecione</option>
                                                {STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Monitor Specs */}
                            {isMonitor && (
                                <div className="space-y-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <div className="flex items-center gap-2">
                                        <Monitor className="h-4 w-4 text-blue-500" />
                                        <h3 className="text-sm font-bold text-slate-700">Especificações Técnicas do Monitor</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1.5 block">Tamanho (Polegadas)</label>
                                            <select value={form.polegadas} onChange={(e) => handleChange('polegadas', e.target.value)} className="w-full h-10 px-3 bg-white border border-blue-200 rounded-xl text-sm">
                                                <option value="">Selecione</option>
                                                {MONITOR_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 mb-2 block">Saídas de Vídeo</label>
                                            <div className="flex flex-wrap gap-2">
                                                {VIDEO_OUTPUTS.map(output => (
                                                    <button
                                                        key={output}
                                                        type="button"
                                                        onClick={() => toggleVideoOutput(output)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.saidas_video.includes(output)
                                                            ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-200'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                                            }`}
                                                    >
                                                        {output}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Network */}
                            {isHardware && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Acesso Remoto</label>
                                    <Input value={form.acesso_remoto} onChange={(e) => handleChange('acesso_remoto', e.target.value)} placeholder="AnyDesk, TeamViewer, ID..." className="rounded-xl h-11" />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-8 py-4 flex items-center justify-end gap-3 rounded-b-3xl">
                            <button onClick={() => setOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSubmit} disabled={saving || !form.nome || !form.serial || !form.tipo} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                                <Plus className="h-4 w-4" />
                                {saving ? "Cadastrando..." : "Cadastrar Ativo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
