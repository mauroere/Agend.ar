import { Shell } from "@/components/layout/Shell";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { requireTenantSession } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireTenantSession();

  return (
    <Shell>
      <AnalyticsDashboard />
    </Shell>
  );
}
