import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";
import { Database } from "@/types/database";

const providerSchema = z.object({
  fullName: z.string().min(2).max(160),
  bio: z.string().max(1200).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  color: z.string().max(16).optional().nullable(),
  defaultLocationId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
  specialties: z.array(z.string().max(60)).optional(),
  metadata: z.record(z.any()).optional().nullable(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data: providers, error } = await db
    .from("agenda_providers")
    .select("id, full_name, bio, avatar_url, color, default_location_id, active, specialties, metadata")
    .eq("tenant_id", tenantId)
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fetch services map
  const { data: servicesMap } = await db
    .from("agenda_provider_services" as any)
    .select("provider_id, service_id")
    .in("provider_id", providers?.map(p => p.id) ?? [])
    .returns<Array<{ provider_id: string; service_id: string }>>();

  const providersWithServices = providers?.map(p => ({
    ...p,
    serviceIds: servicesMap?.filter(sm => sm.provider_id === p.id).map(sm => sm.service_id) ?? []
  }));

  return NextResponse.json({ providers: providersWithServices ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const json = await request.json().catch(() => ({}));
  const parsed = providerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { fullName, bio, avatarUrl, color, defaultLocationId, active, specialties, metadata, serviceIds } = parsed.data;

  const payload: Database["public"]["Tables"]["agenda_providers"]["Insert"] = {
    tenant_id: tenantId,
    full_name: fullName,
    bio: bio ?? null,
    avatar_url: avatarUrl ?? null,
    color: color ?? null,
    default_location_id: defaultLocationId ?? null,
    active: active ?? true,
    specialties: specialties ?? [],
    metadata: metadata ?? {},
  };

  if (payload.default_location_id) {
    const { data: location, error: locError } = await db
      .from("agenda_locations")
      .select("id")
      .eq("id", payload.default_location_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (locError || !location) {
      return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
    }
  }

  const { data: newProvider, error } = await db.from("agenda_providers").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (serviceIds && serviceIds.length > 0 && newProvider) {
    const servicesPayload = serviceIds.map(sid => ({
      provider_id: newProvider.id,
      service_id: sid
    }));
    await db.from("agenda_provider_services" as any).insert(servicesPayload);
  }

  return NextResponse.json({ ok: true, id: newProvider?.id });
}
