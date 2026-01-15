const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Simpler env loader
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts
          .slice(1)
          .join("=")
          .trim()
          .replace(/^["'](.*)["']$/, "$1"); // strip quotes
        if (key && val && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing env vars: URL or Service Key");
  console.log("URL:", supabaseUrl ? "Found" : "Missing");
  console.log("Key:", supabaseKey ? "Found" : "Missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenants() {
  const { data, error } = await supabase
    .from("agenda_tenants")
    .select("id, name, public_slug");

  if (error) {
    console.error("Error fetching tenants:", error);
  } else {
    console.log("Tenants:", JSON.stringify(data, null, 2));

    // Also check locations just in case
    const locRes = await supabase
      .from("agenda_locations")
      .select("id, name, tenant_id")
      .limit(5);
    console.log("Sample Locations:", JSON.stringify(locRes.data, null, 2));
  }
}

checkTenants();
