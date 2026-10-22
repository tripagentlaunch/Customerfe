import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: copy app/.env.example to app/.env.local and fill them in."
  );
}

// Real Supabase client (not the local/prototype path js/account.js falls
// back to) — same project + auth contract as js/backend.js's remote mode
// (persistSession/autoRefreshToken/detectSessionInUrl so a magic-link
// return or a page refresh doesn't drop the session).
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
