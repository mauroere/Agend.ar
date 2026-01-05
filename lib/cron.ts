import { CRON_SECRET_HEADER } from "@/lib/constants";

export function assertCronSecret(headers: Headers) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new Error("CRON_SECRET is not configured");
  }

  const received = headers.get(CRON_SECRET_HEADER);
  if (received !== expected) {
    throw new Error("Invalid cron secret");
  }
}
