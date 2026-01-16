import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;

  // Explicit Admin Check
  if (!context.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden. Admin access only." }, { status: 403 });
  }

  const { db } = context;

  // We fetch all tenants. 
  // Since 'db' is likely the service role client (via tenant-context), this bypasses RLS.
  const { data: tenants, error } = await db
    .from("agenda_tenants")
    .select("id, name, created_at, public_slug, status")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ tenants });
}
