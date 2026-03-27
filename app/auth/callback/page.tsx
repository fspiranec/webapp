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
        const metadataFirstName =
          (typeof user.user_metadata?.first_name === "string" && user.user_metadata.first_name.trim()) ||
          (typeof user.user_metadata?.given_name === "string" && user.user_metadata.given_name.trim()) ||
          null;
        const metadataLastName =
          (typeof user.user_metadata?.last_name === "string" && user.user_metadata.last_name.trim()) ||
          (typeof user.user_metadata?.family_name === "string" && user.user_metadata.family_name.trim()) ||
          null;
        const fallbackName =
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
          [metadataFirstName, metadataLastName].filter(Boolean).join(" ").trim() ||
          user.email ||
          "Unknown user";

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id,first_name,last_name,full_name")
          .eq("id", user.id)
          .maybeSingle();

        const profilePayload: {
          id: string;
          email: string | null;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
        } = {
          id: user.id,
          email: user.email ?? null,
        };

        // Keep user-edited profile names intact; only seed names when creating an initial profile.
        if (!existingProfile) {
          profilePayload.first_name = metadataFirstName;
          profilePayload.last_name = metadataLastName;
          profilePayload.full_name = fallbackName;
        }

        await supabase.from("profiles").upsert(profilePayload);
        router.replace(nextPath);
      } else {
        router.replace("/login");
      }
    })();
  }, [router]);

  return <p style={{ padding: 24, fontFamily: "system-ui" }}>Signing you in...</p>;
}
