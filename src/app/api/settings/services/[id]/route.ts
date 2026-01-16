import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";
import { Database } from "@/types/database";

const bodySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  color: z.string().max(16).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  prepaymentStrategy: z.enum(["none", "full", "fixed"]).optional().nullable(),
  prepaymentAmount: z.number().nonnegative().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, session } = context;
  const serviceId = params.id;

  // Check Permissions
  const { data: userProfile } = await db
    .from("agenda_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userProfile?.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: Only owners can manage services" },
      { status: 403 }
    );
  }

  if (!serviceId) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const updates: Database["public"]["Tables"]["agenda_services"]["Update"] = {};
  const { name, description, durationMinutes, price, currency, color, imageUrl, active, sortOrder, categoryId, prepaymentStrategy, prepaymentAmount } = parsed.data;

  if (typeof name === "string") updates.name = name;
  if (description !== undefined) updates.description = description;
  if (typeof durationMinutes === "number") updates.duration_minutes = durationMinutes;
  if (price !== undefined) updates.price_minor_units = price === null ? null : Math.round(price * 100);
  if (currency) updates.currency = currency.toUpperCase();
  if (color !== undefined) updates.color = color;
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (typeof active === "boolean") updates.active = active;
  if (typeof sortOrder === "number") updates.sort_order = sortOrder;
  if (categoryId !== undefined) updates.category_id = categoryId;
  if (prepaymentStrategy !== undefined) updates.prepayment_strategy = prepaymentStrategy;
  if (prepaymentAmount !== undefined) updates.prepayment_amount = prepaymentAmount === null ? null : Math.round(prepaymentAmount * 100);

  const { error } = await db
    .from("agenda_services")
    .update(updates)
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
      { error: "Forbidden: Only owners can manage services" },
      { status: 403 }
    );
  }

  const serviceId = params.id;
  if (!serviceId) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }

  const { error } = await db
    .from("agenda_services")
    .delete()
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
