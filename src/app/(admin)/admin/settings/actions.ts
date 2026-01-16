'use server'

import { serviceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function updatePlatformSetting(key: string, value: any) {
    if (!serviceClient) throw new Error("Service client unavailable");

    const { error } = await serviceClient
        .from("platform_settings" as any)
        .update({ 
            value: value, 
            updated_at: new Date().toISOString() 
        })
        .eq("key", key);

    if (error) {
        throw new Error(error.message);
    }

    // Log the change
    await serviceClient.from("platform_logs" as any).insert({
        level: "info",
        source: "admin",
        message: `Setting '${key}' updated to ${JSON.stringify(value)}`
    });

    revalidatePath("/admin/settings");
}
