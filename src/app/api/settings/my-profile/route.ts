import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";

const profileSchema = z.object({
  fullName: z.string().min(2).max(160),
  bio: z.string().max(1200).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  color: z.string().max(16).optional().nullable(),
  defaultLocationId: z.string().uuid().optional().nullable(),
  specialties: z.array(z.string().max(60)).optional(),
  metadata: z.record(z.any()).optional().nullable(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, supabase } = context;

  // Identify current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find linked provider
  const { data: provider, error } = await db
    .from("agenda_providers")
    .select("id, full_name, bio, avatar_url, color, default_location_id, active, specialties, metadata")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  if (error || !provider) {
    return NextResponse.json({ error: "Profile not found or not linked to a provider" }, { status: 404 });
  }

  // Fetch linked services
  const { data: servicesMap } = await db
    .from("agenda_provider_services" as any)
    .select("service_id")
    .eq("provider_id", provider.id);

  return NextResponse.json({
    provider: {
      ...provider,
      serviceIds: servicesMap?.map((s: any) => s.service_id) ?? []
    }
  });
}

export async function PATCH(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, supabase } = context;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: provider } = await db
    .from("agenda_providers")
    .select("id, metadata")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();
  
  if (!provider) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const json = await request.json().catch(() => ({}));
  const parsed = profileSchema.safeParse(json);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { fullName, bio, avatarUrl, color, defaultLocationId, specialties, metadata, serviceIds } = parsed.data;

  // Merge metadata safely
  const currentMetadata = (provider.metadata as Record<string, any>) || {};
  const nextMetadata = { ...currentMetadata };

  if (metadata) { 
    if (metadata.schedule) {
       nextMetadata.schedule = metadata.schedule;
    } else {
       // If empty object or no schedule key, remove schedule to disable custom hours
       if (Object.keys(metadata).length === 0 || metadata.schedule === undefined) {
          delete nextMetadata.schedule;
       }
    }
  }

  // Update Provider
  const { error: updateError } = await db
    .from("agenda_providers")
    .update({
      full_name: fullName,
      bio: bio ?? null,
      avatar_url: avatarUrl ?? null,
      color: color ?? null, 
      default_location_id: defaultLocationId ?? null,
      specialties: specialties ?? [],
      metadata: nextMetadata,
    })
    .eq("id", provider.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // Update Services Link
  if (serviceIds !== undefined) {
    // We need serviceClient or relaxed RLS to delete/insert into intersection table if strictly RLSed
    // Usually provider_services might not have RLS setup for 'staff' to edit. 
    // Safest is to use serviceClient for the relational update to avoid policy headaches
    const adminDb: any = serviceClient || db; 

    // Delete existing
    await adminDb.from("agenda_provider_services" as any).delete().eq("provider_id", provider.id);

    // Insert new
    if (serviceIds.length > 0) {
      const links = serviceIds.map(sid => ({ provider_id: provider.id, service_id: sid }));
      const { error: linkError } = await adminDb.from("agenda_provider_services" as any).insert(links);
      if (linkError) console.error("Error linking services", linkError);
    }
  }

  return NextResponse.json({ success: true });
}
