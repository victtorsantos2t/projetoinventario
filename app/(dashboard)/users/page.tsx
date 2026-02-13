"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { AddUserModal } from "@/components/add-user-modal"
import { EditUserModal } from "@/components/edit-user-modal"
import { UsersToolbar } from "@/components/users-toolbar"
import { UsersTable } from "@/components/users-table"
import { Profile, Setor } from "@/types"
import { CollaboratorAssetsModal } from "@/components/collaborator-assets-modal"
import { Shield, User as UserIcon, Settings2, Edit2, LayoutGrid, List, Mail, ShieldCheck, UserMinus, UserCheck, Trash2, AlertTriangle, Building2, Eye, Package, Search } from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function UsersPage() {
    const [users, setUsers] = useState<Profile[]>([])
    const [setores, setSetores] = useState<Setor[]>([])
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [loadingUsers, setLoadingUsers] = useState(true)
    const { isAdmin, isTecnico, loading: loadingRole } = useUserRole()

    // Filter States
    const [searchTerm, setSearchTerm] = useState("")
    const [sectorFilter, setSectorFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Selection for actions
    const [userToToggle, setUserToToggle] = useState<Profile | null>(null)
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null)

    // Assets Modal State
    const [assetsModalOpen, setAssetsModalOpen] = useState(false)
    const [selectedCollaborator, setSelectedCollaborator] = useState<Profile | null>(null)

    async function fetchData() {
        setLoadingUsers(true)

        // Fetch users, sectors and assets for counting
        const [usersRes, sectorsRes, assetsRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true }),
            supabase.from('setores').select('*').order('nome'),
            supabase
                .from('ativos')
                .select('id, dono_id, colaborador, status')
                .neq('status', 'Baixado')
        ])

        if (usersRes.data && assetsRes.data) {
            const assets = assetsRes.data as any[]
            const usersWithCount = (usersRes.data as Profile[]).map(u => {
                // Robust count: check by ID or by Name (fallback for disconnected data)
                const count = assets.filter(a =>
                    a.dono_id === u.id ||
                    (a.colaborador && u.full_name && a.colaborador.trim().toLowerCase() === u.full_name.trim().toLowerCase()) ||
                    (a.colaborador && u.email && a.colaborador.trim().toLowerCase() === u.email.trim().toLowerCase())
                ).length

                return {
                    ...u,
                    ativos_count: count
                }
            })
            setUsers(usersWithCount)
        }
        if (sectorsRes.data) setSetores(sectorsRes.data as Setor[])
        setLoadingUsers(false)
    }

    useEffect(() => {
        if (!isTecnico && !loadingRole) return
        fetchData()

        const channel = supabase.channel('realtime_users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isAdmin, loadingRole])

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false)

            const matchesSector = sectorFilter === 'all' || user.setor_id === sectorFilter
            const matchesStatus = statusFilter === 'all' || (user.status || 'Ativo') === statusFilter

            return matchesSearch && matchesSector && matchesStatus
        })
    }, [users, searchTerm, sectorFilter, statusFilter])

    const handleToggleStatus = async () => {
        if (!userToToggle) return
        const newStatus = userToToggle.status === 'Inativo' ? 'Ativo' : 'Inativo'

        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', userToToggle.id)

        if (!error) {
            toast.success(`Colaborador ${newStatus === 'Ativo' ? 'ativado' : 'inativado'} com sucesso!`)
            fetchData()
        } else {
            toast.error("Erro ao alterar status: " + error.message)
        }
        setUserToToggle(null)
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return

        // Verificar se tem ativos vinculados primeiro? 
        // No momento a tabela ativos.colaborador é nome (string), o que é ruim.
        // Mas vamos proceder com o delete conforme solicitado.

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userToDelete.id)

        if (!error) {
            toast.success("Colaborador removido com sucesso!")
            fetchData()
        } else {
            toast.error("Erro ao remover: " + error.message)
        }
        setUserToDelete(null)
    }

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Admin': return <Shield className="h-4 w-4 text-rose-500" />
            case 'Técnico': return <Settings2 className="h-4 w-4 text-indigo-500" />
            default: return <Eye className="h-4 w-4 text-slate-400" />
        }
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Admin': return "bg-rose-50 text-rose-600 border-rose-100"
            case 'Técnico': return "bg-indigo-50 text-indigo-600 border-indigo-100"
            default: return "bg-slate-50 text-slate-400 border-slate-100"
        }
    }

    const getSectorName = (sectorId: string | null) => {
        if (!sectorId) return "Sem setor"
        const sector = setores.find(s => s.id === sectorId)
        return sector ? sector.nome : "Sem setor"
    }

    if (!loadingRole && !isTecnico) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                <Shield className="h-16 w-16 text-rose-500 mb-4 opacity-20" />
                <h2 className="text-2xl font-black text-slate-900">Acesso Restrito</h2>
                <p className="text-slate-500 font-medium">Apenas administradores podem gerenciar colaboradores.</p>
            </div>
        )
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1">Colaboradores</h1>
                    <p className="text-slate-500 font-medium">Gestão centralizada de equipamentos por pessoa e acessos.</p>
                </div>
                {isAdmin && <AddUserModal onSuccess={fetchData} />}
            </div>

            {/* Toolbar */}
            <UsersToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sectorFilter={sectorFilter}
                onSectorFilterChange={setSectorFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalUsers={filteredUsers.length}
            />

            {/* Content */}
            {loadingUsers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-64 rounded-[2rem] bg-white border border-slate-100 shadow-sm animate-pulse" />
                    ))}
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <UserIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-lg">Nenhum colaborador encontrado com os filtros aplicados.</p>
                    <Button variant="ghost" className="mt-2 text-primary font-bold" onClick={() => {
                        setSearchTerm("")
                        setSectorFilter("all")
                        setStatusFilter("all")
                    }}>
                        Limpar todos os filtros
                    </Button>
                </div>
            ) : viewMode === 'list' ? (
                <UsersTable
                    users={filteredUsers}
                    setores={setores}
                    isAdmin={isAdmin}
                    onEdit={(u) => { setSelectedUser(u); setIsEditOpen(true); }}
                    onDelete={setUserToDelete}
                    onToggleStatus={setUserToToggle}
                    onViewAssets={(u) => {
                        setSelectedCollaborator(u)
                        setAssetsModalOpen(true)
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className={`group bg-white rounded-[2.5rem] p-6 border shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden ${user.status === 'Inativo' ? 'border-slate-100 grayscale-[0.8] opacity-80' : 'border-slate-100'
                            }`}>
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    {getRoleIcon(user.role)}
                                    <Badge variant="outline" className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter rounded-full border ${getRoleColor(user.role)}`}>
                                        {user.role || 'Visualizador'}
                                    </Badge>
                                </div>

                                {isAdmin && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary"
                                            onClick={() => { setSelectedUser(user); setIsEditOpen(true); }}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500"
                                            onClick={() => setUserToDelete(user)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <Avatar className="h-14 w-14 rounded-2xl shadow-inner border-2 border-slate-50">
                                    <AvatarImage src={user.avatar_url || ""} alt={user.full_name || ""} />
                                    <AvatarFallback className="bg-slate-100 text-slate-400 font-bold text-lg">
                                        {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate pr-2 leading-tight" title={user.full_name || 'Sem nome'}>
                                        {user.full_name || 'Sem nome'}
                                    </h3>
                                    <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{user.email}</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                                        <Building2 className="h-3 w-3" />
                                        <span>Setor</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-slate-50 text-slate-600 text-[10px] font-bold py-0.5 rounded-lg border-none shadow-none">
                                        {getSectorName(user.setor_id)}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                                        <Package className="h-3 w-3" />
                                        <span>Equipamentos</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedCollaborator(user)
                                            setAssetsModalOpen(true)
                                        }}
                                        className="hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        <Badge variant="secondary" className={`text-[10px] font-black py-0.5 rounded-lg border-none shadow-none cursor-pointer ${user.ativos_count ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-slate-50 text-slate-400'}`}>
                                            {user.ativos_count || 0} ITENS
                                        </Badge>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                                        <ShieldCheck className={`h-3 w-3 ${user.status === 'Inativo' ? 'text-slate-300' : 'text-emerald-500'}`} />
                                        <span>Status de Acesso</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 mr-1">{user.status || 'Ativo'}</span>
                                        <span className={`h-2 w-2 rounded-full ${user.status === 'Inativo' ? 'bg-slate-300' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                    </div>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg flex gap-1.5 ${user.status === 'Inativo' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'
                                            }`}
                                        onClick={() => setUserToToggle(user)}
                                    >
                                        {user.status === 'Inativo' ? <><UserCheck className="h-3 w-3" /> Reativar</> : <><UserMinus className="h-3 w-3" /> Inativar</>}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <EditUserModal
                user={selectedUser}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={fetchData}
            />

            <CollaboratorAssetsModal
                collaborator={selectedCollaborator}
                open={assetsModalOpen}
                onOpenChange={setAssetsModalOpen}
            />

            {/* Inactivate Confirmation */}
            <AlertDialog open={!!userToToggle} onOpenChange={(open) => !open && setUserToToggle(null)}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                            {userToToggle?.status === 'Inativo' ? <UserCheck className="h-6 w-6 text-emerald-500" /> : <UserMinus className="h-6 w-6 text-amber-500" />}
                            {userToToggle?.status === 'Inativo' ? "Reativar Colaborador?" : "Inativar Colaborador?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium">
                            {userToToggle?.status === 'Inativo' ? (
                                <>Deseja liberar o acesso de <strong>{userToToggle?.full_name}</strong> ao sistema novamente?</>
                            ) : (
                                <>Ao inativar <strong>{userToToggle?.full_name}</strong>, o acesso dele ao sistema será bloqueado, mas os dados históricos serão mantidos.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleToggleStatus}
                            className={`rounded-xl font-bold ${userToToggle?.status === 'Inativo' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-500">
                            <Trash2 className="h-6 w-6" />
                            Excluir Colaborador Permanentemente?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium space-y-3">
                            <p>Esta ação é <strong>irreversível</strong>. Todos os dados do perfil de <strong>{userToDelete?.full_name}</strong> serão apagados do sistema.</p>
                            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex gap-3 items-start">
                                <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-rose-600 font-bold leading-relaxed">
                                    Nota: Se este colaborador possuir ativos vinculados ao seu nome, a exclusão pode gerar inconsistências nos dados. Recomendamos apenas **Inativar** o acesso.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600"
                        >
                            Excluir Agora
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}


