import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events", 
  "https://www.googleapis.com/auth/userinfo.email"
];

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback` : "http://localhost:3000/api/integrations/google/callback";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;

  if (!CLIENT_ID) {
    return NextResponse.json({ error: "Google Client ID not configured" }, { status: 500 });
  }

  // State should ideally include an anti-CSRF token, but for now we put the tenantId/userId via cookie session in callback
  // We can pass a state to verify origin
  const state = "plataforma_agendar";

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.append("client_id", CLIENT_ID);
  url.searchParams.append("redirect_uri", REDIRECT_URI);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("scope", SCOPES.join(" "));
  url.searchParams.append("access_type", "offline"); // Crucial for refresh token
  url.searchParams.append("prompt", "consent"); // Force consent to get refresh token always
  url.searchParams.append("state", state);

  return NextResponse.json({ url: url.toString() });
}
