"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function EventsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? "");
      setLoading(false);
    });
  }, [router]);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) return <p style={{ padding: 24, fontFamily: "system-ui" }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Events</h1>
      <p>You are logged in as: <b>{email}</b></p>
      <button onClick={signOut}>Sign out</button>

      <hr style={{ margin: "24px 0" }} />
      <p>Next: create event + invite people + items.</p>
    </div>
  );
}
