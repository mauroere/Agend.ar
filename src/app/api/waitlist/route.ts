import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";
import { getTenantHeaderInfo } from "@/server/tenant-headers";

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase() as unknown as SupabaseClient<Database>;
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerInfo = getTenantHeaderInfo(request.headers as Headers);
  const tenantId = tokenTenant ?? headerInfo.internalId;

  if (!auth.session || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (headerInfo.internalId && tokenTenant && headerInfo.internalId !== tokenTenant && !headerInfo.isDevBypass) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }

  // Use serviceClient for DB operations to bypass RLS in dev/mismatch scenarios
  const db = serviceClient ?? supabase;

  const body = await request.json();
  const { patient, phone, priority = 1, location_id } = body ?? {};

  if (!patient || !phone) {
    return NextResponse.json({ error: "Missing patient or phone" }, { status: 400 });
  }

  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  const { data: patientRow } = await db
    .from("agenda_patients")
    .select("id, opt_out")
    .eq("tenant_id", tenantId)
    .eq("phone_e164", normalizedPhone)
    .maybeSingle();

  const typedPatient = patientRow as Pick<Database["public"]["Tables"]["agenda_patients"]["Row"], "id" | "opt_out"> | null;

  if (typedPatient?.opt_out) {
    return NextResponse.json({ error: "Patient opted out" }, { status: 400 });
  }

  let patientId = typedPatient?.id;
  if (!patientId) {
    const { data: inserted, error: patientError } = await db
      .from("agenda_patients")
      .insert({ tenant_id: tenantId, full_name: patient, phone_e164: normalizedPhone, opt_out: false })
      .select("id")
      .single();
    if (patientError) return NextResponse.json({ error: patientError.message }, { status: 400 });
    patientId = (inserted as { id: string }).id;
  }

  let locationId: string | null = null;
  if (location_id) {
    const { data: loc } = await db
      .from("agenda_locations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", location_id)
      .maybeSingle();
    locationId = (loc as { id: string } | null)?.id ?? null;
  }

  if (!locationId) {
    const { data: loc } = await db
      .from("agenda_locations")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();
    locationId = (loc as { id: string } | null)?.id ?? null;
  }

  if (!locationId) {
    return NextResponse.json({ error: "Debe crear una ubicación primero" }, { status: 400 });
  }

  const { error } = await db
    .from("agenda_waitlist")
    .insert({ tenant_id: tenantId, location_id: locationId, patient_id: patientId, priority, active: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
