import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/register",
  "/api/webhooks/whatsapp",
  "/api/repair",
];

function resolveTenantId(host: string | null): string {
  if (!host) return "tenant_1";
  const lower = host.toLowerCase();
  if (lower.startsWith("localhost") || lower.startsWith("127.")) {
    return "tenant_1";
  }
  const parts = lower.split(".");
  if (parts.length < 3) return "tenant_1";
  const subdomain = parts[0];
  if (!subdomain || subdomain === "www") return "tenant_1";
  return subdomain;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname, host } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!isPublic && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const tenantId = resolveTenantId(host);
  res.headers.set("x-tenant-id", tenantId);

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
