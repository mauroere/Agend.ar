import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, session } = context;

  // Check Permissions
  const { data: userProfile } = await db
    .from("agenda_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userProfile?.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: Only owners can view integrations" },
      { status: 403 }
    );
  }

  const provider = request.nextUrl.searchParams.get("provider") || "meta_whatsapp";

  const { data, error } = await db
    .from("agenda_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ integration: data });
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, session } = context;

  // Check Permissions
  const { data: userProfile } = await db
    .from("agenda_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userProfile?.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: Only owners can manage integrations" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const provider = body.provider || "meta_whatsapp";
  
  // Dynamic credentials based on provider
  let credentials = {};
  
  if (provider === "meta_whatsapp") {
      const { phoneNumberId, businessAccountId, accessToken, verifyToken } = body;
      credentials = { phoneNumberId, businessAccountId, accessToken, verifyToken };
  } else if (provider === "mercadopago") {
      const { access_token, public_key } = body;
      credentials = { access_token, public_key };
  } else if (provider === "bank_transfer") {
      const { bank_name, account_holder, cbu, alias, cuit } = body;
      credentials = { bank_name, account_holder, cbu, alias, cuit };
  } else {
      return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 });
  }

  // Check if exists
  const { data: rawExisting } = await db
    .from("agenda_integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();

  const existing = rawExisting as { id: string } | null;

  if (existing) {
    const { error } = await db
      .from("agenda_integrations")
      // @ts-ignore
      .update({
        credentials,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
      
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await db
      .from("agenda_integrations")
      // @ts-ignore
      .insert({
        tenant_id: tenantId,
        provider: provider,
        credentials,
      });
      
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
