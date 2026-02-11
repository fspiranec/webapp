"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string;
  type: string;
};

type InviteLookupRow = {
  id: string;
  accepted: boolean;
  events: EventRow[] | null;
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
      const user = sess.session?.user;
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/join/${eventId}`)}`);
        return;
      }

      const email = (user.email ?? "").trim().toLowerCase();

      if (email) {
        const inv = await supabase
          .from("event_invites")
          .select("id,accepted,events:events(id,title,type)")
          .eq("event_id", eventId)
          .eq("email", email)
          .limit(1);

        if (!inv.error) {
          const row = (inv.data ?? [])[0] as InviteLookupRow | undefined;
          const invitedEvent = row?.events?.[0];
          if (invitedEvent) {
            setEvent(invitedEvent);
            setStatus("");
            return;
          }

          if (!row) {
            await supabase.from("event_invites").insert({
              event_id: eventId,
              email,
              accepted: false,
              invited_by: user.id,
            });
          }
        }
      }

      const ev = await supabase
        .from("events")
        .select("id,title,type")
        .eq("id", eventId)
        .limit(1);

      if (ev.error) {
        setStatus("⚠️ We couldn't load event details yet. You can still join.");
      } else {
        const row = (ev.data ?? [])[0] as EventRow | undefined;
        if (row) {
          setEvent(row);
          setStatus("");
        } else {
          setStatus("⚠️ Event details unavailable. You can still join.");
        }
      }
    })();
  }, [eventId, router]);

  async function joinNow() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setJoining(true);
    setStatus("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    const userId = user?.id;
    const email = (user?.email ?? "").trim().toLowerCase();

    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent(`/join/${eventId}`)}`);
      return;
    }

    const memberRes = await supabase
      .from("event_members")
      .upsert({ event_id: eventId, user_id: userId }, { onConflict: "event_id,user_id" });

    if (memberRes.error) {
      setStatus(`❌ ${memberRes.error.message}`);
      setJoining(false);
      return;
    }

    if (email) {
      const markAccepted = await supabase
        .from("event_invites")
        .update({ accepted: true })
        .eq("event_id", eventId)
        .eq("email", email);

      if (markAccepted.error) {
        // fallback for users joining from a raw link without a pre-created invite row
        await supabase.from("event_invites").insert({
          event_id: eventId,
          email,
          accepted: true,
          invited_by: userId,
        });
      }
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
          <>
            <div style={{ color: "rgba(229,231,235,0.85)", marginBottom: 14 }}>{status}</div>
            <button onClick={joinNow} style={btnPrimary} disabled={joining}>
              {joining ? "Joining…" : "Join now"}
            </button>
          </>
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
