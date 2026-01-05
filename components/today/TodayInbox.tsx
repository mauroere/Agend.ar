import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type TodayItem = {
  id: string;
  patient: string;
  time: string;
  status: "pending" | "confirmed" | "risk";
  action: string;
};

export function TodayInbox({ items }: { items: TodayItem[] }) {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Confirmados</p>
          <p className="text-3xl font-semibold">12</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pendientes</p>
          <p className="text-3xl font-semibold">5</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">En riesgo</p>
          <p className="text-3xl font-semibold">2</p>
        </Card>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">
                {item.time} · {item.patient}
              </p>
              <p className="text-sm text-slate-500">Último toque hace 4h</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge label={item.status} color={item.status} />
              <Button variant="outline">{item.action}</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
