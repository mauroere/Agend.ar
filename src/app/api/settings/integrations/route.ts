import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerTenant = request.headers.get("x-tenant-id");
  const tenantId = tokenTenant ?? headerTenant;
  
  if (!auth.session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const isDev = process.env.NODE_ENV === "development";
  const isDefaultTenant = headerTenant === "tenant_1";
  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    if (!isDev || !isDefaultTenant) {
      return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("agenda_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", "meta_whatsapp")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ integration: data });
}

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerTenant = request.headers.get("x-tenant-id");
  const tenantId = tokenTenant ?? headerTenant;
  
  if (!auth.session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const isDev = process.env.NODE_ENV === "development";
  const isDefaultTenant = headerTenant === "tenant_1";
  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    if (!isDev || !isDefaultTenant) {
      return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { phoneNumberId, businessAccountId, accessToken, verifyToken } = body;

  const credentials = {
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken
  };

  // Check if exists
  const { data: rawExisting } = await supabase
    .from("agenda_integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", "meta_whatsapp")
    .maybeSingle();

  const existing = rawExisting as { id: string } | null;

  if (existing) {
    const { error } = await supabase
      .from("agenda_integrations")
      // @ts-ignore
      .update({
        credentials,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
      
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase
      .from("agenda_integrations")
      // @ts-ignore
      .insert({
        tenant_id: tenantId,
        provider: "meta_whatsapp",
        credentials,
      });
      
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
