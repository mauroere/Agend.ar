import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/webhooks/whatsapp",
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

export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasSession = Boolean(request.cookies.get("sb-access-token"));

  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const tenantId = resolveTenantId(host);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
