import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { fullName, phone, optOut, notes } = body as {
    fullName?: string;
    phone?: string;
    optOut?: boolean;
    notes?: string | null;
  };

  if (!fullName && !phone && typeof optOut === "undefined" && typeof notes === "undefined") {
    return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (fullName) {
    updates.full_name = fullName;
  }

  if (typeof optOut === "boolean") {
    updates.opt_out = optOut;
  }

  if (typeof notes !== "undefined") {
    const trimmed = typeof notes === "string" ? notes.trim() : notes;
    updates.notes = trimmed ? trimmed : null;
  }

  if (phone) {
    const normalizedPhone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;
    const { data: existing } = await db
      .from("agenda_patients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_e164", normalizedPhone)
      .neq("id", params.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Otra ficha ya usa ese teléfono" }, { status: 409 });
    }

    updates.phone_e164 = normalizedPhone;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay campos válidos" }, { status: 400 });
  }

  const { data, error } = await db
    .from("agenda_patients")
    .update(updates)
    .eq("tenant_id", tenantId)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating patient", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ patient: data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data: blockingAppt } = await db
    .from("agenda_appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("patient_id", params.id)
    .gte("start_at", new Date().toISOString())
    .limit(1);

  if (Array.isArray(blockingAppt) && blockingAppt.length > 0) {
    return NextResponse.json({ error: "No podés eliminar pacientes con turnos futuros" }, { status: 409 });
  }

  const { error } = await db
    .from("agenda_patients")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", params.id);

  if (error) {
    console.error("Error deleting patient", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
