import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data, error } = await db
    .from("agenda_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", "meta_whatsapp")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ integration: data });
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const body = await request.json();
  const { phoneNumberId, businessAccountId, accessToken, verifyToken } = body;

  const credentials = {
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken
  };

  // Check if exists
  const { data: rawExisting } = await db
    .from("agenda_integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", "meta_whatsapp")
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
        provider: "meta_whatsapp",
        credentials,
      });
      
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
