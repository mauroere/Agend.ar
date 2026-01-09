
import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data: locations, error } = await db
    .from("agenda_locations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ locations: locations ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const body = await request.json().catch(() => ({}));
  const { name, address } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const payload: Database["public"]["Tables"]["agenda_locations"]["Insert"] = {
    tenant_id: tenantId,
    name: name.trim(),
    address: address ? address.trim() : null,
    timezone: "America/Argentina/Buenos_Aires", // Default
    business_hours: {}, // Default empty
    default_duration: 30,
    buffer_minutes: 0,
  };

  const { data, error } = await db
    .from("agenda_locations")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ location: data });
}
