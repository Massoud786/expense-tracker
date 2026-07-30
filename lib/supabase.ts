import { createClient } from "@supabase/supabase-js";

// Read the Supabase project URL and public API key
// from the application's environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Create and export a reusable Supabase client
// for the entire application.
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);