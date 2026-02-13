"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        // O Middleware agora cuida da proteção de rotas.
        // Esta página apenas redireciona para o inventário se o usuário chegar aqui.
        router.replace("/inventory");
    }, [router]);

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Sincronizando acesso...</p>
        </div>
    );
}
