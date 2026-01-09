import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;
  const providerId = params.id;

  const { data, error } = await db
    .from("agenda_availability_blocks" as any)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .order("start_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ blocks: data ?? [] });
}

const blockSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const context = await getRouteTenantContext(request);
    if ("error" in context) return context.error;
    const { db, tenantId } = context;
    const providerId = params.id;
  
    const json = await request.json().catch(() => ({}));
    const parsed = blockSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const { startAt, endAt, reason } = parsed.data;

    const { error } = await db.from("agenda_availability_blocks" as any).insert({
        tenant_id: tenantId,
        provider_id: providerId,
        start_at: startAt,
        end_at: endAt,
        reason: reason ?? "Bloqueo manual",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    // We need to delete a specific block, but the route is .../providers/[id]/blocks...
    // The DELETE usually needs the block ID. 
    // We can pass block ID in search params for simplicity: ?blockId=...
    const context = await getRouteTenantContext(request);
    if ("error" in context) return context.error;
    const { db, tenantId } = context;
    
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get("blockId");

    if (!blockId) return NextResponse.json({ error: "Falta blockId" }, { status: 400 });

    const { error } = await db
        .from("agenda_availability_blocks" as any)
        .delete()
        .eq("id", blockId)
        .eq("tenant_id", tenantId); // Security check

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
