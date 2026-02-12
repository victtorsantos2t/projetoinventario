"use client"

import { useState } from "react"
import {
    Settings,
    Users,
    Webhook,
    Tags,
    ShieldCheck,
    LayoutGrid,
    ChevronRight,
    Bell,
    Building2,
    Loader2,
    ShieldAlert,
    AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { UserPermissions } from "@/components/settings/user-permissions"
import { ApiIntegration } from "@/components/settings/api-integration"
import { AssetCustomization } from "@/components/settings/asset-customization"
import { SectorManagement } from "@/components/settings/sector-management"
import { CompanyData } from "@/components/settings/company-data"

import { useUserRole } from "@/hooks/use-user-role"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const navItems = [
    { id: "geral", name: "Geral", icon: Settings, desc: "Preferências básicas do sistema" },
    { id: "empresa", name: "Dados da Empresa", icon: Building2, desc: "Informações institucionais" },
    { id: "usuarios", name: "Usuários e Permissões", icon: Users, desc: "Controle de acesso e RBAC" },
    { id: "setores", name: "Gestão de Setores", icon: Building2, desc: "Departamentos e departamentos" },
    { id: "api", name: "API & Integrações", icon: Webhook, desc: "Chaves para script coletor" },
    { id: "categorias", name: "Categorias de Ativos", icon: Tags, desc: "Tipos de hardware e depreciação" },
]

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("geral")
    const [garantiaAlertaDias, setGarantiaAlertaDias] = useState("30")
    const [thresholdSubstituicao, setThresholdSubstituicao] = useState("5")
    const [garantiaPadraoMeses, setGarantiaPadraoMeses] = useState("12")
    const { isAdmin, loading } = useUserRole()
    const router = useRouter()

    useEffect(() => {
        if (isAdmin && activeTab === "geral") {
            fetchConfig()
        }
    }, [isAdmin, activeTab])

    async function fetchConfig() {
        const { data, error } = await supabase
            .from('configuracoes')
            .select('chave, valor')

        if (data) {
            const configMap = Object.fromEntries(data.map(i => [i.chave, i.valor]))
            if (configMap.alerta_garantia_dias) setGarantiaAlertaDias(configMap.alerta_garantia_dias)
            if (configMap.threshold_substituicao) setThresholdSubstituicao(configMap.threshold_substituicao)
            if (configMap.garantia_padrao_meses) setGarantiaPadraoMeses(configMap.garantia_padrao_meses)
        }
    }

    const updateConfig = async (chave: string, val: string) => {
        if (chave === 'alerta_garantia_dias') setGarantiaAlertaDias(val)
        if (chave === 'threshold_substituicao') setThresholdSubstituicao(val)
        if (chave === 'garantia_padrao_meses') setGarantiaPadraoMeses(val)

        const { error } = await supabase
            .from('configuracoes')
            .upsert({
                chave,
                valor: val,
                updated_at: new Date().toISOString()
            }, { onConflict: 'chave' })

        if (error) toast.error("Erro ao salvar configuração")
        else toast.success("Configuração atualizada!")
    }


    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-slate-500 font-medium">Verificando permissões...</p>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
                <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 shadow-xl shadow-red-100">
                    <ShieldAlert className="h-10 w-10" />
                </div>
                <div className="max-w-md">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Acesso Restrito</h2>
                    <p className="text-slate-500 font-medium">Apenas administradores podem acessar as configurações globais do sistema.</p>
                </div>
                <button
                    onClick={() => router.push("/")}
                    className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                    Voltar ao Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1 flex items-center gap-3">
                    <ShieldCheck className="h-10 w-10 text-primary" />
                    Configurações Enterprise
                </h1>
                <p className="text-slate-500 font-medium">Gestão avançada, governança e integridade do inventário.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar Interna */}
                <aside className="w-full lg:w-80 space-y-2 shrink-0">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left",
                                    isActive
                                        ? "bg-white border-primary/20 shadow-md shadow-primary/5 ring-1 ring-primary/5"
                                        : "bg-transparent border-transparent text-slate-400 hover:bg-slate-50"
                                )}
                            >
                                <div className={cn(
                                    "p-2.5 rounded-xl transition-colors",
                                    isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-400"
                                )}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-sm font-bold", isActive ? "text-slate-900" : "text-slate-500")}>
                                        {item.name}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 pr-2 truncate">
                                        {item.desc}
                                    </p>
                                </div>
                                {isActive && <ChevronRight className="h-4 w-4 text-primary mt-3 opacity-50" />}
                            </button>
                        )
                    })}
                </aside>

                {/* Área de Conteúdo */}
                <main className="flex-1 w-full bg-white rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[600px] overflow-hidden">
                    <div className="p-8 md:p-12">
                        {activeTab === "geral" && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 mb-2">Preferências Gerais</h2>
                                    <p className="text-slate-400 font-medium">Configure as regras fundamentais de notificação e alertas.</p>
                                </div>

                                <div className="grid gap-6">
                                    <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-white border flex items-center justify-center text-primary shadow-sm">
                                                <Bell className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">Alertas de Garantia</p>
                                                <p className="text-xs text-slate-400 font-medium">Avisar antes do vencimento do hardware.</p>
                                            </div>
                                        </div>
                                        <select
                                            value={garantiaAlertaDias}
                                            onChange={(e) => updateConfig('alerta_garantia_dias', e.target.value)}
                                            className="bg-white border-slate-200 rounded-xl h-10 px-3 text-sm font-bold text-slate-600 focus:ring-primary"
                                        >
                                            <option value="30">30 dias antes</option>
                                            <option value="60">60 dias antes</option>
                                            <option value="90">90 dias antes</option>
                                        </select>
                                    </div>

                                    <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-white border flex items-center justify-center text-primary shadow-sm">
                                                <AlertTriangle className="h-6 w-6 text-orange-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">Limite de Intervenções</p>
                                                <p className="text-xs text-slate-400 font-medium">Sugerir substituição após X manutenções.</p>
                                            </div>
                                        </div>
                                        <select
                                            value={thresholdSubstituicao}
                                            onChange={(e) => updateConfig('threshold_substituicao', e.target.value)}
                                            className="bg-white border-slate-200 rounded-xl h-10 px-3 text-sm font-bold text-slate-600 focus:ring-primary"
                                        >
                                            <option value="3">3 Manutenções</option>
                                            <option value="5">5 Manutenções</option>
                                            <option value="7">7 Manutenções</option>
                                            <option value="10">10 Manutenções</option>
                                        </select>
                                    </div>

                                    <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-white border flex items-center justify-center text-primary shadow-sm">
                                                <ShieldCheck className="h-6 w-6 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">Garantia Padrão</p>
                                                <p className="text-xs text-slate-400 font-medium">Tempo de garantia base para novos itens.</p>
                                            </div>
                                        </div>
                                        <select
                                            value={garantiaPadraoMeses}
                                            onChange={(e) => updateConfig('garantia_padrao_meses', e.target.value)}
                                            className="bg-white border-slate-200 rounded-xl h-10 px-3 text-sm font-bold text-slate-600 focus:ring-primary"
                                        >
                                            <option value="12">12 Meses (1 Ano)</option>
                                            <option value="24">24 Meses (2 Anos)</option>
                                            <option value="36">36 Meses (3 Anos)</option>
                                        </select>
                                    </div>


                                    <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-white border flex items-center justify-center text-primary shadow-sm">
                                                <LayoutGrid className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">Campos Obrigatórios</p>
                                                <p className="text-xs text-slate-400 font-medium">Serial e Tipo são padrões do sistema.</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-primary bg-primary/5 px-4 py-2 rounded-full uppercase tracking-widest">Ativo</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "usuarios" && (
                            <UserPermissions />
                        )}

                        {activeTab === "empresa" && (
                            <CompanyData />
                        )}

                        {activeTab === "setores" && (
                            <SectorManagement />
                        )}

                        {activeTab === "api" && (
                            <ApiIntegration />
                        )}

                        {activeTab === "categorias" && (
                            <AssetCustomization />
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
