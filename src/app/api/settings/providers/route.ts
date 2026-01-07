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
});

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data, error } = await db
    .from("agenda_providers")
    .select("id, full_name, bio, avatar_url, color, default_location_id, active, specialties")
    .eq("tenant_id", tenantId)
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ providers: data ?? [] });
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

  const { fullName, bio, avatarUrl, color, defaultLocationId, active, specialties } = parsed.data;

  const payload: Database["public"]["Tables"]["agenda_providers"]["Insert"] = {
    tenant_id: tenantId,
    full_name: fullName,
    bio: bio ?? null,
    avatar_url: avatarUrl ?? null,
    color: color ?? null,
    default_location_id: defaultLocationId ?? null,
    active: active ?? true,
    specialties: specialties ?? [],
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

  const { error } = await db.from("agenda_providers").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
