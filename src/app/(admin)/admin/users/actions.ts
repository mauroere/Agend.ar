"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/database";
import { serviceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function adminResetPassword(targetUserId: string, newPassword: string) {
  if (!serviceClient) {
      return { error: "Service client not configured" };
  }

  try {
    const supabase = createServerActionClient<Database>({ cookies });

    // 1. Verify Authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No autorizado. Inicie sesión." };
    }

    // 2. Verify Authorization (Must be Platform Admin)
    const { data: adminUser, error: adminCheckError } = await serviceClient
      .from("agenda_users")
      .select("is_platform_admin")
      .eq("id", session.user.id)
      .single();

    if (adminCheckError || !adminUser?.is_platform_admin) {
      return { error: "Acceso denegado. Se requieren permisos de Super Admin." };
    }

    // 3. Perform Password Update (Admin API bypasses need for old password)
    const { data: updatedUser, error: updateError } = await serviceClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return { error: updateError.message };
    }

    // 4. Audit Log (Write to platform_logs instead of missing admin_audit_logs)
    await serviceClient.from("platform_logs").insert({
        level: "warn",
        source: "admin_users",
        message: `Password force reset for user ${targetUserId}`,
        metadata: {
            admin_id: session.user.id,
            action: "PASSWORD_RESET",
            resource_type: "auth.users",
            resource_id: targetUserId
        }
    } as any);

    revalidatePath("/admin/users");
    return { success: true, message: "Contraseña actualizada correctamente." };

  } catch (err) {
    console.error("Unexpected error in adminResetPassword:", err);
    return { error: "Error interno del servidor." };
  }
}
