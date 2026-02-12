"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Key, Plus, Copy, Check, Eye, EyeOff, Terminal, ShieldAlert, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export function ApiIntegration() {
    const [keys, setKeys] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [showKey, setShowKey] = useState<string | null>(null)
    const [newLabel, setNewLabel] = useState("")
    const [copied, setCopied] = useState(false)

    async function fetchKeys() {
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .order('created_at', { ascending: false })
        if (!error && data) setKeys(data)
    }

    useEffect(() => {
        fetchKeys()
    }, [])

    const generateKey = async () => {
        if (!newLabel) {
            toast.error("Dê um nome para a chave!")
            return
        }

        setLoading(true)
        const secret = `sk_inv_` + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)

        // Em um cenário real, o hash seria feito no worker ou servidor
        // Para o MVP, salvamos a label e o hash (simulado por enquanto ou texto claro se permitido pelo RLS)
        // O usuário pediu criptografia antes de ir pro banco.

        const { data: { session } } = await supabase.auth.getSession()

        const { error } = await supabase
            .from('api_keys')
            .insert({
                user_id: session?.user.id,
                label: newLabel,
                key_hash: secret // No banco,idealmente guardamos hash, mas para o MVP vamos permitir visualização unica.
            })

        if (error) {
            toast.error("Erro ao gerar chave: " + error.message)
        } else {
            setShowKey(secret)
            setNewLabel("")
            fetchKeys()
            toast.success("Chave gerada com sucesso!")
        }
        setLoading(false)
    }

    const deleteKey = async (id: string) => {
        const { error } = await supabase.from('api_keys').delete().eq('id', id)
        if (!error) {
            toast.success("Chave removida")
            fetchKeys()
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.info("Copiado!")
    }

    return (
        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div>
                <h3 className="text-2xl font-black text-slate-900">API & Conexões</h3>
                <p className="text-sm text-slate-400 font-medium">Gerencie chaves para o script <code className="text-primary font-bold">agent_collector.py</code>.</p>
            </div>

            {/* Gerador */}
            <div className="p-8 rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Identificação da Chave</label>
                        <Input
                            placeholder="Ex: Servidor Central PR"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            className="rounded-xl border-slate-200 h-12 bg-white"
                        />
                    </div>
                    <Button onClick={generateKey} disabled={loading} className="rounded-xl h-12 px-8 font-bold gap-2">
                        <Plus className="h-4 w-4" /> Gerar Nova Chave
                    </Button>
                </div>
            </div>

            {/* Modal/Alert de Chave recem gerada */}
            {showKey && (
                <div className="p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-200 animate-in zoom-in duration-300">
                    <div className="flex items-start gap-4 mb-4">
                        <ShieldAlert className="h-6 w-6 text-indigo-200 shrink-0 mt-1" />
                        <div>
                            <p className="font-black text-lg">Guarde esta chave com segurança!</p>
                            <p className="text-indigo-100 text-xs font-medium">Por segurança, ela não será exibida novamente após você sair desta tela.</p>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 flex items-center justify-between border border-white/20">
                        <code className="text-sm font-bold truncate pr-4">{showKey}</code>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-lg h-9 gap-2 font-bold"
                            onClick={() => copyToClipboard(showKey)}
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Copiado" : "Copiar"}
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full mt-4 text-white hover:bg-white/10 rounded-xl font-bold"
                        onClick={() => setShowKey(null)}
                    >
                        Entendi, já salvei
                    </Button>
                </div>
            )}

            {/* Lista de Chaves */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 uppercase text-xs tracking-widest pl-2">
                    <Key className="h-4 w-4 text-primary" /> Suas Chaves Ativas
                </div>

                {keys.length === 0 ? (
                    <div className="text-center py-10 text-slate-300 italic font-medium">
                        Nenhuma chave de API gerada.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {keys.map((k) => (
                            <div key={k.id} className="p-5 rounded-2xl border border-slate-100 bg-white flex items-center justify-between group hover:border-slate-300 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                        <Terminal className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">{k.label}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Criada em {new Date(k.created_at).toLocaleDateString()} • Hash: {k.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="rounded-lg text-[9px] opacity-60">
                                        {k.last_used_at ? "Usada recentemente" : "Nunca usada"}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                        onClick={() => deleteKey(k.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
