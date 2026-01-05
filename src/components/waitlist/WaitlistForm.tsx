"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function WaitlistForm({ onCreated }: { onCreated?: () => void }) {
  const [patient, setPatient] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState(1);
  const [locationId, setLocationId] = useState<string>("");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLocations = locations.length > 0;
  const router = useRouter();

  const isValidE164 = (value: string) => /^\+?[1-9]\d{7,14}$/.test(value.trim());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/locations");
        const body = await res.json();
        if (res.ok) {
          setLocations(body.locations ?? []);
          setLocationId(body.locations?.[0]?.id ?? "");
        }
      } catch (e) {
        console.error("No se pudo cargar ubicaciones", e);
      }
    })();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    if (!hasLocations) {
      setError("Primero crea una ubicación en Configuración");
      setLoading(false);
      return;
    }
    if (!isValidE164(phone)) {
      setError("Teléfono debe estar en formato E.164 (+549...) y sin espacios");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient, phone, priority, location_id: locationId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "No se pudo agregar a la lista");
        return;
      }
      setPatient("");
      setPhone("");
      setPriority(1);
      router.refresh();
      onCreated?.();
    } catch (e) {
      setError("Error inesperado. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Input required placeholder="Paciente" value={patient} onChange={(e) => setPatient(e.target.value)} />
        <Input required placeholder="Teléfono E.164" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input
          required
          type="number"
          min={1}
          max={10}
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          placeholder="Prioridad"
        />
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!hasLocations}>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || !hasLocations}>
        {loading ? "Guardando..." : "Agregar a lista"}
      </Button>
    </form>
  );
}
