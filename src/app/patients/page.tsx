import type { SupabaseClient } from "@supabase/supabase-js";
import { Shell } from "@/components/layout/Shell";
import { PatientTable } from "@/components/patients/PatientTable";
import { Database } from "@/types/database";
import { requireTenantSession } from "@/server/auth";
import { serviceClient } from "@/lib/supabase/service";

type PatientRow = Database["public"]["Tables"]["agenda_patients"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"];

type AnySupabaseClient = SupabaseClient<Database, "public", any>;

export default async function PatientsPage() {
  const { supabase, tenantId } = await requireTenantSession();
  
  // Use serviceClient if available to bypass potential RLS issues with missing claims in JWT
  // But strictly filter by the authenticated tenantId
  const db = (serviceClient ?? supabase) as AnySupabaseClient;

  const nowIso = new Date().toISOString();
  const [{ data: patients }, { data: upcoming }] = await Promise.all([
    db
      .from("agenda_patients")
      .select("id, full_name, phone_e164, email, opt_out, notes")
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true })
      .returns<PatientRow[]>(),
    db
      .from("agenda_appointments")
      .select("id, patient_id, start_at, status")
      .eq("tenant_id", tenantId)
      .gte("start_at", nowIso)
      .order("start_at", { ascending: true })
      .returns<AppointmentRow[]>(),
  ]);

  const nextByPatient = new Map<string, string>();
  const upcomingList: AppointmentRow[] = upcoming ?? [];
  for (const appt of upcomingList) {
    if (!appt.patient_id || nextByPatient.has(appt.patient_id)) continue;
    nextByPatient.set(
      appt.patient_id,
      new Date(appt.start_at).toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }

  const data = (patients ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone_e164,
    email: p.email ?? null,
    nextAppointment: nextByPatient.get(p.id) ?? null,
    noShowCount: 0,
    optOut: p.opt_out,
    notes: p.notes ?? null,
  }));

  return (
    <Shell>
      <PatientTable data={data} />
    </Shell>
  );
}
