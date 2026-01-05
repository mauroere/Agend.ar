import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantName: z.string().min(3),
});

export async function POST(request: NextRequest) {
  if (!serviceClient) {
    return NextResponse.json({ error: "Supabase service client not configured" }, { status: 500 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, tenantName } = parsed.data;
  const tenantId = randomUUID();

  // Create tenant first so we can bind the user to it
  const { error: tenantError } = await serviceClient
    .from("agenda_tenants")
    .insert<Database["public"]["Tables"]["agenda_tenants"]["Insert"]>({ id: tenantId, name: tenantName });

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 400 });
  }

  const { data: userResult, error: userError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tenant_id: tenantId },
  });

  if (userError || !userResult.user) {
    // Rollback tenant to avoid orphans
    await serviceClient.from("agenda_tenants").delete().eq("id", tenantId);
    return NextResponse.json({ error: userError?.message ?? "No se pudo crear el usuario" }, { status: 400 });
  }

  const { error: usersRowError } = await serviceClient
    .from("agenda_users")
    .insert<Database["public"]["Tables"]["agenda_users"]["Insert"]>({
      id: userResult.user.id,
      tenant_id: tenantId,
      role: "owner",
    });

  if (usersRowError) {
    // Best-effort cleanup
    await serviceClient.auth.admin.deleteUser(userResult.user.id);
    await serviceClient.from("agenda_tenants").delete().eq("id", tenantId);
    return NextResponse.json({ error: usersRowError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
