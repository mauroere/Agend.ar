"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

export type LocationOption = { id: string; name: string };

export function LocationSwitcher({ locations, activeId }: { locations: LocationOption[]; activeId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("location", value);
      router.push(`?${params.toString()}`);
    });
  }

  if (locations.length <= 1) return null;

  return (
    <Select value={activeId} onChange={(e) => handleChange(e.target.value)} disabled={pending}>
      {locations.map((loc) => (
        <option key={loc.id} value={loc.id}>
          {loc.name}
        </option>
      ))}
    </Select>
  );
}
