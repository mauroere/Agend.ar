import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn("Supabase service client is not fully configured.");
}

export const serviceClient = url && serviceKey
  ? createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    })
  : null;
