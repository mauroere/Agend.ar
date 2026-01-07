import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";

export type TenantPublicRecord = Pick<
  Database["public"]["Tables"]["agenda_tenants"]["Row"],
  "id" | "name" | "public_slug" | "custom_domain" | "public_metadata"
>;

type Identifier = {
  column: "id" | "public_slug" | "custom_domain";
  value: string;
  cacheKey: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const tenantCache = new Map<string, { tenant: TenantPublicRecord; expiresAt: number }>();

function readCache(key: string | null | undefined) {
  if (!key) return null;
  const cached = tenantCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }
  if (cached) {
    tenantCache.delete(key);
  }
  return null;
}

function writeCache(keys: (string | null | undefined)[], tenant: TenantPublicRecord) {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  keys.forEach((key) => {
    if (key) {
      tenantCache.set(key, { tenant, expiresAt });
    }
  });
}

export async function findTenantByPublicIdentifier(params: {
  id?: string | null;
  slug?: string | null;
  domain?: string | null;
}): Promise<TenantPublicRecord | null> {
  const normalizedSlug = params.slug?.trim().toLowerCase() ?? null;
  const normalizedDomain = params.domain?.trim().toLowerCase() ?? null;
  const normalizedId = params.id?.trim() ?? null;

  const cacheKeys = [
    normalizedId ? `id:${normalizedId}` : null,
    normalizedSlug ? `slug:${normalizedSlug}` : null,
    normalizedDomain ? `domain:${normalizedDomain}` : null,
  ];

  for (const key of cacheKeys) {
    const tenant = readCache(key ?? undefined);
    if (tenant) {
      return tenant;
    }
  }

  if (!serviceClient) {
    console.warn("findTenantByPublicIdentifier: service client not configured");
    return null;
  }

  const identifiers: Identifier[] = [];
  if (normalizedId) {
    identifiers.push({ column: "id", value: normalizedId, cacheKey: `id:${normalizedId}` });
  }
  if (normalizedSlug) {
    identifiers.push({ column: "public_slug", value: normalizedSlug, cacheKey: `slug:${normalizedSlug}` });
  }
  if (normalizedDomain) {
    identifiers.push({ column: "custom_domain", value: normalizedDomain, cacheKey: `domain:${normalizedDomain}` });
  }

  if (identifiers.length === 0) {
    return null;
  }

  let query = serviceClient
    .from("agenda_tenants")
    .select("id, name, public_slug, custom_domain, public_metadata")
    .limit(1);

  if (identifiers.length === 1) {
    const identifier = identifiers[0];
    query = query.eq(identifier.column, identifier.value);
  } else {
    const orFilter = identifiers.map((item) => `${item.column}.eq.${item.value}`).join(",");
    query = query.or(orFilter);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("findTenantByPublicIdentifier: query failed", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const tenant = data as TenantPublicRecord;
  writeCache(
    [
      `id:${tenant.id}`,
      tenant.public_slug ? `slug:${tenant.public_slug}` : null,
      tenant.custom_domain ? `domain:${tenant.custom_domain}` : null,
    ],
    tenant,
  );

  return tenant;
}

export async function resolveTenantIdFromPublicIdentifier(params: {
  tenantId?: string | null;
  tenantSlug?: string | null;
  domain?: string | null;
}): Promise<string | null> {
  if (params.tenantId) {
    return params.tenantId;
  }

  const tenant = await findTenantByPublicIdentifier({ slug: params.tenantSlug ?? null, domain: params.domain ?? null });
  return tenant?.id ?? null;
}
