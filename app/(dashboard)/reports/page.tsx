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
    Square
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
    const [selectedColaborador, setSelectedColaborador] = useState<string>("")
    const [searchColaborador, setSearchColaborador] = useState("")
    const [showColaboradorDropdown, setShowColaboradorDropdown] = useState(false)
    const [selectedAssets, setSelectedAssets] = useState<string[]>([])
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

    const colaboradorDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colaboradorDropdownRef.current && !colaboradorDropdownRef.current.contains(event.target as Node)) {
                setShowColaboradorDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            const [assetsRes, profilesRes, companyRes, setoresRes] = await Promise.all([
                supabase.from('ativos').select('*').order('nome'),
                supabase.from('profiles').select('*').order('full_name'),
                supabase.from('empresa').select('*').single(),
                supabase.from('setores').select('*').order('nome'),
            ])

            if (assetsRes.data) setAssets(assetsRes.data)
            if (profilesRes.data) {
                setColaboradores(profilesRes.data as Profile[])
                setTecnicos(profilesRes.data.filter((p: any) => p.role === 'Técnico' || p.role === 'Admin') as Profile[])
            }
            if (companyRes.data) setCompany(companyRes.data)
            if (setoresRes.data) setSetores(setoresRes.data as Setor[])
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

    const generateResponsibilityTerm = async () => {
        if (!company) {
            toast.error("Por favor, preencha os dados da empresa nas configurações primeiro.")
            return
        }
        if (!selectedColaborador) {
            toast.error("Selecione um colaborador.")
            return
        }
        if (selectedAssets.length === 0) {
            toast.error("Selecione pelo menos um ativo para o termo.")
            return
        }
        setGenerating('term')
        try {
            const { data: user, error: uError } = await supabase
                .from('profiles')
                .select('*, setor:setores(nome)')
                .eq('id', selectedColaborador)
                .single()

            if (uError) throw uError

            const { data: userAssets, error: aError } = await supabase
                .from('ativos')
                .select('*')
                .in('id', selectedAssets)

            if (aError) throw aError

            if (!userAssets || userAssets.length === 0) {
                toast.error("Nenhum ativo encontrado para os itens selecionados.")
                return
            }

            const doc = new jsPDF()
            doc.setFont("helvetica", "bold")
            doc.setFontSize(14)
            doc.text("TERMO DE RESPONSABILIDADE E RECEBIMENTO", 105, 52, { align: "center" })

            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")

            const intro = `Pelo presente instrumento, eu, ${user.full_name || "____________________________________"}, inscrito no CPF sob o nº ${user.cpf || "______________________"}, lotado no setor ${(user as any).setor?.nome || "________________"}, declaro ter recebido da empresa ${company.razao_social} o(s) equipamento(s) abaixo descrito para uso exclusivo em minhas atividades profissionais.`

            doc.text(intro, 20, 65, { maxWidth: 170, lineHeightFactor: 1.5 })

            const assetData = userAssets.map((a: any) => [
                a.nome,
                a.tipo,
                a.serial,
                a.patrimonio || "N/A",
                a.condicao || "Bom"
            ])

            autoTable(doc, {
                ...tableStyles,
                head: [['Equipamento', 'Tipo', 'Serial', 'Patrimônio', 'Estado']],
                body: assetData,
                startY: 85,
                margin: { left: 20, right: 20 }
            })

            const finalY = (doc as any).lastAutoTable.finalY + 15

            const clauses = `
DECLARAÇÕES E COMPROMISSOS:
1. Comprometo-me a zelar pela guarda e conservação do equipamento;
2. Estou ciente de que o equipamento é de propriedade da empresa;
3. Em caso de dano por mau uso, autorizo o desconto do valor correspondente conforme legislação vigente;
4. Em caso de desligamento, comprometo-me a devolver o item imediatamente em perfeito estado.

Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}

Assinatura do Colaborador: _____________________________________________

Assinatura do Técnico TI: _______________________________________________`

            if (finalY > 230) doc.addPage()
            doc.text(clauses, 20, finalY > 230 ? 50 : finalY, { maxWidth: 170, lineHeightFactor: 1.5 })

            addModernBranding(doc, "")
            doc.save(`termo_${user.full_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success("Termo gerado com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar termo")
        } finally {
            setGenerating(null)
        }
    }

    // Helpers para o Termo de Entrega
    const filteredColaboradores = colaboradores.filter(c =>
        c.full_name?.toLowerCase().includes(searchColaborador.toLowerCase()) ||
        c.cargo?.toLowerCase().includes(searchColaborador.toLowerCase())
    )

    const selectedColaboradorProfile = colaboradores.find(c => c.id === selectedColaborador)

    // Corrigido: filtra pelo nome do colaborador (campo `colaborador` no ativo) em vez de `dono_id`
    const colaboradorAssets = selectedColaboradorProfile
        ? assets.filter(a => a.colaborador === selectedColaboradorProfile.full_name && a.status !== 'Baixado')
        : []
    const allAssets = assets.filter(a => a.status !== 'Baixado')

    const toggleAsset = (id: string) => {
        setSelectedAssets(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        )
    }

    const toggleAllAssets = (assetList: any[]) => {
        const allIds = assetList.map(a => a.id)
        const allSelected = allIds.every(id => selectedAssets.includes(id))
        if (allSelected) {
            setSelectedAssets(prev => prev.filter(id => !allIds.includes(id)))
        } else {
            setSelectedAssets(prev => [...new Set([...prev, ...allIds])])
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

                {/* Termo de Entrega — Layout empilhado */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-50/50 transition-all duration-300 group md:col-span-2 lg:col-span-3">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                            <UserCheck className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Termo de Entrega</h3>
                            <p className="text-sm text-slate-400 line-clamp-2">
                                Gere o termo de responsabilidade selecionando um colaborador e os ativos desejados.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Seleção de Colaborador */}
                        <div>
                            <label className="block text-[10px] uppercase font-black text-emerald-600 mb-1.5 tracking-widest px-1">
                                Colaborador
                            </label>
                            <div className="relative max-w-md" ref={colaboradorDropdownRef}>
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchColaborador}
                                    onChange={(e) => {
                                        setSearchColaborador(e.target.value)
                                        setShowColaboradorDropdown(true)
                                    }}
                                    onFocus={() => setShowColaboradorDropdown(true)}
                                    placeholder="Buscar colaborador..."
                                    className="w-full pl-10 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                                />
                                {selectedColaboradorProfile && !showColaboradorDropdown && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold truncate max-w-[200px]">
                                            {selectedColaboradorProfile.full_name}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedColaborador("")
                                                setSearchColaborador("")
                                                setSelectedAssets([])
                                            }}
                                            className="text-slate-400 hover:text-rose-500"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}

                                {showColaboradorDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                        {filteredColaboradores.length === 0 ? (
                                            <p className="p-3 text-xs text-slate-400 text-center">Nenhum colaborador encontrado.</p>
                                        ) : (
                                            filteredColaboradores.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedColaborador(c.id)
                                                        setSearchColaborador("")
                                                        setShowColaboradorDropdown(false)
                                                        setSelectedAssets([])
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-xs hover:bg-emerald-50 transition-colors flex items-center justify-between ${selectedColaborador === c.id ? 'bg-emerald-50 font-bold' : ''}`}
                                                >
                                                    <span className="font-medium text-slate-700">{c.full_name}</span>
                                                    <span className="text-[10px] text-slate-400">{c.cargo || 'Sem Cargo'}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Seleção de Ativos (abaixo do colaborador) */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <label className="text-[10px] uppercase font-black text-emerald-600 tracking-widest">
                                    Ativos ({selectedAssets.length} selecionados)
                                </label>
                                {selectedColaborador && colaboradorAssets.length > 0 && (
                                    <button
                                        onClick={() => toggleAllAssets(colaboradorAssets)}
                                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold transition-colors"
                                    >
                                        {colaboradorAssets.every(a => selectedAssets.includes(a.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                                    </button>
                                )}
                                {!selectedColaborador && allAssets.length > 0 && (
                                    <button
                                        onClick={() => toggleAllAssets(allAssets)}
                                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold transition-colors"
                                    >
                                        {allAssets.every(a => selectedAssets.includes(a.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                                    </button>
                                )}
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                                {selectedColaborador ? (
                                    colaboradorAssets.length > 0 ? (
                                        colaboradorAssets.map(a => (
                                            <label
                                                key={a.id}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-white/80 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
                                            >
                                                <button onClick={() => toggleAsset(a.id)} className="shrink-0">
                                                    {selectedAssets.includes(a.id) ? (
                                                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-slate-300" />
                                                    )}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-medium text-slate-700 block truncate">{a.nome}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{a.serial} — {a.tipo}</span>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="p-3 text-xs text-slate-400 text-center italic">Nenhum ativo vinculado a este colaborador.</p>
                                    )
                                ) : (
                                    <p className="p-3 text-xs text-slate-400 text-center italic">Selecione um colaborador para ver os ativos vinculados.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={generateResponsibilityTerm}
                        disabled={generating === 'term' || !selectedColaborador || selectedAssets.length === 0}
                        className="w-full mt-5 py-3 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group-hover:shadow-lg"
                    >
                        {generating === 'term' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Gerar Termo de Entrega
                    </button>
                </div>
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
