const DEV_TENANT_SLUG = process.env.NEXT_PUBLIC_DEV_TENANT_SLUG ?? "tenant_1";

export function getTenantHeaderInfo(headerBag: Headers) {
  const host = headerBag.get("host");
  const slug = headerBag.get("x-tenant-id");
  const internalId = headerBag.get("x-tenant-internal-id");
  const isDevBypass = process.env.NODE_ENV === "development" && slug === DEV_TENANT_SLUG;
  return { slug, internalId, isDevBypass, host };
}
