import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Keep a single browser-side client instance for the entire app runtime.
// Reusing one client avoids re-creating auth listeners and keeps local auth state stable.
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  // During SSR/build, `window` does not exist.
  // Returning null here prevents accidental server-side use of browser-only auth APIs.
  if (typeof window === "undefined") return null;

  if (!browserClient) {
    // These are public, browser-safe env vars exposed by Next.js.
    // The anonymous key still relies on Supabase Row Level Security for data protection.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // Fail fast with a clear message so misconfigured environments are easy to diagnose.
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    // Create the client lazily so local tooling/build steps that never hit auth don't fail.
    browserClient = createClient(url, key);
  }

  // Existing instance for all subsequent calls.
  return browserClient;
}
