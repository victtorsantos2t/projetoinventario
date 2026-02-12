"use client"

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            // Give a tiny bit of time for Supabase to recover session from storage
            const { data: { session } } = await supabase.auth.getSession();

            if (!isMounted) return;

            if (session) {
                router.replace("/inventory");
            } else {
                router.replace("/login");
            }
        };

        checkSession();

        return () => { isMounted = false; };
    }, [router]);

    return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
    );
}
