import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking WhatsApp Integrations...");
  
  // 1. Check Integrations
  const { data: integrations, error: intError } = await supabase
    .from("agenda_integrations")
    .select("tenant_id, provider, credentials, updated_at")
    .eq("provider", "meta_whatsapp");

  if (intError) {
    console.error("Error fetching integrations:", intError);
  } else {
    console.log(`Found ${integrations?.length} WhatsApp integrations.`);
    integrations?.forEach(int => {
      const creds = int.credentials as any;
      console.log(`- Tenant: ${int.tenant_id}`);
      console.log(`  Phone ID: ${creds?.phoneNumberId ? "Yes" : "MISSING"}`);
      console.log(`  Access Token: ${creds?.accessToken ? "Yes" : "MISSING"}`);
      console.log(`  Biz Account: ${creds?.businessAccountId ?? "N/A"}`);
    });
  }

  // 2. Check Notification Logs (last 5 failed)
  console.log("\nChecking recent failed notification logs...");
  const { data: logs, error: logError } = await supabase
    .from("agenda_message_log")
    .select("*")
    .eq("status", "failed") // Assuming 'failed' is a status, need to verify schema if possible, or just look at all
    .order("created_at", { ascending: false })
    .limit(5);

  if (logError) {
      console.error("Error fetching logs:", logError);
      // Try fetching recent logs generally to see structure
      const { data: allLogs } = await supabase
        .from("agenda_message_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2);
      console.log("Sample logs:", allLogs);
  } else {
      console.log(`Found ${logs?.length} recent failed logs.`);
      logs?.forEach(log => {
          console.log(`- [${log.created_at}] Type: ${log.type}, Error: ${JSON.stringify(log.metadata)}`); // metadata often holds error info
      });
  }

  // 3. Check Templates
  console.log("\nChecking Templates...");
  const { data: templates } = await supabase
    .from("agenda_message_templates")
    .select("tenant_id, name, content, meta_template_name")
    .limit(10);
  
  console.log(`Found ${templates?.length} templates.`);
  templates?.forEach(t => {
      console.log(`- Tenant: ${t.tenant_id}, Name: ${t.name}, MetaName: ${t.meta_template_name}`);
  });

}

main();
