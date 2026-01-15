import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback` : "http://localhost:3000/api/integrations/google/callback";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) {
      // If unauthorized, we can't save the token to a user
      return NextResponse.redirect(new URL("/login?error=auth_required", request.url));
  }
  const { db, session, tenantId } = context;

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
      return NextResponse.redirect(new URL("/settings?error=google_auth_failed", request.url));
  }

  try {
      if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Missing Google Config");

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
              code,
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET,
              redirect_uri: REDIRECT_URI,
              grant_type: "authorization_code"
          })
      });

      const tokens = await tokenRes.json();
      
      if (!tokenRes.ok) {
          console.error("Google Token Error:", tokens);
          throw new Error("Failed to exchange token");
      }

      // Get User Info (Email/Avatar)
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userData = await userRes.json();

      // Save to DB
      const { error: dbError } = await db.from("agenda_integrations").upsert({
          tenant_id: tenantId, // Fix: Use tenant_id instead of user_id, and correct table name
          provider: "google_calendar",
          credentials: {
             access_token: tokens.access_token,
             refresh_token: tokens.refresh_token,
             expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
             email: userData.email,
             img_url: userData.picture
          },
          updated_at: new Date().toISOString()
      }, { onConflict: "tenant_id, provider" } as any);

      if (dbError) throw dbError;

      return NextResponse.redirect(new URL("/settings?success=google_connected", request.url));
  } catch (e) {
      console.error(e);
      return NextResponse.redirect(new URL("/settings?error=server_error", request.url));
  }
}
