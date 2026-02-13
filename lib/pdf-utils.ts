import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Ativo, Profile } from "@/types"

interface CompanyInfo {
    razao_social: string
    cnpj: string
    logradouro: string
    numero: string
    cidade: string
    estado: string
    cep: string
}

export async function generateResponsibilityTerm(
    collaborator: Profile,
    assets: Ativo[],
    company: CompanyInfo | null,
    generatedBy: string
) {
    const doc = new jsPDF()
    const margin = 14
    const pageWidth = 210
    const marginX = 14

    // Helper para linhas
    let currentY = 15

    // 1. Cabeçalho da Empresa
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(company?.razao_social || "TI INVENTÁRIO — SISTEMA DE GESTÃO", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)

    currentY += 5
    if (company?.cnpj) {
        doc.text(`CNPJ: ${company.cnpj}`, margin, currentY)
        currentY += 4
    }
    const addr = [company?.logradouro, company?.numero, company?.cidade, company?.estado].filter(Boolean).join(", ")
    if (addr) {
        doc.text(addr, margin, currentY)
        currentY += 4
    }

    // Alinhado à direita: Data
    doc.setFont("helvetica", "bold")
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 15, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.text(`Emitido por: ${generatedBy}`, pageWidth - margin, 20, { align: "right" })

    // Linha divisória
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, 35, pageWidth - margin, 35)

    // 2. Título Central
    currentY = 45
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("TERMO DE RESPONSABILIDADE E RECEBIMENTO", pageWidth / 2, currentY, { align: "center" })

    // 3. Texto do Termo
    currentY = 55
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const introText = `Pelo presente termo de responsabilidade, eu, ${collaborator.full_name || 'COLABORADOR'}, portador do CPF ${collaborator.cpf || '___________'}, declaro ter recebido da empresa ${company?.razao_social || 'supra citada'}, em perfeito estado de conservação e funcionamento, os equipamentos e materiais abaixo relacionados, para uso exclusivo em atividades profissionais de interesse da empresa.`

    const splitText = doc.splitTextToSize(introText, pageWidth - (margin * 2))
    doc.text(splitText, margin, currentY)
    currentY += (splitText.length * 5) + 5

    // 4. Tabela de Ativos
    const tableData = assets.map(asset => [
        asset.nome,
        asset.tipo,
        asset.serial,
        asset.patrimonio || '-',
        asset.condicao
    ])

    autoTable(doc, {
        startY: currentY,
        head: [['Equipamento', 'Tipo', 'Serial', 'Patrimônio', 'Condição']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85]
        },
        columnStyles: {
            2: { fontStyle: 'bold' }, // Serial bold
            4: { halign: 'center' }
        },
        margin: { left: margin, right: margin }
    })

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15

    // 5. Cláusulas de Responsabilidade
    doc.setFont("helvetica", "bold")
    doc.text("CLÁUSULAS E OBRIGAÇÕES:", margin, currentY)
    currentY += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    const clauses = [
        "1. O colaborador assume total responsabilidade pela guarda, conservação e uso adequado dos equipamentos.",
        "2. Fica proibida a cessão ou empréstimo dos equipamentos a terceiros sem autorização prévia por escrito.",
        "3. Em caso de dano por mau uso, negligência ou perda, a empresa poderá cobrar o valor do reparo ou substituição.",
        "4. Em caso de desligamento da empresa, todos os equipamentos devem ser devolvidos imediatamente à TI.",
        "5. O colaborador deve comunicar imediatamente qualquer defeito ou anomalia no funcionamento."
    ]
    clauses.forEach(clause => {
        doc.text(clause, margin, currentY)
        currentY += 4
    })

    // 6. Campo de Assinatura
    currentY += 25
    doc.line(margin + 20, currentY, pageWidth / 2 - 10, currentY) // Linha esquerda
    doc.line(pageWidth / 2 + 10, currentY, pageWidth - margin - 20, currentY) // Linha direita

    currentY += 5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("ASSINATURA DO COLABORADOR", (margin + 20 + pageWidth / 2 - 10) / 2, currentY, { align: "center" })
    doc.text("TI / RESPONSÁVEL", (pageWidth / 2 + 10 + pageWidth - margin - 20) / 2, currentY, { align: "center" })

    currentY += 10
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(`${collaborator.full_name}`, (margin + 20 + pageWidth / 2 - 10) / 2, currentY, { align: "center" })

    // Footer
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Gerado via Inventário TI em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 285, { align: "center" })

    // Save
    const fileName = `termo_responsabilidade_${collaborator.full_name?.toLowerCase().replace(/\s/g, '_')}.pdf`
    doc.save(fileName)
}
