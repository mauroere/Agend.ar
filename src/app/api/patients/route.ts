import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase() as unknown as SupabaseClient<Database>;
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerTenant = request.headers.get("x-tenant-id");
  const tenantId = tokenTenant ?? headerTenant;

  if (!auth.session || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isDev = process.env.NODE_ENV === "development";
  const isDefaultTenant = headerTenant === "tenant_1";
  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    if (!isDev || !isDefaultTenant) {
      return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
    }
  }

  // Use serviceClient for DB operations to bypass RLS in dev/mismatch scenarios
  const db = serviceClient ?? supabase;

  const body = await request.json();
  const { fullName, phone, notes } = body;

  if (!fullName || !phone) {
    return NextResponse.json({ error: "Name and phone required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("agenda_patients")
    .insert({
      tenant_id: tenantId,
      full_name: fullName,
      phone_e164: phone,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ patient: data });
}
