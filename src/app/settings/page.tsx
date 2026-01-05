import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { Database } from "@/types/database";
import { AutopilotSettings } from "@/components/settings/AutopilotSettings";
import { requireTenantSession } from "@/server/auth";

type LocationRow = Pick<
  Database["public"]["Tables"]["locations"]["Row"],
  "name" | "timezone" | "default_duration" | "buffer_minutes"
>;

export default async function SettingsPage() {
  const { supabase, tenantId } = await requireTenantSession();
  const { data: locations } = await supabase
    .from("locations")
    .select("name, timezone, default_duration, buffer_minutes")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  const primaryLocation = locations?.[0];

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-2">
        <AutopilotSettings />
        <Card>
          <h2 className="text-2xl font-semibold">Plantillas WhatsApp</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <article>
              <p className="font-semibold">{TEMPLATE_NAMES.appointmentCreated}</p>
              <p>
                {"Hola {{1}}, turno {{2}}. Respondé 1 Confirmar · 2 Reprogramar · 3 Cancelar. STOP para salir."}
              </p>
            </article>
            <article>
              <p className="font-semibold">{TEMPLATE_NAMES.reminder24h}</p>
              <p>{"Recordatorio {{1}} mañana {{2}}. Confirmado = 1, Reprogramar = 2, Cancelar = 3."}</p>
            </article>
            <article>
              <p className="font-semibold">{TEMPLATE_NAMES.reminder2h}</p>
              <p>{"Recordatorio {{1}} en pocas horas. Confirmado = 1, Reprogramar = 2, Cancelar = 3."}</p>
            </article>
            <article>
              <p className="font-semibold">{TEMPLATE_NAMES.waitlistOffer}</p>
              <p>{"Se liberó un turno. Respondé 1 para tomarlo o STOP para salir."}</p>
            </article>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
