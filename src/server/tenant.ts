import { headers } from "next/headers";
import { getTenantHeaderInfo } from "@/server/tenant-headers";

export function getTenantId() {
  const info = getTenantHeaderInfo(headers());
  return info.internalId ?? info.slug ?? "tenant_1";
}
