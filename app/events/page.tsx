"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string;
  type: string;
  starts_at: string | null;
  location: string | null;
  surprise_mode: boolean;
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        router.replace("/login");
        return;
      }
      setEmail(userRes.user.email ?? "");

      // fetch events where I'm a member
      const { data: memberships, error } = await supabase
        .from("event_members")
        .select("event_id, events(id,title,type,starts_at,location,surprise_mode)")
        .eq("user_id", userRes.user.id);

      if (error) {
        console.error(error);
        setEvents([]);
      } else {
        const rows =
          memberships
            ?.map((m: any) => m.events)
            .filter(Boolean) ?? [];
        setEvents(rows);
      }

      setLoading(false);
    })();
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
      <p>Logged in as <b>{email}</b></p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => router.push("/events/new")}>+ New event</button>
        <button onClick={signOut}>Sign out</button>
      </div>

      {events.length === 0 ? (
        <p>No events yet. Create one!</p>
      ) : (
        <ul>
          {events.map((e) => (
            <li key={e.id} style={{ marginBottom: 10 }}>
              <a href={`/events/${e.id}`}>
                <b>{e.title}</b>
              </a>{" "}
              — {e.type} {e.surprise_mode ? "(surprise)" : ""}
              {e.starts_at ? ` — ${new Date(e.starts_at).toLocaleString()}` : ""}
              {e.location ? ` — ${e.location}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
