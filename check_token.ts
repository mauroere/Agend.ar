
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkToken() {
  const { data, error } = await supabase
    .from("agenda_integrations")
    .select("credentials")
    .eq("provider", "meta_whatsapp")
    .single();

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  const creds = data.credentials as any;
  console.log("AccessToken start:", creds.accessToken.substring(0, 10));
  console.log("AccessToken end:", creds.accessToken.substring(creds.accessToken.length - 10));
}

checkToken();
