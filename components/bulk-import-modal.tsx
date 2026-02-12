"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { Upload, FileUp, Download, X, FileText, CheckCircle2, AlertTriangle } from "lucide-react"

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
                            acao: 'CRIAR',
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
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                <FileUp className="h-4 w-4" />
                Importar CSV
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
                        {/* Header */}
                        <div className="px-8 py-5 flex items-center justify-between border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Importação em Lote</h2>
                                <p className="text-sm text-slate-400 font-medium">Importe ativos via arquivo CSV</p>
                            </div>
                            <button onClick={handleClose} className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <X className="h-4 w-4 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Template download */}
                            <button onClick={downloadTemplate} className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors text-left">
                                <div className="h-10 w-10 rounded-xl bg-white border flex items-center justify-center text-primary shadow-sm">
                                    <Download className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Baixar Modelo CSV</p>
                                    <p className="text-xs text-slate-400">Use este modelo para preencher os dados corretamente</p>
                                </div>
                            </button>

                            {/* File upload */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-2 block">Arquivo CSV</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => {
                                            setFile(e.target.files?.[0] || null)
                                            setResults(null)
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary/30 transition-colors">
                                        <Upload className="h-5 w-5 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-500">
                                            {file ? file.name : "Arraste ou selecione o arquivo CSV"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Results */}
                            {results && (
                                <div className="space-y-3">
                                    {results.success > 0 && (
                                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-sm font-bold text-emerald-700">
                                            <CheckCircle2 className="h-4 w-4" />
                                            {results.success} ativo(s) importado(s)
                                        </div>
                                    )}
                                    {results.errors.length > 0 && (
                                        <div className="p-3 bg-red-50 rounded-xl">
                                            <div className="flex items-center gap-2 text-sm font-bold text-red-600 mb-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                {results.errors.length} erro(s)
                                            </div>
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                {results.errors.map((err, i) => (
                                                    <p key={i} className="text-xs text-red-500">{err}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button onClick={handleClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                                Fechar
                            </button>
                            <button onClick={handleImport} disabled={!file || importing} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                                <FileText className="h-4 w-4" />
                                {importing ? "Importando..." : "Importar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
