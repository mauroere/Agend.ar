import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const appointmentId = params.id;
  if (!appointmentId) return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });

  const { error } = await db
    .from("agenda_appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
