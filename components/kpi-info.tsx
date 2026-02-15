"use client"

import { AlertCircle } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export function KPIInfo({ text }: { text: string }) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="text-slate-400 hover:text-primary cursor-help transition-colors">
                        <AlertCircle className="h-4 w-4" />
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] bg-slate-900 text-white border-slate-800 p-3 leading-relaxed text-xs font-medium">
                    <p>{text}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
