import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/database";

// Returns a browser Supabase client for app/pages. Uses the recommended helper.
export function getBrowserSupabase() {
  return createPagesBrowserClient<Database>();
}
