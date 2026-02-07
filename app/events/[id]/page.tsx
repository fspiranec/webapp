"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function EventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<any>(null);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      if (!sessionRes.session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) {
        setErr(`${error.message} (code: ${error.code ?? "n/a"})`);
        setEvent(null);
      } else {
        setEvent(data);
      }

      setLoading(false);
    })();
  }, [eventId, router]);

  if (loading) return <p style={{ padding: 24, fontFamily: "system-ui" }}>Loading...</p>;

  if (!event) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <p><a href="/events">← Back</a></p>
        <h2>Event not found</h2>
        <p style={{ color: "crimson" }}>{err || "No error message returned."}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <p><a href="/events">← Back</a></p>
      <h1>{event.title}</h1>
      <p><b>Type:</b> {event.type} {event.surprise_mode ? "(surprise)" : ""}</p>
      {event.starts_at && <p><b>When:</b> {new Date(event.starts_at).toLocaleString()}</p>}
      {event.location && <p><b>Where:</b> {event.location}</p>}
      {event.description && <p>{event.description}</p>}
    </div>
  );
}
