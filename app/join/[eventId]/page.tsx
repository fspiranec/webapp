"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Stack, StatusBanner } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { gradientPageBackground, spacing } from "@/lib/uiStyles";

type EventRow = {
  id: string;
  title: string;
  type: string;
  starts_at?: string | null;
  location?: string | null;
  creator_name?: string | null;
};

// Public join flow reached by invite link; it validates auth state and joins via RPC.
export default function JoinByLinkPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [status, setStatus] = useState("Loading…");
  const [joining, setJoining] = useState(false);

  // Loads current user and event teaser metadata so the join confirmation has context.
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

      await supabase.rpc("touch_join_invite", { eid: eventId });

      const details = await supabase.rpc("get_join_event_details", { eid: eventId });

      if (details.error) {
        setStatus("⚠️ We couldn't load event details yet. You can still join.");
      } else {
        const row = (details.data ?? [])[0] as EventRow | undefined;
        if (row) {
          setEvent(row);
          setStatus("");
        } else {
          setStatus("⚠️ Event details unavailable. You can still join.");
        }
      }
    })();
  }, [eventId, router]);

  async function declineNow() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setJoining(true);
    setStatus("");

    const { data: sess } = await supabase.auth.getSession();
    const email = (sess.session?.user.email ?? "").toLowerCase();
    const userId = sess.session?.user.id;
    if (!email || !userId) {
      router.replace(`/login?next=${encodeURIComponent(`/join/${eventId}`)}`);
      return;
    }

    const pendingInvite = await supabase
      .from("event_invites")
      .select("id,event_id")
      .eq("event_id", eventId)
      .eq("email", email)
      .eq("accepted", false)
      .maybeSingle();

    if (pendingInvite.error || !pendingInvite.data) {
      setStatus("⚠️ We could not find a pending invite to decline.");
      setJoining(false);
      return;
    }

    const { error: inviteErr } = await supabase.rpc("accept_event_invite", {
      invite_id: pendingInvite.data.id,
    });
    if (inviteErr) {
      setStatus(`❌ ${inviteErr.message}`);
      setJoining(false);
      return;
    }

    const { error: rsvpErr } = await supabase
      .from("event_members")
      .update({ rsvp: "declined" })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (rsvpErr) {
      setStatus(`⚠️ Invite processed, but RSVP update failed: ${rsvpErr.message}`);
      setJoining(false);
      return;
    }

    setStatus("✅ You marked this invite as Can't attend.");
    setJoining(false);
    router.replace("/invites");
  }

  // Calls backend join RPC and routes to event page on success.
  async function joinNow() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setJoining(true);
    setStatus("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    const userId = user?.id;
    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent(`/join/${eventId}`)}`);
      return;
    }

    const joinRes = await supabase.rpc("join_event_via_link", { eid: eventId });

    if (joinRes.error) {
      setStatus(`❌ ${joinRes.error.message}`);
      setJoining(false);
      return;
    }

    setStatus("✅ Joined! Redirecting…");
    router.replace(`/events/${eventId}`);
  }

  return (
    <div style={pageStyle}>
      <Card style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Join event</h1>

        <p style={{ color: "rgba(229,231,235,0.75)", marginTop: 6 }}>
          Review details, then decide whether to join this event.
        </p>

        {event ? (
          <Stack gap={spacing.xs} style={{ marginTop: spacing.sm }}>
            <div style={{ color: "rgba(229,231,235,0.85)" }}>
              You are invited to join <b>{event.title}</b> ({event.type}).
            </div>
            <div style={{ color: "rgba(229,231,235,0.75)", fontSize: 13 }}>
              {event.starts_at ? `Starts: ${new Date(event.starts_at).toLocaleString()}` : "Start time: not set"}
              {event.location ? ` • Location: ${event.location}` : ""}
              {event.creator_name ? ` • Host: ${event.creator_name}` : ""}
            </div>
            <Stack gap={spacing.xs} style={actionStack}>
              <Button variant="primary" onClick={joinNow} disabled={joining} fullWidth>
                {joining ? "Joining…" : "Join now"}
              </Button>
              <Button onClick={declineNow} disabled={joining} fullWidth>
                Can't attend
              </Button>
              <Link href="/events" style={{ ...btnSecondaryLink, width: "100%" }}>Not now</Link>
            </Stack>
          </Stack>
        ) : (
          <Stack gap={spacing.xs} style={{ marginTop: spacing.sm }}>
            <div style={{ color: "rgba(229,231,235,0.85)" }}>{status}</div>
            <Button variant="primary" onClick={joinNow} disabled={joining} fullWidth>
              {joining ? "Joining…" : "Join now"}
            </Button>
          </Stack>
        )}

        {status && event ? (
          <StatusBanner
            tone={status.startsWith("✅") ? "success" : status.startsWith("❌") ? "error" : "info"}
            style={statusBox}
          >
            {status}
          </StatusBanner>
        ) : null}
      </Card>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: spacing.lg,
  background: gradientPageBackground,
  color: "#e5e7eb",
  fontFamily: "system-ui",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: 18,
};

const actionStack: React.CSSProperties = {
  gridTemplateColumns: "1fr",
};

const btnSecondaryLink: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  textDecoration: "none",
  fontWeight: 900,
  textAlign: "center",
};

const statusBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
};
