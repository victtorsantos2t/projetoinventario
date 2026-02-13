"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Search, Package, Users, AppWindow, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [results, setResults] = React.useState<{
        assets: any[]
        users: any[]
        softwares: any[]
    }>({ assets: [], users: [], softwares: [] })

    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        if (!search || search.length < 2) {
            setResults({ assets: [], users: [], softwares: [] })
            return
        }

        const timer = setTimeout(async () => {
            const [{ data: assets }, { data: users }, { data: softwares }] = await Promise.all([
                supabase.from('ativos').select('id, nome, patrimonio').or(`nome.ilike.%${search}%,patrimonio.ilike.%${search}%`).limit(5),
                supabase.from('profiles').select('id, full_name, email').ilike('full_name', `%${search}%`).limit(5),
                supabase.from('softwares').select('id, nome').ilike('nome', `%${search}%`).limit(5)
            ])

            setResults({
                assets: assets || [],
                users: users || [],
                softwares: softwares || []
            })
        }, 300)

        return () => clearTimeout(timer)
    }, [search])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md animate-in fade-in duration-300 flex items-center justify-center p-4">
            <Command
                className="w-full max-w-xl bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
                onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false)
                }}
            >
                <div className="flex items-center border-b border-slate-100 dark:border-white/5 px-4 h-14">
                    <Search className="h-5 w-5 text-slate-400 mr-3" />
                    <Command.Input
                        value={search}
                        onValueChange={setSearch}
                        placeholder="O que você está procurando?"
                        className="flex-1 bg-transparent border-0 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-sm"
                    />
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100 sm:flex">
                        ESC
                    </kbd>
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-smooth">
                    <Command.Empty className="py-6 text-center text-sm text-slate-500">
                        Nenhum resultado encontrado para "{search}"
                    </Command.Empty>

                    {results.assets.length > 0 && (
                        <Command.Group heading="Ativos" className="px-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {results.assets.map((asset) => (
                                <Item
                                    key={asset.id}
                                    icon={Package}
                                    label={asset.nome}
                                    subLabel={asset.patrimonio}
                                    onClick={() => runCommand(() => router.push(`/inventory?id=${asset.id}`))}
                                />
                            ))}
                        </Command.Group>
                    )}

                    {results.users.length > 0 && (
                        <Command.Group heading="Colaboradores" className="px-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {results.users.map((user) => (
                                <Item
                                    key={user.id}
                                    icon={Users}
                                    label={user.full_name}
                                    subLabel={user.email}
                                    onClick={() => runCommand(() => router.push(`/users?id=${user.id}`))}
                                />
                            ))}
                        </Command.Group>
                    )}

                    {results.softwares.length > 0 && (
                        <Command.Group heading="Softwares" className="px-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {results.softwares.map((sw) => (
                                <Item
                                    key={sw.id}
                                    icon={AppWindow}
                                    label={sw.nome}
                                    onClick={() => runCommand(() => router.push(`/softwares?id=${sw.id}`))}
                                />
                            ))}
                        </Command.Group>
                    )}

                    <Command.Group heading="Ações Rápidas" className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Item
                            icon={Package}
                            label="Novo Ativo"
                            onClick={() => runCommand(() => router.push('/inventory'))}
                        />
                        <Item
                            icon={ShieldCheck}
                            label="Nova Auditoria"
                            onClick={() => runCommand(() => router.push('/audit'))}
                        />
                    </Command.Group>
                </Command.List>
            </Command>
        </div>
    )
}

function Item({ icon: Icon, label, subLabel, onClick }: any) {
    return (
        <Command.Item
            onSelect={onClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 aria-selected:bg-slate-50 dark:aria-selected:bg-white/5 transition-colors group"
        >
            <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">{label}</span>
                {subLabel && <span className="text-[10px] text-slate-400 font-medium">{subLabel}</span>}
            </div>
        </Command.Item>
    )
}
