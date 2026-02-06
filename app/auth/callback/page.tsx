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
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (user) {
        await supabase.from("profiles").upsert({ id: user.id });
        router.replace("/events");
      } else {
        router.replace("/login");
      }
    })();
  }, [router]);

  return <p style={{ padding: 24, fontFamily: "system-ui" }}>Signing you in...</p>;
}
