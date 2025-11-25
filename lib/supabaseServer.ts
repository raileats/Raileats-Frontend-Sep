// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Basic safety check
if (!url) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL for Supabase");
}
if (!serviceKey) {
  throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY for Supabase service client");
}

// ✅ Server-side Supabase client (no auth session, service role key)
export const serviceClient = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
  },
});
