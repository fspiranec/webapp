"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const nextPath = new URLSearchParams(window.location.search).get("next") || "/events";

      const { data } = await supabase.auth.getUser();
      const user = data.user;

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
