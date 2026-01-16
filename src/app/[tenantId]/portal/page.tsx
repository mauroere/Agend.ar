import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serviceClient } from "@/lib/supabase/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "./_components/SignOutButton";
import { AppointmentCard } from "./_components/AppointmentCard";

export const dynamic = "force-dynamic";

export default async function PortalDashboard({ params }: { params: { tenantId: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/${params.tenantId}/portal/login`);
  }

  const userEmail = session.user.email;
  // Use serviceClient to bypass RLS, trusting the session email match
  if (!serviceClient) throw new Error("Service client missing");

  // 1. Find Patient
  const { data: patient } = await serviceClient
    .from("agenda_patients")
    .select("id, full_name, phone_e164")
    .eq("tenant_id", params.tenantId)
    .eq("email", userEmail!)
    .limit(1)
    .maybeSingle();

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
            <CardHeader>
                <CardTitle>Cuenta no encontrada</CardTitle>
                <CardDescription>
                    Estás logueado como <strong>{userEmail}</strong>, pero no encontramos historial médico en esta clínica con ese email.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <p className="text-sm text-slate-500">
                    Si ya tenés turnos, asegurate de que en la clínica hayan guardado tu email correctamente.
                 </p>
                 <Link href={`/${params.tenantId}`}>
                    <Button className="w-full">Reservar mi primer turno</Button>
                 </Link>
                 <SignOutButton />
            </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Find Appointments
  const { data: appointments } = await serviceClient
    .from("agenda_appointments")
    .select(`
        id, 
        start_at, 
        end_at, 
        status, 
        service_name,
        location:agenda_locations(name, address)
    `)
    .eq("patient_id", patient.id)
    .order("start_at", { ascending: false })
    .returns<any[]>();

  const now = new Date();
  const upcoming = (appointments ?? []).filter(a => new Date(a.start_at) >= now && a.status !== 'canceled');
  const past = (appointments ?? []).filter(a => new Date(a.start_at) < now || a.status === 'canceled');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
       {/* Header */}
       <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
              <h1 className="font-bold text-lg text-slate-800">Mis Turnos</h1>
              <SignOutButton variant="ghost" size="sm" />
          </div>
       </header>

       <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Profile Card */}
          <Card>
             <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {patient.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                   <h2 className="font-semibold text-lg">{patient.full_name}</h2>
                   <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Smartphone className="w-3 h-3" /> {patient.phone_e164}
                   </div>
                </div>
             </CardContent>
          </Card>

          {/* New Bookings CTA */}
          <Link href={`/${params.tenantId}`} className="block">
              <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-lg shadow-md rounded-xl">
                 + Reservar nuevo turno
              </Button>
          </Link>

          {/* Upcoming */}
          <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 px-1">Próximos Turnos</h3>
              {upcoming.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-slate-400">No tenés turnos programados.</p>
                  </div>
              ) : (
                  <div className="grid gap-4">
                      {upcoming.map((appt: any) => (
                          <AppointmentCard key={appt.id} appt={appt} />
                      ))}
                  </div>
              )}
          </section>

          {/* Past */}
          {past.length > 0 && (
             <section className="opacity-75">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 px-1 mt-8">Historial</h3>
                <div className="grid gap-3 opacity-75">
                    {past.map((appt: any) => (
                        <AppointmentCard key={appt.id} appt={appt} isPast />
                    ))}
                </div>
             </section>
          )}

       </main>
    </div>
  );
}
