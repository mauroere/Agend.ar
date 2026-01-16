import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";
import { Database } from "@/types/database";
import { serviceClient } from "@/lib/supabase/service";

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
  // New fields for Account Creation
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data: providers, error } = await db
    .from("agenda_providers")
    .select("id, full_name, bio, avatar_url, color, default_location_id, active, specialties, metadata, user_id")
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

  const providersWithServices = await Promise.all(providers?.map(async (p) => {
    let userEmail = null;
    if (p.user_id && serviceClient) {
        // Warning: N+1 issue here, but for settings page with few providers is acceptable for now.
        // Optimization: could list all users and map, but listUsers pagination is tricky in generic case.
        const { data: { user } } = await serviceClient.auth.admin.getUserById(p.user_id);
        userEmail = user?.email ?? null;
    }
    
    return {
        ...p,
        email: userEmail,
        serviceIds: servicesMap?.filter(sm => sm.provider_id === p.id).map(sm => sm.service_id) ?? []
    };
  }) ?? []);

  return NextResponse.json({ providers: providersWithServices });
}

export async function POST(request: NextRequest) {
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
      { error: "Forbidden: Only owners can manage providers" },
      { status: 403 }
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = providerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { fullName, bio, avatarUrl, color, defaultLocationId, active, specialties, metadata, serviceIds, email, password } = parsed.data;

  let newUserId: string | null = null;

  // 1. Create User Account if requested
  if (email && password) {
      if (!serviceClient) {
          return NextResponse.json({ error: "Server misconfiguration: No Service Client" }, { status: 500 });
      }

      // Check if user exists first to avoid ugly errors? 
      // admin.createUser throws if exists.
      const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { tenant_id: tenantId },
          app_metadata: { tenant_id: tenantId }
      });

      if (createError) {
          console.error("Error creating user:", createError);
          // If user exists, we might want to fail or just warn. 
          // For this requirement (ABM), failing is better so they know.
          return NextResponse.json({ error: `Error creando usuario: ${createError.message}` }, { status: 400 });
      }

      newUserId = userData.user.id;

      // 2. Add to agenda_users mapping (Role Staff)
      const { error: mapError } = await serviceClient.from("agenda_users").insert({
          id: newUserId,
          tenant_id: tenantId,
          role: "staff", 
          is_platform_admin: false 
      });

      if (mapError) {
           console.error("Error mapping user:", mapError);
           // Cleanup? Hard to rollback auth user without more permissions usually, but we try.
           return NextResponse.json({ error: "Creado en Auth pero falló DB local" }, { status: 500 });
      }
  }

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
    user_id: newUserId // Link immediately
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
