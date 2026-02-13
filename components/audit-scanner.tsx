"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { X, Camera, Zap, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuditScannerProps {
    onResult: (result: string) => void
    onClose: () => void
}

export function AuditScanner({ onResult, onClose }: AuditScannerProps) {
    const [error, setError] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)

    useEffect(() => {
        const startScanner = async () => {
            try {
                const scanner = new Html5Qrcode("reader")
                scannerRef.current = scanner

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        onResult(decodedText)
                        scanner.stop()
                    },
                    (errorMessage) => {
                        // Silenciosamente ignoramos erros de scan comum (quando não há QR na câmera)
                    }
                )
            } catch (err) {
                console.error("Erro ao iniciar câmera:", err)
                setError("Não foi possível acessar a câmera. Verifique as permissões.")
            }
        }

        startScanner()

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => { })
            }
        }
    }, [onResult])

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 bg-opacity-95 backdrop-blur-sm">
            <div className="w-full max-w-sm relative aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden border-2 border-white/20 shadow-2xl">
                <div id="reader" className="w-full h-full" />

                <div className="absolute inset-0 pointer-events-none">
                    {/* Cantos guias */}
                    <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-white/40 rounded-tl-xl" />
                    <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-white/40 rounded-tr-xl" />
                    <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-white/40 rounded-bl-xl" />
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-white/40 rounded-br-xl" />

                    {/* Linha de scan animada */}
                    <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-pulse" />
                </div>

                {error && (
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 p-4 bg-rose-500/90 text-white rounded-2xl text-center text-sm font-bold flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8" />
                        {error}
                        <Button variant="outline" className="mt-2 bg-white text-rose-500 border-0" onClick={onClose}>Fechar</Button>
                    </div>
                )}
            </div>

            <p className="mt-8 text-white/60 text-sm font-bold flex items-center gap-2">
                <Camera className="h-4 w-4" /> Aponte para o QR Code do Patrimônio
            </p>

            <div className="mt-12 flex gap-4">
                <button
                    onClick={onClose}
                    className="h-14 w-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>
        </div>
    )
}
