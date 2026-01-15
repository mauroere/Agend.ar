import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";
import { normalizePhoneNumber } from "@/lib/normalization";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

  let dbQuery = db
    .from("agenda_patients")
    .select("id, full_name, phone_e164")
    .eq("tenant_id", tenantId)
    .order("full_name", { ascending: true })
    .limit(limit);

  if (query) {
    dbQuery = dbQuery.or(`full_name.ilike.%${query}%,phone_e164.ilike.%${query}%`);
    const { data, error } = await dbQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ patients: data });
  }

  // If no query, fetch most recent patients from appointments
  // Strategy: Get latest appointments, extract unique patient_ids
  const { data: recentTurnos } = await db
    .from("agenda_appointments")
    .select("patient_id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  const recentIds = Array.from(new Set((recentTurnos ?? []).map((t) => t.patient_id))).slice(0, limit);

  if (recentIds.length > 0) {
    const { data: recentPatients } = await db
      .from("agenda_patients")
      .select("id, full_name, phone_e164")
      .in("id", recentIds);
    
    // Sort them back by recency (the order of recentIds)
    const sorted = recentIds
      .map(id => recentPatients?.find(p => p.id === id))
      .filter(Boolean);

    return NextResponse.json({ patients: sorted });
  }

  // Fallback if no appointments yet: return created_at desc
  const { data, error } = await db
    .from("agenda_patients")
    .select("id, full_name, phone_e164")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patients: data });
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  try {
    const body = await request.json();
    const { fullName, phone, notes } = body ?? {};

    if (!fullName || !phone) {
      return NextResponse.json({ error: "Nombre y teléfono son requeridos" }, { status: 400 });
    }

    // Normalizar el teléfono (asegurar formato e.164, usando libphonenumber via utility)
    const normalizedPhone = normalizePhoneNumber(phone);

    // Validar si ya existe
    const { data: existing } = await db
      .from("agenda_patients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_e164", normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Ya existe un paciente con ese teléfono" }, { status: 409 });
    }

    const { data, error } = await db
      .from("agenda_patients")
      .insert({
        tenant_id: tenantId,
        full_name: fullName,
        phone_e164: normalizedPhone,
        notes: notes || null,
        opt_out: false, // Default
      })
      .select()
      .single();

    if (error) {
        console.error("Error inserting patient:", error);
        return NextResponse.json({ error: `Error DB: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ patient: data });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
