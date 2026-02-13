"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { QRCodeCanvas } from "qrcode.react"
import { Loader2, Printer, Settings } from "lucide-react"

// Tamanhos de etiqueta compatíveis com Zebra ZD220/ZD230
const LABEL_SIZES = {
    "50x25": { name: "50 × 25 mm", width: "50mm", height: "25mm", qrSize: 70, previewW: 283, previewH: 142 },
    "50x30": { name: "50 × 30 mm", width: "50mm", height: "30mm", qrSize: 80, previewW: 283, previewH: 170 },
    "60x40": { name: "60 × 40 mm", width: "60mm", height: "40mm", qrSize: 100, previewW: 340, previewH: 227 },
    "100x50": { name: "100 × 50 mm", width: "100mm", height: "50mm", qrSize: 130, previewW: 567, previewH: 283 },
} as const

type LabelSize = keyof typeof LABEL_SIZES

export default function PrintLabelPage() {
    const { id } = useParams()
    const [ativo, setAtivo] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [labelSize, setLabelSize] = useState<LabelSize>("50x30")
    const [autoPrinted, setAutoPrinted] = useState(false)

    const config = LABEL_SIZES[labelSize]

    useEffect(() => {
        const fetchAtivo = async () => {
            if (!id) return
            const { data } = await supabase
                .from('ativos')
                .select('nome, patrimonio, serial, id, tipo')
                .eq('id', id)
                .single()

            setAtivo(data)
            setLoading(false)
        }
        fetchAtivo()
    }, [id])

    const handlePrint = () => {
        window.print()
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-black" /></div>
    if (!ativo) return <div className="flex h-screen items-center justify-center text-gray-500">Ativo não encontrado</div>

    const qrValue = `${window.location.origin}/p/${ativo.id}`
    const isCompact = labelSize === "50x25"

    return (
        <div className="flex flex-col bg-gray-100 min-h-screen items-center justify-center p-4 m-0 print:bg-white print:p-0 print:m-0">

            {/* ========== PAINEL DE CONFIGURAÇÃO (só na tela) ========== */}
            <div className="print:hidden mb-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 w-full max-w-md">
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <h2 className="font-bold text-gray-800">Configuração da Etiqueta</h2>
                </div>

                <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        Impressora
                    </label>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-200">
                        Zebra ZD220 / ZD230 — 203 DPI
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        Tamanho da Etiqueta
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(LABEL_SIZES) as LabelSize[]).map((key) => (
                            <button
                                key={key}
                                onClick={() => setLabelSize(key)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${labelSize === key
                                        ? "border-black bg-black text-white"
                                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                                    }`}
                            >
                                {LABEL_SIZES[key].name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <span className="font-bold">💡 Dica:</span>
                    <span>Na Zebra, configure o driver para &quot;Direct Thermal&quot; e desative margens no diálogo de impressão.</span>
                </div>
            </div>

            {/* ========== PREVIEW DA ETIQUETA (tela) / CONTEÚDO IMPRESSO ========== */}
            <div className="print:hidden mb-2">
                <p className="text-xs text-gray-400 text-center uppercase tracking-wider">Preview ({config.name})</p>
            </div>

            <div
                id="label-content"
                className="bg-white border-2 border-dashed border-gray-300 print:border-none flex items-center overflow-hidden"
                style={{
                    width: `${config.previewW}px`,
                    height: `${config.previewH}px`,
                    padding: isCompact ? "4px 6px" : "6px 8px",
                }}
            >
                {/* QR Code */}
                <div className="shrink-0 flex items-center justify-center" style={{ marginRight: isCompact ? "6px" : "8px" }}>
                    <QRCodeCanvas
                        value={qrValue}
                        size={config.qrSize}
                        level="M"
                        marginSize={0}
                    />
                </div>

                {/* Dados do Ativo */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                    <p className={`font-bold uppercase truncate text-black ${isCompact ? "text-[7px]" : "text-[9px]"}`}>
                        {ativo.tipo}
                    </p>
                    <p className={`font-black truncate leading-tight text-black ${isCompact ? "text-[10px] mb-0" : "text-xs mb-0.5"}`}>
                        {ativo.nome}
                    </p>

                    <div className="border-t border-black/40 my-0.5 w-full" />

                    <p className={`font-bold uppercase text-black ${isCompact ? "text-[6px]" : "text-[7px]"}`}>Patrimônio</p>
                    <p className={`font-black leading-none text-black ${isCompact ? "text-sm" : "text-base"}`}>
                        {ativo.patrimonio || "S/P"}
                    </p>

                    {!isCompact && (
                        <>
                            <p className="text-[7px] font-bold uppercase text-black mt-0.5">Serial</p>
                            <p className="text-[10px] font-mono text-black truncate">{ativo.serial || "—"}</p>
                        </>
                    )}
                </div>
            </div>

            {/* ========== BOTÕES DE AÇÃO (só na tela) ========== */}
            <div className="print:hidden mt-6 flex flex-col items-center gap-3">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                    <Printer className="h-5 w-5" /> Imprimir Etiqueta
                </button>
                <p className="text-xs text-gray-400">
                    Certifique-se de que a impressora Zebra está selecionada no diálogo.
                </p>
            </div>

            {/* ========== CSS DE IMPRESSÃO PARA ZEBRA ========== */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: ${config.width} ${config.height};
                        margin: 0 !important;
                    }

                    html, body {
                        width: ${config.width} !important;
                        height: ${config.height} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Esconde tudo exceto a etiqueta */
                    body > * {
                        display: none !important;
                    }

                    #label-content {
                        display: flex !important;
                        width: 100% !important;
                        height: 100% !important;
                        border: none !important;
                        border-radius: 0 !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        padding: 1mm 2mm !important;
                        box-sizing: border-box !important;
                    }

                    /* Garante legibilidade em térmica */
                    * {
                        color: #000 !important;
                        -webkit-font-smoothing: none !important;
                    }
                }
            `}</style>
        </div>
    )
}
