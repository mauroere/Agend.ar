import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional().nullable(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data, error } = await db
    .from("agenda_service_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ categories: data ?? [] });
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

  const { name, color, sortOrder, active } = parsed.data;

  // Get max sort order if not provided
  let finalSortOrder = sortOrder;
  if (finalSortOrder === undefined) {
    const { data: maxData } = await db
      .from("agenda_service_categories")
      .select("sort_order")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    // Fix: cast sort_order access safely if types are acting up, 
    // or trust type inference if Database definition is correct now.
    finalSortOrder = (maxData?.sort_order ?? -1) + 1;
  }

  const { data, error } = await db
    .from("agenda_service_categories")
    .insert({
      tenant_id: tenantId,
      name,
      color,
      sort_order: finalSortOrder,
      active: active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ category: data });
}
