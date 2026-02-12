"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import {
    Building2, Save, Globe, Mail, Phone, MapPin,
    Link as LinkIcon, Camera, Loader2, Info
} from "lucide-react"

export function CompanyData() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        inscricao_estadual: "",
        inscricao_municipal: "",
        cnae: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        telefone: "",
        whatsapp: "",
        email: "",
        website: "",
        logo_url: "",
    })

    useEffect(() => {
        fetchCompanyData()
    }, [])

    async function fetchCompanyData() {
        try {
            const { data, error } = await supabase
                .from('empresa')
                .select('*')
                .single()

            if (error && error.code !== 'PGRST116') throw error
            if (data) setForm(data)
        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao carregar dados da empresa")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('empresa')
                .upsert({
                    ...form,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            toast.success("Dados da empresa salvos com sucesso!")
        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao salvar dados")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Carregando informações...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Dados da Empresa</h2>
                    <p className="text-slate-400 font-medium">Informações institucionais usadas em relatórios e documentos.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Identidade Institucional */}
                <Section title="Identidade Institucional" icon={<Building2 className="h-5 w-5" />}>
                    <div className="grid gap-4">
                        <Field label="Razão Social" value={form.razao_social} onChange={(v) => setForm({ ...form, razao_social: v })} placeholder="Ex: Inventário TI LTDA" />
                        <Field label="Nome Fantasia" value={form.nome_fantasia} onChange={(v) => setForm({ ...form, nome_fantasia: v })} placeholder="Ex: TI System" />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: v })} placeholder="00.000.000/0000-00" />
                            <Field label="CNAE" value={form.cnae} onChange={(v) => setForm({ ...form, cnae: v })} placeholder="6201-5/01" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Inscrição Estadual" value={form.inscricao_estadual} onChange={(v) => setForm({ ...form, inscricao_estadual: v })} />
                            <Field label="Inscrição Municipal" value={form.inscricao_municipal} onChange={(v) => setForm({ ...form, inscricao_municipal: v })} />
                        </div>
                    </div>
                </Section>

                {/* Identidade Visual */}
                <Section title="Identidade Visual" icon={<Camera className="h-5 w-5" />}>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-4">
                            {form.logo_url ? (
                                <img src={form.logo_url} alt="Logo" className="h-20 object-contain" />
                            ) : (
                                <div className="h-20 w-20 rounded-2xl bg-white border flex items-center justify-center text-slate-300">
                                    <Building2 className="h-10 w-10" />
                                </div>
                            )}
                            <Field label="URL do Logotipo" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} placeholder="https://exemplo.com/logo.png" />
                            <p className="text-[10px] text-slate-400 text-center px-4">Utilize uma URL de imagem pública ou hospede em seu Supabase Storage.</p>
                        </div>
                    </div>
                </Section>

                {/* Localização */}
                <Section title="Endereço Completo" icon={<MapPin className="h-5 w-5" />}>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <Field label="Logradouro" value={form.logradouro} onChange={(v) => setForm({ ...form, logradouro: v })} />
                            </div>
                            <Field label="Número" value={form.numero} onChange={(v) => setForm({ ...form, numero: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Complemento" value={form.complemento} onChange={(v) => setForm({ ...form, complemento: v })} />
                            <Field label="Bairro" value={form.bairro} onChange={(v) => setForm({ ...form, bairro: v })} />
                        </div>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6">
                                <Field label="Cidade" value={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} />
                            </div>
                            <div className="col-span-2">
                                <Field label="UF" value={form.estado} onChange={(v) => setForm({ ...form, estado: v })} maxLength={2} />
                            </div>
                            <div className="col-span-4">
                                <Field label="CEP" value={form.cep} onChange={(v) => setForm({ ...form, cep: v })} />
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Contato */}
                <Section title="Canais de Contato" icon={<Phone className="h-5 w-5" />}>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
                            <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
                        </div>
                        <Field label="E-mail Corporativo" value={form.email} onChange={(v) => setForm({ ...form, email: v })} icon={<Mail className="h-3 w-3" />} />
                        <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} icon={<Globe className="h-3 w-3" />} />
                    </div>
                </Section>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
                <Info className="h-5 w-5 text-blue-500 mt-1" />
                <p className="text-sm text-blue-700 italic">
                    <strong>Importante:</strong> Estes dados são preenchidos automaticamente no cabeçalho de todos os relatórios gerados pelo sistema. Certifique-se de que o CNPJ e a Razão Social estejam corretos para fins de auditoria.
                </p>
            </div>
        </div>
    )
}

function Section({ title, icon, children }: any) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
                {icon}
                <span className="text-xs font-black uppercase tracking-widest">{title}</span>
            </div>
            <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                {children}
            </div>
        </div>
    )
}

function Field({ label, value, onChange, placeholder, icon, maxLength }: { label: string, value: string | null, onChange: (v: string) => void, placeholder?: string, icon?: React.ReactNode, maxLength?: number }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                {icon}
                {label}
            </label>
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300"
            />
        </div>
    )
}
