import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabase/route";
import { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase() as unknown as SupabaseClient<Database>;
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerTenant = request.headers.get("x-tenant-id");
  const tenantId = tokenTenant ?? headerTenant;

  if (!auth.session || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }

  const body = await request.json();
  const { patient, phone, priority = 1, location_id } = body ?? {};

  if (!patient || !phone) {
    return NextResponse.json({ error: "Missing patient or phone" }, { status: 400 });
  }

  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  const { data: patientRow } = await supabase
    .from("patients")
    .select("id, opt_out")
    .eq("tenant_id", tenantId)
    .eq("phone_e164", normalizedPhone)
    .maybeSingle();

  const typedPatient = patientRow as Pick<Database["public"]["Tables"]["patients"]["Row"], "id" | "opt_out"> | null;

  if (typedPatient?.opt_out) {
    return NextResponse.json({ error: "Patient opted out" }, { status: 400 });
  }

  let patientId = typedPatient?.id;
  if (!patientId) {
    const { data: inserted, error: patientError } = await supabase
      .from("patients")
      .insert({ tenant_id: tenantId, full_name: patient, phone_e164: normalizedPhone, opt_out: false })
      .select("id")
      .single();
    if (patientError) return NextResponse.json({ error: patientError.message }, { status: 400 });
    patientId = (inserted as { id: string }).id;
  }

  let locationId: string | null = null;
  if (location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", location_id)
      .maybeSingle();
    locationId = (loc as { id: string } | null)?.id ?? null;
  }

  if (!locationId) {
    const { data: loc } = await supabase
      .from("locations")
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

  const { error } = await supabase
    .from("waitlist")
    .insert({ tenant_id: tenantId, location_id: locationId, patient_id: patientId, priority, active: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
