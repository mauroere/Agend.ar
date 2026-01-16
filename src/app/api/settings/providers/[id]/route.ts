import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";
import { Database } from "@/types/database";

import { serviceClient } from "@/lib/supabase/service";

const schema = z.object({
  fullName: z.string().min(2).max(160).optional(),
  bio: z.string().max(1200).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  color: z.string().max(16).optional().nullable(),
  defaultLocationId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
  specialties: z.array(z.string().max(60)).optional(),
  metadata: z.record(z.any()).optional().nullable(),
  serviceIds: z.array(z.string().uuid()).optional(),
  user_id: z.string().uuid().optional().nullable(),
  // For account creation in edit mode
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, session } = context;
  const providerId = params.id;

  // Check Permissions
  const { data: userProfile } = await db
    .from("agenda_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userProfile?.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: Only owners can manage providers" },
      { status: 403 }
    );
  }

  if (!providerId) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const updates: Database["public"]["Tables"]["agenda_providers"]["Update"] = {};
  const { fullName, bio, avatarUrl, color, defaultLocationId, active, specialties, metadata, serviceIds, user_id, email, password } = parsed.data;

  // Lógica de Creación de Usuario In-Line
  let newUserId = user_id;
  if (email && password && !newUserId) {
       if (!serviceClient) {
          return NextResponse.json({ error: "Server Error: Missing Service Client" }, { status: 500 });
       }
       const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { tenant_id: tenantId }
       });
        if (createError) {
           return NextResponse.json({ error: `Error creando usuario: ${createError.message}` }, { status: 400 });
        }
        newUserId = userData.user.id;

        // Map to agenda_users
        await serviceClient.from("agenda_users").insert({
            id: newUserId,
            tenant_id: tenantId,
            role: "staff"
        });
  }

  if (typeof fullName === "string") updates.full_name = fullName;
  if (bio !== undefined) updates.bio = bio;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
  if (color !== undefined) updates.color = color;
  if (defaultLocationId !== undefined) updates.default_location_id = defaultLocationId;
  if (typeof active === "boolean") updates.active = active;
  if (specialties) updates.specialties = specialties;
  if (metadata !== undefined) updates.metadata = metadata;
  if (newUserId !== undefined) updates.user_id = newUserId;

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

  if (serviceIds) {
    // Replace all services
    await db.from("agenda_provider_services" as any).delete().eq("provider_id", providerId);
    if (serviceIds.length > 0) {
      const servicesPayload = serviceIds.map(sid => ({
        provider_id: providerId,
        service_id: sid
      }));
      await db.from("agenda_provider_services" as any).insert(servicesPayload);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, session } = context;
  const providerId = params.id;

  // Check Permissions
  const { data: userProfile } = await db
    .from("agenda_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userProfile?.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: Only owners can manage providers" },
      { status: 403 }
    );
  }

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
