import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

// GET /api/bot/services?tenantId=...
export async function GET(request: NextRequest) {
  if (!serviceClient) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
  }

  // Fetch active services
  const { data: services, error } = await serviceClient
    .from("agenda_services")
    .select("id, name, duration_minutes, price_minor_units, currency")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Format for Typebot (List of options)
  const formatted = services.map(s => ({
    id: s.id,
    title: s.name,
    description: `${s.duration_minutes} min ${s.price_minor_units ? `- $${s.price_minor_units/100}` : ""}`,
    duration: s.duration_minutes
  }));

  return NextResponse.json({ 
    services: formatted,
    // Helper for Typebot "Choice" block
    rows: formatted.map(f => ({ id: f.id, title: f.title, description: f.description }))
  });
}
