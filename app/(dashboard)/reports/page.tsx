"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { supabase } from "@/lib/supabaseClient"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
    FileText,
    Loader2,
    Download,
    Printer,
    BarChart,
    History,
    AlertTriangle,
    UserCheck,
    Building2,
    Calendar,
    Filter,
    ShieldCheck,
    Tag,
    X,
    Search,
    CheckSquare,
    Square,
    ClipboardCheck
} from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"
import { Profile, Setor } from "@/types"

const STATUS_OPTIONS = ['Disponível', 'Em uso', 'Manutenção', 'Baixado']

export default function ReportsPage() {
    const { isTecnico, loading: userLoading, profile } = useUser()
    const router = useRouter()

    useEffect(() => {
        if (!userLoading && !isTecnico) {
            router.push('/')
        }
    }, [isTecnico, userLoading, router])

    const [generating, setGenerating] = useState<string | null>(null)
    const [assets, setAssets] = useState<any[]>([])
    const [colaboradores, setColaboradores] = useState<Profile[]>([])
    const [company, setCompany] = useState<any>(null)

    // Filtros globais
    const [dataInicial, setDataInicial] = useState("")
    const [dataFinal, setDataFinal] = useState("")
    const [selectedTecnico, setSelectedTecnico] = useState("")
    const [selectedSetor, setSelectedSetor] = useState("")
    const [selectedStatus, setSelectedStatus] = useState("")
    const [tecnicos, setTecnicos] = useState<Profile[]>([])
    const [setores, setSetores] = useState<Setor[]>([])
    const [auditorias, setAuditorias] = useState<any[]>([])
    const [selectedAudit, setSelectedAudit] = useState("")


    useEffect(() => {
        const fetchData = async () => {
            const [assetsRes, profilesRes, companyRes, setoresRes, auditoriasRes] = await Promise.all([
                supabase.from('ativos').select('*').order('nome'),
                supabase.from('profiles').select('*').order('full_name'),
                supabase.from('empresa').select('*').single(),
                supabase.from('setores').select('*').order('nome'),
                supabase.from('auditorias').select('*').order('created_at', { ascending: false })
            ])

            if (assetsRes.data) setAssets(assetsRes.data)
            if (profilesRes.data) {
                setColaboradores(profilesRes.data as Profile[])
                setTecnicos(profilesRes.data.filter((p: any) => p.role === 'Técnico' || p.role === 'Admin') as Profile[])
            }
            if (companyRes.data) setCompany(companyRes.data)
            if (setoresRes.data) setSetores(setoresRes.data as Setor[])
            if (auditoriasRes.data) setAuditorias(auditoriasRes.data)
        }
        fetchData()
    }, [])

    // Helper: Cabeçalho do PDF com 2 colunas (sem logo, sem borda)
    const addModernBranding = (doc: jsPDF, title: string, itemCount?: number) => {
        const pageCount = (doc.internal as any).getNumberOfPages()

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)

            const headerY = 10
            const marginX = 14
            const headerWidth = 210 - (marginX * 2)
            const dividerX = marginX + headerWidth * 0.65

            // Coluna Esquerda — Dados da empresa (sem borda)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(10)
            doc.setTextColor(30, 41, 59)
            doc.text(company?.nome_fantasia || company?.razao_social || "TI System", marginX, headerY + 6)

            doc.setFont("helvetica", "normal")
            doc.setFontSize(7)
            doc.setTextColor(100, 116, 139)

            const cnpjValue = company?.cnpj ? `CNPJ: ${company.cnpj}` : null
            const addr1 = [company?.logradouro, company?.numero].filter(Boolean).join(', ')
            const addr2 = [company?.cidade, company?.estado, company?.cep].filter(Boolean).join(' – ')

            let currentY = headerY + 11
            if (cnpjValue) {
                doc.text(cnpjValue, marginX, currentY)
                currentY += 4
            }
            if (addr1) {
                doc.text(addr1, marginX, currentY)
                currentY += 4
            }
            if (addr2) {
                doc.text(addr2, marginX, currentY)
            }

            // Coluna Direita — Data e Por (alinhado à direita)
            const rightX = 210 - marginX
            doc.setFont("helvetica", "bold")
            doc.setFontSize(8)
            doc.setTextColor(30, 41, 59)
            doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, rightX, headerY + 6, { align: "right" })
            doc.setFont("helvetica", "normal")
            doc.text(`Por: ${profile?.full_name || 'Sistema'}`, rightX, headerY + 12, { align: "right" })

            // Linha separadora sutil
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.1)
            doc.line(marginX, headerY + 22, 210 - marginX, headerY + 22)

            // Título do relatório
            doc.setFont("helvetica", "bold")
            doc.setFontSize(13)
            doc.setTextColor(0, 0, 0)
            doc.text(title.toUpperCase(), 105, headerY + 30, { align: "center" })

            // Subtítulo com período e/ou quantidade
            let subtitleY = headerY + 36
            if (dataInicial || dataFinal) {
                doc.setFont("helvetica", "normal")
                doc.setFontSize(8)
                doc.setTextColor(100, 116, 139)
                const periodoText = `Período: ${dataInicial ? new Date(dataInicial + 'T00:00:00').toLocaleDateString('pt-BR') : '---'} a ${dataFinal ? new Date(dataFinal + 'T00:00:00').toLocaleDateString('pt-BR') : '---'}`
                doc.text(periodoText, 105, subtitleY, { align: "center" })
                subtitleY += 5
            }

            if (itemCount !== undefined && i === 1) {
                doc.setFont("helvetica", "normal")
                doc.setFontSize(8)
                doc.setTextColor(100, 116, 139)
                doc.text(`Total de itens: ${itemCount}`, 105, subtitleY, { align: "center" })
            }

            // Footer
            doc.setDrawColor(200, 200, 200)
            doc.line(14, 280, 196, 280)
            doc.setFontSize(7)
            doc.setTextColor(148, 163, 184)
            doc.text(`Página ${i} de ${pageCount}`, 14, 285)
            doc.text(`${company?.nome_fantasia || company?.razao_social || "TI System"} - Documento oficial para auditoria interna`, 105, 285, { align: "center" })
        }
    }

    const getStartY = () => (dataInicial || dataFinal) ? 68 : 60

    const tableStyles = {
        theme: 'striped' as const,
        headStyles: {
            fillColor: [0, 0, 0] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold' as const,
            fontSize: 9,
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            valign: 'middle' as const,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] as [number, number, number],
        },
    }

    const generateFullInventory = async () => {
        setGenerating('full')
        try {
            const doc = new jsPDF()
            let query = supabase.from('ativos').select('*').order('nome')

            if (dataInicial) query = query.gte('created_at', dataInicial)
            if (dataFinal) query = query.lte('created_at', dataFinal + 'T23:59:59')
            if (selectedStatus) query = query.eq('status', selectedStatus)

            const { data: ativos, error } = await query
            if (error) throw error

            const tableData = ativos.map(ativo => [
                ativo.nome,
                ativo.tipo,
                ativo.serial,
                ativo.patrimonio || '-',
                ativo.setor || '-',
                ativo.colaborador || '-',
                ativo.condicao || '-',
                ativo.status
            ])

            autoTable(doc, {
                ...tableStyles,
                head: [['Nome', 'Tipo', 'Serial', 'Patrimônio', 'Setor', 'Responsável', 'Condição', 'Status']],
                body: tableData,
                startY: getStartY(),
                margin: { top: 60, bottom: 25 },
            })

            addModernBranding(doc, "Relatório de Inventário Completo", ativos.length)
            doc.save(`inventario_completo_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success("Relatório gerado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar relatório")
        } finally {
            setGenerating(null)
        }
    }

    const generateBySector = async () => {
        setGenerating('sector')
        try {
            const doc = new jsPDF()
            let query = supabase.from('ativos').select('*').order('setor')

            if (selectedSetor) {
                query = query.eq('setor', selectedSetor)
            }
            if (selectedStatus) query = query.eq('status', selectedStatus)

            const { data: ativos, error } = await query
            if (error) throw error

            const grouped = ativos.reduce((acc, curr) => {
                const sector = curr.setor || 'Sem Setor'
                if (!acc[sector]) acc[sector] = []
                acc[sector].push(curr)
                return acc
            }, {} as Record<string, typeof ativos>)

            let lastY = getStartY()
            Object.keys(grouped).forEach((sector, index) => {
                if (index > 0 && lastY > 230) {
                    doc.addPage()
                    lastY = 50
                }

                doc.setFontSize(12)
                doc.setFont("helvetica", "bold")
                doc.setTextColor(30, 41, 59)
                doc.text(`${sector} (${grouped[sector].length})`, 14, lastY)

                const tableData = grouped[sector].map((ativo: any) => [
                    ativo.nome,
                    ativo.tipo,
                    ativo.serial,
                    ativo.patrimonio || '-',
                    ativo.colaborador || '-',
                    ativo.status
                ])

                autoTable(doc, {
                    ...tableStyles,
                    head: [['Nome', 'Tipo', 'Serial', 'Patrimônio', 'Responsável', 'Status']],
                    body: tableData,
                    startY: lastY + 5,
                    headStyles: { ...tableStyles.headStyles },
                    margin: { top: 60, bottom: 25 },
                })

                // @ts-expect-error - jspdf-autotable adds lastAutoTable to doc
                lastY = doc.lastAutoTable.finalY + 15
            })

            const titleSuffix = selectedSetor ? ` — ${selectedSetor}` : ""
            addModernBranding(doc, `Ativos por Setor${titleSuffix}`, ativos.length)
            doc.save(`ativos_por_setor_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success("Relatório gerado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar relatório")
        } finally {
            setGenerating(null)
        }
    }

    const generateMaintenanceReport = async () => {
        setGenerating('maintenance')
        try {
            const doc = new jsPDF()
            let query = supabase
                .from('movimentacoes')
                .select(`
                    *,
                    ativo:ativos(nome, patrimonio),
                    usuario:profiles(full_name)
                `)
                .eq('tipo_movimentacao', 'MANUTENÇÃO')
                .order('data_movimentacao', { ascending: false })

            if (dataInicial) query = query.gte('data_movimentacao', dataInicial)
            if (dataFinal) query = query.lte('data_movimentacao', dataFinal + 'T23:59:59')
            if (selectedTecnico) query = query.eq('usuario_id', selectedTecnico)

            const { data: maint, error } = await query
            if (error) throw error

            const tableData = maint.map(m => {
                const userName = (m as any).usuario?.full_name || 'Sistema'
                return [
                    new Date(m.data_movimentacao).toLocaleDateString('pt-BR') + ' ' + new Date(m.data_movimentacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    m.ativo?.nome || '-',
                    m.ativo?.patrimonio || '-',
                    m.observacao || '-',
                    userName
                ]
            })

            autoTable(doc, {
                ...tableStyles,
                head: [['Data/Hora', 'Equipamento', 'Patrimônio', 'Detalhes da Manutenção', 'Responsável']],
                body: tableData,
                startY: getStartY(),
                headStyles: { ...tableStyles.headStyles },
                margin: { top: 60, bottom: 25 },
            })

            addModernBranding(doc, "Histórico Geral de Manutenções", maint.length)
            doc.save(`historico_manutencoes_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success("Relatório gerado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar relatório")
        } finally {
            setGenerating(null)
        }
    }

    const generateCriticalAssetsReport = async () => {
        setGenerating('critical')
        try {
            const doc = new jsPDF()
            let query = supabase
                .from('ativos')
                .select('*')
                .lt('saude', 50)
                .neq('status', 'Baixado')
                .order('saude', { ascending: true })

            if (dataInicial) query = query.gte('created_at', dataInicial)
            if (dataFinal) query = query.lte('created_at', dataFinal + 'T23:59:59')

            const { data: ativos, error } = await query
            if (error) throw error

            const tableData = ativos.map(ativo => [
                ativo.nome,
                ativo.tipo,
                ativo.serial,
                ativo.patrimonio || '-',
                ativo.setor || '-',
                ativo.colaborador || '-',
                ativo.status
            ])

            autoTable(doc, {
                ...tableStyles,
                head: [['Nome', 'Tipo', 'Serial', 'Patrimônio', 'Setor', 'Responsável', 'Status']],
                body: tableData,
                startY: getStartY(),
                headStyles: { ...tableStyles.headStyles },
                margin: { top: 60, bottom: 25 },
            })

            addModernBranding(doc, "Equipamentos em Estado Crítico", ativos.length)
            doc.save(`ativos_criticos_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success("Relatório gerado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar relatório")
        } finally {
            setGenerating(null)
        }
    }

    const generateWarrantyReport = async () => {
        setGenerating('warranty')
        try {
            const doc = new jsPDF()
            let query = supabase
                .from('ativos')
                .select('*')
                .eq('tem_garantia', true)
                .neq('status', 'Baixado')
                .order('nome')

            if (dataInicial) query = query.gte('created_at', dataInicial)
            if (dataFinal) query = query.lte('created_at', dataFinal + 'T23:59:59')
            if (selectedStatus) query = query.eq('status', selectedStatus)

            const { data: ativos, error } = await query
            if (error) throw error

            const tableData = ativos.map(ativo => {
                const createdAt = new Date(ativo.created_at)
                const garantiaFim = new Date(createdAt)
                garantiaFim.setMonth(garantiaFim.getMonth() + (ativo.garantia_meses || 0))
                const hoje = new Date()
                const diasRestantes = Math.ceil((garantiaFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                const statusGarantia = diasRestantes > 0 ? `${diasRestantes} dias` : 'Expirada'

                return [
                    ativo.nome,
                    ativo.tipo,
                    ativo.serial,
                    ativo.patrimonio || '-',
                    ativo.colaborador || '-',
                    `${ativo.garantia_meses || 0} meses`,
                    createdAt.toLocaleDateString('pt-BR'),
                    garantiaFim.toLocaleDateString('pt-BR'),
                    statusGarantia
                ]
            })

            autoTable(doc, {
                ...tableStyles,
                head: [['Nome', 'Tipo', 'Serial', 'Patrimônio', 'Responsável', 'Garantia', 'Início', 'Fim', 'Restante']],
                body: tableData,
                startY: getStartY(),
                headStyles: { ...tableStyles.headStyles },
                styles: { ...tableStyles.styles, fontSize: 7 },
                margin: { top: 60, bottom: 25 },
            })

            addModernBranding(doc, "Ativos com Garantia", ativos.length)
            doc.save(`ativos_garantia_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success("Relatório gerado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar relatório")
        } finally {
            setGenerating(null)
        }
    }

    const generateAuditReport = async () => {
        if (!selectedAudit) {
            toast.error("Selecione um ciclo de auditoria")
            return
        }
        setGenerating('audit')
        try {
            const { data: items, error } = await supabase
                .from('auditoria_itens')
                .select(`
                    *,
                    ativo:ativos(nome, patrimonio, setor, colaborador),
                    usuario:profiles(full_name)
                `)
                .eq('auditoria_id', selectedAudit)
                .order('created_at', { ascending: true })

            if (error) throw error

            const doc = new jsPDF()
            const auditDetails = auditorias.find(a => a.id === selectedAudit)
            const auditDate = auditDetails ? new Date(auditDetails.created_at).toLocaleDateString('pt-BR') : ''

            const tableData = items.map(item => [
                item.ativo?.nome || '-',
                item.ativo?.patrimonio || '-',
                item.ativo?.setor || '-',
                item.status_conferido,
                item.tem_nao_conformidade ? (item.tipo_nao_conformidade || 'Sim') : 'Não',
                item.obs || '-'
            ])

            autoTable(doc, {
                ...tableStyles,
                head: [['Ativo', 'Patrimônio', 'Setor Origem', 'Status', 'Não Conformidade', 'Observações']],
                body: tableData,
                startY: getStartY(),
                headStyles: { ...tableStyles.headStyles },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 4 && data.cell.raw !== 'Não') {
                        data.cell.styles.textColor = [225, 29, 72] // Rose 600
                        data.cell.styles.fontStyle = 'bold'
                    }
                },
                margin: { top: 60, bottom: 25 },
            })

            addModernBranding(doc, `Relatório de Auditoria — Ciclo ${auditDate}`, items.length)
            doc.save(`relatorio_auditoria_${auditDate.replace(/\//g, '-')}.pdf`)
            toast.success("Relatório de auditoria gerado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar relatório")
        } finally {
            setGenerating(null)
        }
    }


    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Central de Relatórios</h1>
                <p className="text-slate-500 font-medium">Documentos modernizados e prontos para impressão ou auditoria.</p>
            </div>

            {/* Filtros Globais */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Filtros Globais</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data Inicial</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                value={dataInicial}
                                onChange={(e) => setDataInicial(e.target.value)}
                                className="w-full pl-10 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-slate-300 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data Final</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                value={dataFinal}
                                onChange={(e) => setDataFinal(e.target.value)}
                                className="w-full pl-10 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-slate-300 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Técnico Responsável</label>
                        <select
                            value={selectedTecnico}
                            onChange={(e) => setSelectedTecnico(e.target.value)}
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 px-3 focus:ring-2 focus:ring-slate-300 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Todos os técnicos</option>
                            {tecnicos.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.full_name} ({t.role})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 px-3 focus:ring-2 focus:ring-slate-300 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Todos os status</option>
                            {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {(dataInicial || dataFinal || selectedTecnico || selectedStatus) && (
                    <button
                        onClick={() => { setDataInicial(""); setDataFinal(""); setSelectedTecnico(""); setSelectedStatus("") }}
                        className="mt-3 text-xs text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                    >
                        <X className="h-3 w-3" /> Limpar filtros
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Full Inventory */}
                <ReportCard
                    title="Inventário Geral"
                    description="Lista completa com todos os detalhes técnicos de cada ativo."
                    icon={<FileText className="h-6 w-6 text-blue-600" />}
                    bgColor="bg-blue-50"
                    onGenerate={generateFullInventory}
                    loading={generating === 'full'}
                />

                {/* By Sector */}
                <ReportCard
                    title="Ativos por Setor"
                    description="Agrupamento organizado por departamentos para conferência local."
                    icon={<BarChart className="h-6 w-6 text-emerald-600" />}
                    bgColor="bg-emerald-50"
                    onGenerate={generateBySector}
                    loading={generating === 'sector'}
                    iconBtn={<Printer className="h-4 w-4" />}
                >
                    <div className="mt-4">
                        <label className="block text-[10px] uppercase font-black text-emerald-600 mb-1.5 tracking-widest px-1">
                            Filtrar por Setor
                        </label>
                        <select
                            value={selectedSetor}
                            onChange={(e) => setSelectedSetor(e.target.value)}
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 focus:ring-2 focus:ring-emerald-200 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Todos os setores</option>
                            {setores.map(s => (
                                <option key={s.id} value={s.nome}>{s.nome}</option>
                            ))}
                        </select>
                    </div>
                </ReportCard>

                {/* Maintenance History */}
                <ReportCard
                    title="Histórico de Manutenções"
                    description="Detalhamento cronológico de todas as intervenções realizadas."
                    icon={<History className="h-6 w-6 text-amber-600" />}
                    bgColor="bg-amber-50"
                    onGenerate={generateMaintenanceReport}
                    loading={generating === 'maintenance'}
                />

                {/* Critical */}
                <ReportCard
                    title="Equipamentos Críticos"
                    description="Itens com saúde abaixo de 50% que sugerem substituição iminente."
                    icon={<AlertTriangle className="h-6 w-6 text-rose-600" />}
                    bgColor="bg-rose-50"
                    onGenerate={generateCriticalAssetsReport}
                    loading={generating === 'critical'}
                />

                {/* Warranty Report */}
                <ReportCard
                    title="Ativos com Garantia"
                    description="Relatório de todos os ativos que possuem garantia, com datas e tempo restante."
                    icon={<ShieldCheck className="h-6 w-6 text-teal-600" />}
                    bgColor="bg-teal-50"
                    onGenerate={generateWarrantyReport}
                    loading={generating === 'warranty'}
                />

                {/* Audit Report */}
                <ReportCard
                    title="Relatório de Auditoria"
                    description="Resultados dos ciclos de conferência física com destaque para discrepâncias."
                    icon={<ClipboardCheck className="h-6 w-6 text-indigo-600" />}
                    bgColor="bg-indigo-50"
                    onGenerate={generateAuditReport}
                    loading={generating === 'audit'}
                >
                    <div className="mt-4">
                        <label className="block text-[10px] uppercase font-black text-indigo-600 mb-1.5 tracking-widest px-1">
                            Selecionar Ciclo
                        </label>
                        <select
                            value={selectedAudit}
                            onChange={(e) => setSelectedAudit(e.target.value)}
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 focus:ring-2 focus:ring-indigo-200 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Selecione um ciclo...</option>
                            {auditorias.map(a => (
                                <option key={a.id} value={a.id}>
                                    Auditoria de {new Date(a.created_at).toLocaleDateString('pt-BR')} ({a.status})
                                </option>
                            ))}
                        </select>
                    </div>
                </ReportCard>

            </div>
        </div>
    )
}

function ReportCard({ title, description, icon, bgColor, onGenerate, loading, iconBtn, children }: any) {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 group">
            <div className={`h-12 w-12 rounded-2xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-400 mb-6 line-clamp-2">{description}</p>
            {children}
            <button
                onClick={onGenerate}
                disabled={loading}
                className={`w-full py-3 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-lg ${children ? 'mt-4' : ''}`}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (iconBtn || <Download className="h-4 w-4" />)}
                Gerar PDF
            </button>
        </div>
    )
}
