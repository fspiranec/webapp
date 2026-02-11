"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/events";

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
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
  }, [router, nextPath]);

  return <p style={{ padding: 24, fontFamily: "system-ui" }}>Signing you in...</p>;
}
