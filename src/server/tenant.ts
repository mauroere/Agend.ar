import { headers } from "next/headers";

export function getTenantId() {
  const tenant = headers().get("x-tenant-id");
  return tenant ?? "tenant_1";
}
