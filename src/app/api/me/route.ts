import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use serviceClient to bypass RLS issues when strictly reading 'who am I'
  // (especially if tenant_id claim is missing in JWT)
  const db = (serviceClient || supabase) as SupabaseClient<Database>;

  const { data: agendaUser, error } = await db
    .from("agenda_users")
    .select("role, tenant_id")
    .eq("id", session.user.id)
    .single();

  if (error || !agendaUser) {
     return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: tenant } = await db
    .from("agenda_tenants")
    .select("name, public_metadata")
    .eq("id", agendaUser.tenant_id)
    .single();

  const metadata = (tenant?.public_metadata ?? {}) as any;
  const logoUrl = metadata?.logoUrl || null;

  return NextResponse.json({
    role: agendaUser.role,
    tenantName: tenant?.name ?? "Agend.ar",
    tenantId: agendaUser.tenant_id,
    logoUrl
  });
}
