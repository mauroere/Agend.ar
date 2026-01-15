import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;

  if (!context.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await request.json();

  if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true, message: `Switching to ${tenantId}` });
  
  // Set a session cookie via headers - strictly used by our tenant-context logic
  // Max-age: 1 hour for security
  response.cookies.set("agendar-impersonate-tenant", tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600 
  });

  return response;
}

export async function DELETE(request: NextRequest) {
   // Logic to clear the cookie
   const response = NextResponse.json({ success: true });
   response.cookies.delete("agendar-impersonate-tenant");
   return response;
}
