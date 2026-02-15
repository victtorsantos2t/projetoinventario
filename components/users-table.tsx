"use client"

import { Profile, Setor } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit2, Shield, Settings2, Eye, Trash2, UserMinus, UserCheck, Mail, Building2, Package } from "lucide-react"

interface UsersTableProps {
    users: Profile[]
    setores: Setor[]
    isAdmin: boolean
    onEdit: (user: Profile) => void
    onDelete: (user: Profile) => void
    onToggleStatus: (user: Profile) => void
    onViewAssets: (user: Profile) => void
}

export function UsersTable({ users, setores, isAdmin, onEdit, onDelete, onToggleStatus, onViewAssets }: UsersTableProps) {
    const getSectorName = (sectorId: string | null) => {
        if (!sectorId) return "Sem setor"
        const sector = setores.find(s => s.id === sectorId)
        return sector ? sector.nome : "Sem setor"
    }

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Admin': return <Shield className="h-3.5 w-3.5" />
            case 'Técnico': return <Settings2 className="h-3.5 w-3.5" />
            default: return <Eye className="h-3.5 w-3.5" />
        }
    }

    const getRoleStyles = (role: string) => {
        switch (role) {
            case 'Admin': return "bg-rose-50 text-rose-600 border-rose-100"
            case 'Técnico': return "bg-indigo-50 text-indigo-600 border-indigo-100"
            default: return "bg-slate-50 text-slate-400 border-slate-100"
        }
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nível</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Setor</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Equipamentos</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-11 w-11 rounded-xl shadow-inner border border-white">
                                            <AvatarImage src={user.avatar_url || ""} alt={user.full_name || ""} />
                                            <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">
                                                {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-slate-800 text-sm truncate">{user.full_name || 'Sem nome'}</span>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
                                                <Mail className="h-3 w-3" />
                                                {user.email}
                                            </div>
                                            {user.cargo && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-1 truncate">
                                                    <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-slate-100 text-slate-500 border-none rounded-md">
                                                        {user.cargo}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Badge variant="outline" className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${getRoleStyles(user.role)}`}>
                                        {getRoleIcon(user.role)}
                                        {user.role}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                                        <Building2 className="h-3.5 w-3.5 text-slate-300" />
                                        {getSectorName(user.setor_id)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => onViewAssets(user)}
                                        className="hover:scale-110 active:scale-95 transition-transform"
                                    >
                                        <Badge variant="secondary" className={`px-2 py-0.5 rounded-lg text-[10px] font-black border-none shadow-none cursor-pointer ${user.ativos_count ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-slate-50 text-slate-400'}`}>
                                            {user.ativos_count || 0}
                                        </Badge>
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${user.status === 'Inativo'
                                        ? "bg-slate-100 text-slate-400 border-slate-200"
                                        : "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        }`}>
                                        {user.status || 'Ativo'}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" onClick={() => onViewAssets(user)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-white border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm" title="Ver Equipamentos">
                                            <Package className="h-4 w-4" />
                                        </Button>
                                        {isAdmin && (
                                            <>
                                                <Button size="icon" variant="ghost" onClick={() => onEdit(user)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-white border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => onToggleStatus(user)}
                                                    className={`h-8 w-8 rounded-lg border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm ${user.status === 'Inativo' ? 'text-emerald-500 hover:text-emerald-600' : 'text-amber-500 hover:text-amber-600'
                                                        } hover:bg-white`}
                                                    title={user.status === 'Inativo' ? "Ativar" : "Inativar"}
                                                >
                                                    {user.status === 'Inativo' ? <UserCheck className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => onDelete(user)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
