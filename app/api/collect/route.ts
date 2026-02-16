import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')

    if (!apiKey) {
        return NextResponse.json({ error: 'Chave de API não fornecida' }, { status: 401 })
    }

    // Inicializa o cliente Supabase com a chave de serviço (Service Role)
    // Isso permite ignorar o RLS para validar a chave e inserir os dados
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Validar a chave de API
    const { data: keyData, error: keyError } = await supabaseAdmin
        .from('api_keys')
        .select('id, user_id')
        .eq('key_hash', apiKey) // Assumindo que a chave enviada é o hash ou o valor armazenado
        .single()

    if (keyError || !keyData) {
        return NextResponse.json({ error: 'Chave de API inválida' }, { status: 401 })
    }

    // 2. Processar os dados recebidos
    try {
        const body = await req.json()

        // Estrutura esperada:
        // {
        //   nome: string,
        //   tipo: "Computador",
        //   serial: string,
        //   status: string,
        //   processador: string,
        //   memoria_ram: string,
        //   armazenamento: string,
        //   acesso_remoto: string | null
        // }

        if (!body.serial) {
            return NextResponse.json({ error: 'Serial number is required' }, { status: 400 })
        }

        // 3. Inserir ou Atualizar (Upsert) na tabela ativos
        // Adicionando metadados de quem coletou baseada na chave
        const assetData = {
            ...body,
            updated_at: new Date().toISOString(),
            ultima_conexao: new Date().toISOString(),
            // Se quiser vincular o ativo ao usuário dono da chave, verifique se a coluna existe na sua tabela
            // user_id: keyData.user_id 
        }

        const { error: upsertError } = await supabaseAdmin
            .from('ativos')
            .upsert(assetData, { onConflict: 'serial', ignoreDuplicates: false })

        if (upsertError) {
            console.error("Erro no upsert:", JSON.stringify(upsertError, null, 2))
            return NextResponse.json({ error: `Erro ao salvar dados: ${upsertError.message}` }, { status: 500 })
        }

        // Atualizar data de último uso da chave (opcional, mas bom para tracking)
        await supabaseAdmin
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyData.id)

        return NextResponse.json({ success: true, message: 'Dados recebidos com sucesso' })

    } catch (error) {
        console.error("Erro no processamento:", error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
