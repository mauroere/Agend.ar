import { Shell } from "@/components/layout/Shell";
import { PatientTable } from "@/components/patients/PatientTable";
import { Database } from "@/types/database";
import { requireTenantSession } from "@/server/auth";
import { getTenantId } from "@/server/tenant";

type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export default async function PatientsPage() {
  const { supabase, tenantId } = await requireTenantSession();

  const nowIso = new Date().toISOString();
  const [{ data: patients }, { data: upcoming }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, phone_e164, opt_out")
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true })
      .returns<PatientRow[]>(),
    supabase
      .from("appointments")
      .select("id, patient_id, start_at, status")
      .eq("tenant_id", tenantId)
      .gte("start_at", nowIso)
      .order("start_at", { ascending: true })
      .returns<AppointmentRow[]>(),
  ]);

  const nextByPatient = new Map<string, string>();
  const upcomingList: AppointmentRow[] = (upcoming ?? []) as AppointmentRow[];
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
    nextAppointment: nextByPatient.get(p.id) ?? null,
    noShowCount: 0,
    optOut: p.opt_out,
  }));

  return (
    <Shell>
      <PatientTable data={data} />
    </Shell>
  );
}
