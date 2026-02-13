
export interface Software {
    id: string
    nome: string
    desenvolvedor: string | null
    versao: string | null
    categoria: string | null
    descricao: string | null
    site_url: string | null
    created_at: string
    // Campos da view v_softwares_overview
    total_licencas?: number
    total_instancias_permitidas?: number
    total_instalado?: number
    licencas_disponiveis?: number
}

export interface Licenca {
    id: string
    software_id: string
    chave_licenca: string | null
    tipo: 'Perpétua' | 'Assinatura Anual' | 'Mensal' | 'Trial' | 'Volume' | 'OEM' | 'Outro'
    qtd_adquirida: number
    data_compra: string | null
    data_expiracao: string | null
    custo: number | null
    fornecedor: string | null
    numero_nota_fiscal: string | null
    obs: string | null
    created_at: string
}

export interface LicencaInstalacao {
    id: string
    licenca_id: string
    ativo_id: string
    data_instalacao: string
    usuario_instalou: string | null
    observacao: string | null
    // Join
    ativo?: {
        nome: string
        serial: string
        colaborador: string | null
    }
    licenca?: Licenca
}
