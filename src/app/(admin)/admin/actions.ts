'use server'

import { serviceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function updateAdminNote(content: string) {
    // Upsert the single note row. We'll use a fixed ID or just order by date.
    // Ideally we just have one sticky note for the dashboard.
    // Let's assume we use a singleton pattern or just pick the latest.
    
    // Check if there is a note, if not create one.
    if (!serviceClient) throw new Error("Service client not configured");

    const { data: existing } = await serviceClient
        .from("admin_dashboard_notes")
        .select("id")
        .limit(1)
        .single();

    if (existing) {
        await serviceClient
            .from("admin_dashboard_notes")
            .update({ content, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
    } else {
        await serviceClient
            .from("admin_dashboard_notes")
            .insert({ content });
    }

    revalidatePath("/admin");
}

export async function getAdminNote() {
    const { data } = await serviceClient
        .from("admin_dashboard_notes")
        .select("content")
        .limit(1)
        .single();
    
    return data?.content || "";
}
