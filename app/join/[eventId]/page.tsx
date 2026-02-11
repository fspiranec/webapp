"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string;
  type: string;
};

export default function JoinByLinkPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [status, setStatus] = useState("Loading…");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.replace(`/login?next=${encodeURIComponent(`/join/${eventId}`)}`);
        return;
      }

      const ev = await supabase
        .from("events")
        .select("id,title,type")
        .eq("id", eventId)
        .single();

      if (ev.error || !ev.data) {
        setStatus(`❌ ${ev.error?.message ?? "Event not found"}`);
        return;
      }

      setEvent(ev.data as EventRow);
      setStatus("");
    })();
  }, [eventId, router]);

  async function joinNow() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setJoining(true);
    setStatus("");

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent(`/join/${eventId}`)}`);
      return;
    }

    const res = await supabase
      .from("event_members")
      .upsert({ event_id: eventId, user_id: userId }, { onConflict: "event_id,user_id" });

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      setJoining(false);
      return;
    }

    setStatus("✅ Joined! Redirecting…");
    router.replace(`/events/${eventId}`);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Join event</h1>

        {event ? (
          <>
            <div style={{ color: "rgba(229,231,235,0.85)", marginBottom: 14 }}>
              You are invited to join <b>{event.title}</b> ({event.type}).
            </div>
            <button onClick={joinNow} style={btnPrimary} disabled={joining}>
              {joining ? "Joining…" : "Join now"}
            </button>
          </>
        ) : (
          <div style={{ color: "rgba(229,231,235,0.85)" }}>{status}</div>
        )}

        {status && event ? (
          <div style={{ ...statusBox, color: status.startsWith("✅") ? "#86efac" : "#fca5a5" }}>{status}</div>
        ) : null}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  color: "#e5e7eb",
  fontFamily: "system-ui",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 18,
  padding: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
};

const statusBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
};
