"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { Upload, FileUp, Download, X, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function BulkImportModal() {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [importing, setImporting] = useState(false)
    const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null)

    const downloadTemplate = () => {
        const csv = "nome,tipo,serial,status,colaborador,setor,patrimonio\nPC-TI-001,Computador,SN123456,Disponível,João Silva,TI,PAT001\nMON-RH-001,Monitor,SN789012,Em uso,Maria Santos,RH,PAT002"
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'modelo_importacao_ativos.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const parseCSV = (text: string): Record<string, string>[] => {
        const lines = text.trim().split('\n')
        if (lines.length < 2) return []

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        const rows: Record<string, string>[] = []

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            // Handle quoted fields (fields that may contain commas)
            const values: string[] = []
            let current = ''
            let inQuotes = false

            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim())
                    current = ''
                } else {
                    current += char
                }
            }
            values.push(current.trim())

            const row: Record<string, string> = {}
            headers.forEach((header, idx) => {
                row[header] = values[idx] || ''
            })
            rows.push(row)
        }

        return rows
    }

    const handleImport = async () => {
        if (!file) return
        setImporting(true)
        setResults(null)

        try {
            const text = await file.text()
            const rows = parseCSV(text)

            if (rows.length === 0) {
                toast.error("Arquivo vazio ou formato inválido")
                setImporting(false)
                return
            }

            const { data: { user } } = await supabase.auth.getUser()
            let success = 0
            const errors: string[] = []

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]

                // Validate required fields
                if (!row.nome || !row.tipo || !row.serial) {
                    errors.push(`Linha ${i + 2}: campos obrigatórios faltando (nome, tipo, serial)`)
                    continue
                }

                const { error } = await supabase.from('ativos').insert({
                    nome: row.nome,
                    tipo: row.tipo,
                    serial: row.serial,
                    status: row.status || 'Disponível',
                    colaborador: row.colaborador || null,
                    setor: row.setor || null,
                    patrimonio: row.patrimonio || null,
                })

                if (error) {
                    errors.push(`Linha ${i + 2}: ${error.message}`)
                } else {
                    success++

                    // Log movement for each imported asset
                    const { data: assetData } = await supabase.from('ativos').select('id').eq('serial', row.serial).single()
                    if (assetData) {
                        await supabase.from('movimentacoes').insert({
                            ativo_id: assetData.id,
                            usuario_id: user?.id,
                            acao: 'Criação',
                            observacao: `Importado via CSV: "${row.nome}"`,
                        })
                    }
                }
            }

            setResults({ success, errors })

            if (success > 0) {
                toast.success(`${success} ativo(s) importado(s) com sucesso!`)
            }
            if (errors.length > 0) {
                toast.warning(`${errors.length} erro(s) na importação`)
            }
        } catch (error: unknown) {
            let msg = "Erro desconhecido"
            if (error instanceof Error) msg = error.message
            else if (typeof error === 'object' && error !== null && 'message' in error) msg = String((error as { message: unknown }).message)
            else if (typeof error === 'string') msg = error

            logger.error("Erro na importação:", msg)
            toast.error(`Erro ao processar arquivo: ${msg}`)
        } finally {
            setImporting(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setFile(null)
        setResults(null)
    }

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="flex items-center gap-2 h-11 px-6 rounded-xl font-bold text-sm border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"
            >
                <FileUp className="h-4 w-4" />
                Importar CSV
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                    {/* Header Padronizado */}
                    <DialogHeader className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                                <FileUp className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-text-primary dark:text-white">
                                    Importação em Lote
                                </DialogTitle>
                                <DialogDescription className="text-sm text-text-secondary dark:text-slate-400 font-medium">
                                    Importe ativos em massa via arquivo CSV.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar bg-white dark:bg-zinc-900">
                        {/* Download Template Padronizado */}
                        <div
                            onClick={downloadTemplate}
                            className="group w-full flex items-center gap-5 p-5 bg-neutral-app dark:bg-white/5 rounded-2xl border border-transparent hover:border-primary-600/30 cursor-pointer transition-all active:scale-[0.99]"
                        >
                            <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-100 dark:border-white/5 flex items-center justify-center text-primary-600 dark:text-primary-400 shadow-sm group-hover:shadow-md transition-all">
                                <Download className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tight">Baixar Modelo CSV</p>
                                <p className="text-xs text-text-secondary dark:text-slate-400 font-medium">Use este modelo para estruturar seus dados.</p>
                            </div>
                        </div>

                        {/* File Upload Padronizado */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Arquivo CSV</Label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        setFile(e.target.files?.[0] || null)
                                        setResults(null)
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={cn(
                                    "flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-3xl transition-all",
                                    file
                                        ? "border-primary-600/50 bg-primary-50/30 dark:bg-primary-900/5"
                                        : "border-slate-200 dark:border-white/10 bg-neutral-app dark:bg-white/2 hover:border-primary-600/30"
                                )}>
                                    <div className={cn(
                                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all",
                                        file ? "bg-primary-600 text-white" : "bg-white dark:bg-zinc-800 text-text-muted"
                                    )}>
                                        <Upload className="h-7 w-7" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-text-primary dark:text-white">
                                            {file ? file.name : "Arraste ou selecione"}
                                        </p>
                                        <p className="text-xs text-text-muted mt-1">Apenas arquivos .csv são suportados</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Results Padronizados */}
                        {results && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {results.success > 0 && (
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-sm font-black text-emerald-700 dark:text-emerald-400 shadow-sm">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        {results.success} ativo(s) importado(s) com sucesso.
                                    </div>
                                )}
                                {results.errors.length > 0 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-500/20">
                                        <div className="flex items-center gap-3 text-sm font-black text-red-700 dark:text-red-400 mb-3">
                                            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            {results.errors.length} erro(s) encontrados
                                        </div>
                                        <div className="max-h-32 overflow-y-auto space-y-1.5 px-1 custom-scrollbar">
                                            {results.errors.map((err, i) => (
                                                <p key={i} className="text-[11px] text-red-500 dark:text-red-400 flex items-start gap-2 font-medium">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1 flex-shrink-0" />
                                                    {err}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Padronizado */}
                    <DialogFooter className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center justify-end gap-3 flex-shrink-0">
                        <Button
                            variant="ghost"
                            onClick={handleClose}
                            className="px-6 py-2.5 text-sm font-black text-text-muted hover:text-text-primary transition-all"
                        >
                            Fechar
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={!file || importing}
                            className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-black hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            {importing ? "Importando..." : "Iniciar Importação"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
