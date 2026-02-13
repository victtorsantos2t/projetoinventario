import * as XLSX from 'xlsx'

interface ExportColumn {
    header: string
    key: string
    width?: number
}

/**
 * Exporta dados para um arquivo Excel (.xlsx)
 */
export function exportToExcel(
    data: Record<string, any>[],
    columns: ExportColumn[],
    filename: string = 'export'
) {
    // Mapear dados pelas colunas definidas
    const rows = data.map(item =>
        columns.reduce((row, col) => {
            row[col.header] = item[col.key] ?? '—'
            return row
        }, {} as Record<string, any>)
    )

    const worksheet = XLSX.utils.json_to_sheet(rows)

    // Auto-ajustar largura das colunas
    worksheet['!cols'] = columns.map(col => ({
        wch: col.width || Math.max(
            col.header.length,
            ...data.map(item => String(item[col.key] || '').length)
        ) + 2
    }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados')

    // Gerar e baixar o arquivo
    const timestamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`)
}

/**
 * Colunas padrão para exportação do inventário
 */
export const INVENTORY_COLUMNS: ExportColumn[] = [
    { header: 'Nome', key: 'nome', width: 25 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Serial', key: 'serial', width: 20 },
    { header: 'Patrimônio', key: 'patrimonio', width: 15 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Colaborador', key: 'colaborador', width: 22 },
    { header: 'Setor', key: 'setor', width: 18 },
    { header: 'Condição', key: 'condicao', width: 12 },
    { header: 'Processador', key: 'processador', width: 20 },
    { header: 'RAM', key: 'memoria_ram', width: 10 },
    { header: 'Armazenamento', key: 'armazenamento', width: 15 },
    { header: 'Cadastrado em', key: 'created_at', width: 14 },
]
