import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.app_metadata.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const body = await request.json();
  const { fullName, phone, notes } = body;

  if (!fullName || !phone) {
    return NextResponse.json({ error: "Name and phone required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("agenda_patients")
    // @ts-ignore
    .insert({
      tenant_id: tenantId,
      full_name: fullName,
      phone_e164: phone,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ patient: data });
}
