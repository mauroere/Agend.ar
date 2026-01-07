import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";
import { Database } from "@/types/database";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  color: z.string().max(16).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data, error } = await db
    .from("agenda_services")
    .select("id, name, description, duration_minutes, price_minor_units, currency, color, image_url, active, sort_order")
    .eq("tenant_id", tenantId)
    .order("active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ services: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { name, description, durationMinutes, price, currency, color, imageUrl, active, sortOrder } = parsed.data;

  const payload: Database["public"]["Tables"]["agenda_services"]["Insert"] = {
    tenant_id: tenantId,
    name,
    description: description ?? null,
    duration_minutes: durationMinutes ?? 30,
    price_minor_units: typeof price === "number" ? Math.round(price * 100) : null,
    currency: (currency ?? "ARS").toUpperCase(),
    color: color ?? null,
    image_url: imageUrl ?? null,
    active: active ?? true,
    sort_order: sortOrder ?? 0,
  };

  const { error } = await db.from("agenda_services").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
