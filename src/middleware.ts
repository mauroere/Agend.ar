import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { findTenantByPublicIdentifier } from "@/server/tenant-routing";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/register",
  "/api/auth/register",
  "/api/webhooks/whatsapp",
  "/api/repair",
  "/book",
  "/api/public",
];

const DEV_TENANT_SLUG = process.env.NEXT_PUBLIC_DEV_TENANT_SLUG ?? "tenant_1";
const DEV_TENANT_ID = process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? null;

type TenantResolution = {
  slug: string | null;
  id: string | null;
};

let cachedDevTenant: TenantResolution | null = null;

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function resolveDevTenant(): Promise<TenantResolution> {
  if (cachedDevTenant) return cachedDevTenant;
  if (DEV_TENANT_ID) {
    cachedDevTenant = { slug: DEV_TENANT_SLUG, id: DEV_TENANT_ID };
    return cachedDevTenant;
  }
  const tenant = await findTenantByPublicIdentifier({ slug: DEV_TENANT_SLUG });
  cachedDevTenant = { slug: DEV_TENANT_SLUG, id: tenant?.id ?? null };
  return cachedDevTenant;
}

async function resolveTenantFromHost(host: string | null): Promise<TenantResolution | null> {
  if (!host) {
    return resolveDevTenant();
  }

  const normalizedHost = host.toLowerCase().split(":")[0];

  if (
    normalizedHost.startsWith("localhost") ||
    normalizedHost.startsWith("127.") ||
    normalizedHost === "[::1]"
  ) {
    return resolveDevTenant();
  }

  const segments = normalizedHost.split(".");
  const slugCandidate = segments.length >= 3 && segments[0] !== "www" ? segments[0] : null;

  const tenant = await findTenantByPublicIdentifier({ domain: normalizedHost, slug: slugCandidate });
  if (!tenant) {
    return null;
  }
  return { slug: tenant.public_slug ?? slugCandidate ?? null, id: tenant.id };
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname, host } = req.nextUrl;
  
  // 1. Resolve Tenant first
  const tenantResolution = await resolveTenantFromHost(host);

  // 2. Tenant Subdomain Rewrite Logic
  // If we are at root "/" and have a VALID tenant (with ID), rewrite to booking page.
  // This effectively makes "/" a public path for tenants (e.g. prueba2.agend.ar loads the book page).
  if (tenantResolution?.slug && tenantResolution?.id && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${tenantResolution.slug}`;
    const rewriteRes = NextResponse.rewrite(url);
    if (tenantResolution.id) rewriteRes.headers.set("x-tenant-internal-id", tenantResolution.id);
    rewriteRes.headers.set("x-tenant-id", tenantResolution.slug);
    return rewriteRes;
  }

  const isPublic = isPublicPath(pathname);

  // 3. Auth Check
  if (!isPublic && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 4. Inject headers
  if (tenantResolution?.slug) {
    res.headers.set("x-tenant-id", tenantResolution.slug);
  }
  if (tenantResolution?.id) {
    res.headers.set("x-tenant-internal-id", tenantResolution.id);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
