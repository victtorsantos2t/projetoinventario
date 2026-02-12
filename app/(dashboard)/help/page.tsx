"use client"

import {
    BookOpen,
    HelpCircle,
    Zap,
    ShieldCheck,
    Search,
    ChevronRight,
    MousePointer2,
    Filter,
    FileDown,
    PlusCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const categories = [
    {
        title: "Começando",
        description: "Aprenda o básico do sistema",
        icon: BookOpen,
        color: "text-blue-500",
        bg: "bg-blue-50"
    },
    {
        title: "Gestão de Ativos",
        description: "Como cadastrar e editar itens",
        icon: Zap,
        color: "text-yellow-500",
        bg: "bg-yellow-50"
    },
    {
        title: "Movimentações",
        description: "Histórico e trocas de responsáveis",
        icon: MousePointer2,
        color: "text-purple-500",
        bg: "bg-purple-50"
    },
    {
        title: "Equipe",
        description: "Gestão de colaboradores",
        icon: ShieldCheck,
        color: "text-green-500",
        bg: "bg-green-50"
    },
]

const tips = [
    {
        title: "Busca Rápida",
        description: "Use a barra de pesquisa para encontrar ativos por número de série, modelo ou responsável instantaneamente.",
        icon: Search
    },
    {
        title: "Filtros de Dashboard",
        description: "Clique nos cards do Dashboard para filtrar a lista de ativos automaticamente por status.",
        icon: Filter
    },
    {
        title: "Exportar Relatórios",
        description: "Você pode baixar a lista atual de ativos em formato CSV para uso em planilhas externas.",
        icon: FileDown
    },
    {
        title: "Adição em Lote",
        description: "Ao cadastrar novos ativos, o sistema salva suas preferências para facilitar cadastros sequenciais.",
        icon: PlusCircle
    }
]

export default function HelpPage() {
    return (
        <div className="space-y-10 pb-10">
            {/* Header Section */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <Badge variant="outline" className="px-4 py-1 border-primary/20 text-primary bg-primary/5 uppercase tracking-wider">
                    Central de Suporte
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                    Como podemos ajudar?
                </h1>
                <p className="text-slate-500 text-lg">
                    Encontre guias, dicas e instruções para aproveitar ao máximo o sistema de inventário.
                </p>
                <div className="relative max-w-lg mx-auto mt-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Pesquisar por tópicos de ajuda..."
                        className="pl-10 h-12 bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                    />
                </div>
            </div>

            {/* Main Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((category, idx) => (
                    <Card key={idx} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-100 cursor-pointer overflow-hidden">
                        <CardHeader>
                            <div className={`p-3 rounded-xl w-fit ${category.bg} ${category.color} group-hover:scale-110 transition-transform mb-2`}>
                                <category.icon className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">{category.title}</CardTitle>
                            <CardDescription className="text-slate-500 mt-1">{category.description}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {/* Usage Tips Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="bg-primary p-2 rounded-lg text-white">
                        <HelpCircle className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Dicas de Uso</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tips.map((tip, idx) => (
                        <div key={idx} className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-slate-50 p-3 rounded-full h-fit text-slate-400">
                                <tip.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-slate-900">{tip.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {tip.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Links / FAQ CTA */}
            <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <CardHeader className="relative h-full flex flex-col items-center text-center p-12 space-y-4">
                    <CardTitle className="text-2xl font-bold">Precisa de suporte personalizado?</CardTitle>
                    <CardDescription className="text-slate-400 text-lg max-w-lg">
                        Se não encontrou o que procurava, nossa equipe técnica está disponível para ajudar.
                    </CardDescription>
                    <button className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
                        Falar com Suporte
                    </button>
                </CardHeader>
            </Card>
        </div>
    )
}
