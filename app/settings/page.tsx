import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const toggles = [
  { id: "confirm_now", label: "Confirmación inmediata", description: "Se envía al crear el turno" },
  { id: "reminder_24", label: "Recordatorio T-24", description: "24h antes" },
  { id: "reminder_2", label: "Recordatorio T-2", description: "2h antes (solo confirmados opcional)" },
];

export default function SettingsPage() {
  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-semibold">Autopiloto</h2>
          <div className="mt-6 space-y-4">
            {toggles.map((toggle) => (
              <label key={toggle.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{toggle.label}</p>
                  <p className="text-sm text-slate-500">{toggle.description}</p>
                </div>
                <input type="checkbox" defaultChecked className="h-6 w-12 rounded-full" />
              </label>
            ))}
            <div>
              <p className="font-medium">Ventana mínima de reprogramación</p>
              <Input type="number" defaultValue={4} className="mt-2 w-24" />
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-2xl font-semibold">Plantillas WhatsApp</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <article>
              <p className="font-semibold">appointment_created</p>
              <p>Hola {{1}}, turno {{2}}. Respondé 1 Confirmar · 2 Reprogramar · 3 Cancelar. STOP para salir.</p>
            </article>
            <article>
              <p className="font-semibold">reminder_24h</p>
              <p>Recordatorio {{1}} mañana {{2}}. Confirmado = 1, Reprogramar = 2, Cancelar = 3.</p>
            </article>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
