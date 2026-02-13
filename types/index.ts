export interface Profile {
    id: string
    full_name: string | null
    avatar_url: string | null
    role: string
    email: string | null
    setor_id: string | null
    setor?: string | null
    status: 'Ativo' | 'Inativo'
    cpf: string | null
    cargo: string | null
    ativos_count?: number
}

export interface Ativo {
    id: string
    nome: string
    tipo: string
    serial: string
    status: 'Disponível' | 'Em uso' | 'Manutenção' | 'Baixado'
    colaborador: string | null
    setor: string | null
    setor_id: string | null
    patrimonio: string | null
    acesso_remoto: string | null
    notas_manutencao: string | null
    created_at: string
    updated_at: string
    // Hardware specs (Computador/Notebook)
    processador: string | null
    memoria_ram: string | null
    armazenamento: string | null
    // Monitor specs
    polegadas: string | null
    saidas_video: string[] | null
    condicao: 'Novo' | 'Semi-novo'
    tem_garantia: boolean
    garantia_meses: number
    saude: number

    // Relation
    dono?: {
        full_name: string | null
        avatar_url: string | null
    }
    saude_info?: {
        status_saude: 'Excelente' | 'Alerta' | 'Crítico'
        garantia_vencendo: boolean
        garantia_vencida: boolean
        count_manutencao: number // Total de manutenções
        contagem_saude: number   // Manutenções pós-restauração
        ultima_manutencao: string | null
        data_restauracao: string | null
    }
}

export interface Movimentacao {
    id: string
    ativo_id: string
    usuario_id: string | null
    tipo_movimentacao: 'CRIAR' | 'EDITAR' | 'DELETAR' | 'ENTREGA' | 'DEVOLUÇÃO' | 'MANUTENÇÃO'
    observacao: string | null
    detalhes: Record<string, string | number | boolean | null> | null
    data_movimentacao: string
    ativo?: {
        id: string
        nome: string
        serial: string
    }
    usuario?: {
        full_name: string | null
        avatar_url: string | null
    }
}

export interface Setor {
    id: string
    nome: string
    created_at?: string
}

export interface Manutencao {
    id: string
    ativo_id: string
    data_manutencao: string
    descricao: string
    tipo: 'Preventiva' | 'Corretiva' | 'Upgrade' | 'Outro'
    custo: number | null
    tecnico_id: string | null
    tecnico?: {
        full_name: string | null
    }
    restaurar_saude?: boolean
    created_at: string
}
