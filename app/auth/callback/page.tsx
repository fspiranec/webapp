"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// OAuth callback landing page.
// It finalizes session, ensures profile row exists, then redirects to requested destination.
export default function AuthCallbackPage() {
  const router = useRouter();

  // Run once on mount to complete auth hand-off from provider redirect.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const nextPath = new URLSearchParams(window.location.search).get("next") || "/events";
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/login");
          return;
        }
      }

      const { data: sessionRes } = await supabase.auth.getSession();
      const user = sessionRes.session?.user ?? null;

      if (user) {
        const fallbackName =
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
          user.email ||
          "Unknown user";
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: fallbackName,
          email: user.email ?? null,
        });
        router.replace(nextPath);
      } else {
        router.replace("/login");
      }
    })();
  }, [router]);

  return <p style={{ padding: 24, fontFamily: "system-ui" }}>Signing you in...</p>;
}
