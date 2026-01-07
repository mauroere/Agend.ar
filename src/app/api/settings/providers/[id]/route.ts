import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";
import { Database } from "@/types/database";

const schema = z.object({
  fullName: z.string().min(2).max(160).optional(),
  bio: z.string().max(1200).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  color: z.string().max(16).optional().nullable(),
  defaultLocationId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
  specialties: z.array(z.string().max(60)).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;
  const providerId = params.id;

  if (!providerId) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const updates: Database["public"]["Tables"]["agenda_providers"]["Update"] = {};
  const { fullName, bio, avatarUrl, color, defaultLocationId, active, specialties } = parsed.data;

  if (typeof fullName === "string") updates.full_name = fullName;
  if (bio !== undefined) updates.bio = bio;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
  if (color !== undefined) updates.color = color;
  if (defaultLocationId !== undefined) updates.default_location_id = defaultLocationId;
  if (typeof active === "boolean") updates.active = active;
  if (specialties) updates.specialties = specialties;

  if (updates.default_location_id) {
    const { data: location, error: locError } = await db
      .from("agenda_locations")
      .select("id")
      .eq("id", updates.default_location_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (locError || !location) {
      return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
    }
  }

  const { error } = await db
    .from("agenda_providers")
    .update(updates)
    .eq("id", providerId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;
  const providerId = params.id;

  if (!providerId) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }

  const { error } = await db
    .from("agenda_providers")
    .delete()
    .eq("id", providerId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
