"use client"

import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { PasswordConfirmModal } from "./password-confirm-modal"

interface DeleteConfirmModalProps {
    ativoId: string
    ativoNome: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DeleteConfirmModal({ ativoId, ativoNome, open, onOpenChange }: DeleteConfirmModalProps) {
    const handleDelete = async () => {
        try {
            // Get current user email for logging
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.id) {
                toast.error("Erro ao identificar usuário")
                return
            }

            // Log the "deletion" (archive)
            await supabase.from('movimentacoes').insert({
                ativo_id: ativoId,
                usuario_id: user.id,
                acao: 'DELETAR',
                observacao: `Ativo "${ativoNome}" marcado como BAIXADO (Arquivado)`,
            })

            // Update the asset status to 'Baixado' (Soft Delete)
            const { error } = await supabase
                .from('ativos')
                .update({ status: 'Baixado' })
                .eq('id', ativoId)

            if (error) throw error

            toast.success("Ativo arquivado com sucesso!")
            onOpenChange(false)
        } catch (error: unknown) {
            let msg = "Erro desconhecido"
            if (error instanceof Error) msg = error.message
            else if (typeof error === 'object' && error !== null && 'message' in error) msg = String((error as { message: unknown }).message)
            else if (typeof error === 'string') msg = error

            logger.error("Erro ao arquivar ativo:", msg)
            toast.error(`Erro ao arquivar ativo: ${msg}`)
            throw error
        }
    }

    return (
        <PasswordConfirmModal
            open={open}
            onOpenChange={onOpenChange}
            title="Confirmar Arquivamento"
            description={
                <span>
                    O ativo <strong className="text-slate-700">&quot;{ativoNome}&quot;</strong> será movido para status <strong>Baixado</strong>. O histórico será preservado, mas o item sairá da lista principal.
                </span>
            }
            onConfirm={handleDelete}
            confirmText="Arquivar"
        />
    )
}
