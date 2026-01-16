import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional().nullable(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      { error: "Forbidden: Only owners can manage categories" },
      { status: 403 }
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, color, sortOrder, active } = parsed.data;

  const { data, error } = await db
    .from("agenda_service_categories")
    .update({
      name,
      color,
      sort_order: sortOrder,
      active,
    })
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      { error: "Forbidden: Only owners can manage categories" },
      { status: 403 }
    );
  }

  // First check if used? FK constraint `on delete set null` handles "not breaking", 
  // but maybe we want to warn? For now let's just delete (services become uncategorized).
  const { error } = await db
    .from("agenda_service_categories")
    .delete()
    .eq("id", params.id)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
