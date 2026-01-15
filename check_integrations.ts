
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkIntegrations() {
  const { data, error } = await supabase
    .from("agenda_integrations")
    .select("*")
    .eq("provider", "meta_whatsapp");

  if (error) {
    console.error("Error fetching integrations:", error);
    return;
  }

  console.log("Current Integrations:", JSON.stringify(data, null, 2));
}

checkIntegrations();
