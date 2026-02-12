"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Shield, Eye, Settings2, History, AlertCircle, Edit2, Mail } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EditUserModal } from "@/components/edit-user-modal"

export function UserPermissions() {
    const [users, setUsers] = useState<any[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState<any | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    async function fetchData() {
        setLoading(true)
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name')

        const { data: logs, error: lError } = await supabase
            .from('audit_logs')
            .select(`
                *,
                usuario:profiles (full_name)
            `)
            .order('created_at', { ascending: false })
            .limit(10)

        if (!pError && profiles) setUsers(profiles)
        if (!lError && logs) setAuditLogs(logs)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleRoleChange = async (userId: string, newRole: string) => {
        const { data: { session } } = await supabase.auth.getSession()

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)

        if (error) {
            toast.error("Erro ao alterar permissão: " + error.message)
        } else {
            // Registrar auditoria
            if (session) {
                await supabase.from('audit_logs').insert({
                    user_id: session.user.id,
                    action: 'ALTERAR_ROLE',
                    target_id: userId,
                    new_value: { role: newRole }
                })
            }
            toast.success("Permissão atualizada com sucesso!")
            fetchData()
        }
    }

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Admin': return <Shield className="h-4 w-4 text-rose-500" />
            case 'Técnico': return <Settings2 className="h-4 w-4 text-indigo-500" />
            default: return <Eye className="h-4 w-4 text-slate-400" />
        }
    }

    return (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
            {/* Gestão de Papéis */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900">Usuários e Acessos</h3>
                        <p className="text-sm text-slate-400 font-medium">Controle quem pode administrar o inventário.</p>
                    </div>
                </div>

                <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 border-none">
                                <TableHead className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Nome</TableHead>
                                <TableHead className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Nível de Acesso</TableHead>
                                <TableHead className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-10 animate-pulse">Carregando...</TableCell></TableRow>
                            ) : (
                                users.map((u) => (
                                    <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                        <TableCell className="px-8 py-5">
                                            <button
                                                onClick={() => { setSelectedUser(u); setIsEditOpen(true); }}
                                                className="group flex flex-col items-start gap-1 hover:text-primary transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-primary">
                                                    {u.full_name || 'Usuário Sem Nome'}
                                                    <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {u.email}
                                                </div>
                                            </button>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(u.role)}
                                                <Badge variant="outline" className="border-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                                                    {u.role || 'Visualizador'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8 py-5 text-right flex items-center justify-end gap-3">
                                            <Select
                                                defaultValue={u.role || 'Visualizador'}
                                                onValueChange={(val) => handleRoleChange(u.id, val)}
                                            >
                                                <SelectTrigger className="w-32 rounded-xl border-slate-200 font-bold text-xs h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                    <SelectItem value="Técnico">Técnico</SelectItem>
                                                    <SelectItem value="Visualizador">Visualizador</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl hover:bg-slate-100"
                                                onClick={() => { setSelectedUser(u); setIsEditOpen(true); }}
                                            >
                                                <Edit2 className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <EditUserModal
                user={selectedUser}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={fetchData}
            />

            {/* Auditoria Advanced */}
            <div className="pt-8 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-6 text-slate-900 font-black text-xl">
                    <History className="h-6 w-6 text-primary" />
                    Logs de Auditoria do Sistema
                </div>

                <div className="space-y-3">
                    {auditLogs.length === 0 ? (
                        <div className="p-10 text-center border-2 border-dashed rounded-[2rem] text-slate-300 italic font-medium">
                            Nenhuma ação administrativa registrada ainda.
                        </div>
                    ) : (
                        auditLogs.map((log) => (
                            <div key={log.id} className="group p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-md transition-all duration-300">
                                <div className="h-10 w-10 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                                    <AlertCircle className="h-5 w-5 text-indigo-500 opacity-40" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-700">
                                        {log.usuario?.full_name || 'Sistema'} realizou a ação <span className="text-primary font-black px-1">{log.action}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                                        {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.created_at))}
                                    </p>
                                </div>
                                <div className="hidden md:block">
                                    <Badge variant="outline" className="text-[9px] font-bold opacity-60">ID: {log.target_id?.slice(0, 8)}...</Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
