import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { randomUUID } from "crypto";
import { Database } from "@/types/database";

export async function GET() {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No estás logueado. Logueate primero (aunque te redirija al login) y luego volvé a entrar a esta URL." }, { status: 401 });
  }

  if (!serviceClient) {
    return NextResponse.json({ error: "Service client missing" }, { status: 500 });
  }

  // 1. Check if user has tenant in DB
  const { data: rawUserRow } = await serviceClient
    .from("agenda_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  
  // Explicit type casting to resolve build error
  const userRow = rawUserRow as Database["public"]["Tables"]["agenda_users"]["Row"] | null;

  if (userRow) {
    // User has tenant in DB, just fix metadata
    await serviceClient.auth.admin.updateUserById(user.id, {
      app_metadata: { tenant_id: userRow.tenant_id },
      user_metadata: { tenant_id: userRow.tenant_id },
    });
    return NextResponse.json({ 
      message: "Usuario reparado exitosamente. Metadatos actualizados.", 
      tenantId: userRow.tenant_id,
      action: "Ahora volvé al login e ingresá normalmente."
    });
  }

  // 2. User has no tenant in DB. Create one.
  const tenantId = randomUUID();
  const tenantName = "Clínica Reparada";

  // Create tenant
  const { error: tenantError } = await serviceClient
    .from("agenda_tenants")
    .insert({ id: tenantId, name: tenantName });
    
  if (tenantError) return NextResponse.json({ error: "Error creando tenant: " + tenantError.message }, { status: 500 });

  // Link user
  const { error: linkError } = await serviceClient
    .from("agenda_users")
    .insert({
      id: user.id,
      tenant_id: tenantId,
      role: "owner"
    });

  if (linkError) return NextResponse.json({ error: "Error vinculando usuario: " + linkError.message }, { status: 500 });

  // 3. Ensure at least one location exists
  const { data: locations } = await serviceClient
    .from("agenda_locations")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);

  if (!locations || locations.length === 0) {
    const targetTenantId = tenantId;
    await serviceClient.from("agenda_locations").insert({
      tenant_id: targetTenantId,
      name: "Consultorio Principal",
      timezone: "America/Argentina/Buenos_Aires",
      business_hours: {
        mon: [["09:00", "18:00"]],
        tue: [["09:00", "18:00"]],
        wed: [["09:00", "18:00"]],
        thu: [["09:00", "18:00"]],
        fri: [["09:00", "18:00"]]
      },
      default_duration: 30,
      buffer_minutes: 0
    });
  }

  return NextResponse.json({ 
    message: "Cuenta reparada, clínica y consultorio creados.", 
    tenantId: tenantId,
    action: "Ahora volvé al login e ingresá normalmente."
  });
}
