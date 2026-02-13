"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Ativo } from "@/types"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Monitor, Cpu, Laptop, Smartphone, Search, Loader2, User, ChevronRight, FileText, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { generateResponsibilityTerm } from "@/lib/pdf-utils"
import { useUser } from "@/contexts/user-context"
import { toast } from "sonner"
import { Profile } from "@/types"

interface CollaboratorAssetsModalProps {
    collaborator: Profile | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CollaboratorAssetsModal({ collaborator, open, onOpenChange }: CollaboratorAssetsModalProps) {
    const [assets, setAssets] = useState<Ativo[]>([])
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const { profile: currentUser } = useUser()

    useEffect(() => {
        async function fetchAssets() {
            if (!collaborator?.id) return
            setLoading(true)

            const filters = [`dono_id.eq.${collaborator.id}`]
            if (collaborator.full_name) {
                filters.push(`colaborador.eq.${collaborator.full_name}`)
            }
            if (collaborator.email) {
                filters.push(`colaborador.eq.${collaborator.email}`)
            }

            const { data, error } = await supabase
                .from('ativos')
                .select('*')
                .or(filters.join(','))
                .neq('status', 'Baixado')
                .order('nome')

            if (!error && data) {
                setAssets(data as Ativo[])
            }
            setLoading(false)
        }

        if (open && collaborator?.id) fetchAssets()
    }, [open, collaborator])

    const handleGenerateTerm = async () => {
        if (!collaborator || assets.length === 0) return
        setGenerating(true)
        try {
            const { data: company, error } = await supabase
                .from('empresa')
                .select('*')
                .single()

            if (error) throw error

            await generateResponsibilityTerm(
                collaborator,
                assets,
                company,
                currentUser?.full_name || 'Sistema'
            )
            toast.success("Termo de responsabilidade gerado com sucesso!")
        } catch (error: any) {
            console.error("Erro ao gerar termo:", error)
            toast.error("Erro ao gerar termo: " + (error.message || "Tente novamente"))
        } finally {
            setGenerating(false)
        }
    }

    const getIcon = (tipo: string) => {
        const t = tipo?.toLowerCase()
        if (t?.includes('notebook')) return <Laptop className="h-4 w-4" />
        if (t?.includes('monitor')) return <Monitor className="h-4 w-4" />
        if (t?.includes('desktop') || t?.includes('computador')) return <Cpu className="h-4 w-4" />
        if (t?.includes('celular') || t?.includes('smartphone')) return <Smartphone className="h-4 w-4" />
        return <Package className="h-4 w-4" />
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Em uso': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
            case 'Manutenção': return 'bg-amber-50 text-amber-700 border-amber-100'
            case 'Disponível': return 'bg-blue-50 text-blue-700 border-blue-100'
            default: return 'bg-slate-50 text-slate-700 border-slate-100'
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="flex flex-col max-h-[80vh]">
                    <DialogHeader className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                    <Package className="h-6 w-6 text-primary" />
                                    Equipamentos em Posse
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium">
                                    Ativos atualmente sob responsabilidade de: <span className="text-primary font-bold">{collaborator?.full_name || collaborator?.email || 'Colaborador'}</span>
                                </DialogDescription>
                            </div>
                            {assets.length > 0 && (
                                <Button
                                    onClick={handleGenerateTerm}
                                    disabled={generating}
                                    variant="outline"
                                    className="rounded-2xl h-11 px-5 border-slate-200 hover:bg-white hover:border-primary hover:text-primary font-bold gap-2 shadow-sm transition-all"
                                >
                                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                    Emitir Termo
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultando Inventário...</p>
                            </div>
                        ) : assets.length === 0 ? (
                            <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                <Search className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold text-sm">Nenhum ativo vinculado a este perfil.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assets.map((asset) => (
                                    <div key={asset.id} className="group flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            {getIcon(asset.tipo)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h4 className="font-bold text-slate-900 text-sm truncate pr-2">{asset.nome}</h4>
                                                <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-tighter px-2 h-5 rounded-full", getStatusColor(asset.status))}>
                                                    {asset.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tight">{asset.serial}</span>
                                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.tipo}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Info className="h-3 w-3" />
                            Rastreabilidade Total Fase-3
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function Info({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
    )
}
