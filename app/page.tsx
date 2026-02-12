import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

export default async function RootPage() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        redirect("/inventory");
    } else {
        redirect("/login");
    }
}
