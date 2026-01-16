import { Shell } from "@/components/layout/Shell";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { MicrositeSettings } from "@/components/settings/MicrositeSettings";
import { LocationsSettings } from "@/components/settings/LocationsSettings";
import { MessageLogsSettings } from "@/components/settings/MessageLogsSettings";
import { WhatsAppTemplatesSettings } from "@/components/settings/WhatsAppTemplatesSettings";
import { PaymentsSettings } from "@/components/settings/PaymentsSettings";
import { requireTenantSession } from "@/server/auth";

export default async function SettingsPage() {
  await requireTenantSession();

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-2">
        <MicrositeSettings />
        <LocationsSettings />
        <IntegrationsSettings />
        <PaymentsSettings />
        <WhatsAppTemplatesSettings />
        <MessageLogsSettings />
      </div>
    </Shell>
  );
}
