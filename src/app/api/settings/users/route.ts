import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";

export async function GET(_request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.app_metadata.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  // 1. Get users linked to this tenant
  const { data: tenantUsers, error: dbError } = await supabase
    .from("agenda_users")
    .select("id, role, created_at")
    .eq("tenant_id", tenantId)
    .returns<Pick<Database["public"]["Tables"]["agenda_users"]["Row"], "id" | "role" | "created_at">[]>();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });
  
  if (!tenantUsers) return NextResponse.json({ users: [] });

  // 2. Enrich with email from Auth (requires service role)
  if (!serviceClient) {
    return NextResponse.json({ error: "Service client not configured" }, { status: 500 });
  }
  const client = serviceClient;

  const enrichedUsers = await Promise.all(
    tenantUsers.map(async (u) => {
      const { data: { user }, error: authError } = await client.auth.admin.getUserById(u.id);
      return {
        id: u.id,
        role: u.role,
        created_at: u.created_at,
        email: user?.email ?? "Unknown",
        last_sign_in_at: user?.last_sign_in_at,
      };
    })
  );

  return NextResponse.json({ users: enrichedUsers });
}

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.app_metadata.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  // Check if current user is owner (optional, but good practice)
  // For now, we assume any staff can invite or we skip this check to speed up.

  const body = await request.json();
  const { email, role } = body;

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!serviceClient) return NextResponse.json({ error: "Service client not configured" }, { status: 500 });

  // 1. Invite user via Supabase Auth
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: tenantId }, // Add tenant_id to user metadata immediately
  });

  if (inviteError) {
    // If user already exists, we might just want to link them?
    // For now, return error.
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const userId = inviteData.user.id;

  // 2. Add to agenda_users
  const { error: dbError } = await serviceClient
    .from("agenda_users")
    .insert({
      id: userId,
      tenant_id: tenantId,
      role: role || "staff",
    });

  if (dbError) {
    // If duplicate key, it means user is already in the tenant
    if (dbError.code === "23505") {
       return NextResponse.json({ error: "User already in tenant" }, { status: 400 });
    }
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
