"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Stack, buttonStyle } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { gradientPageBackground, spacing } from "@/lib/uiStyles";
import { useIsMobile } from "@/lib/useIsMobile";

type InviteRow = {
  id: string;
  event_id: string;
  email: string;
  accepted: boolean;
  created_at: string;
  events?: { id: string; title: string } | null;
};

// Invite inbox for the signed-in email: accept/reject pending event invitations.
export default function InvitesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

  // Reads pending/accepted invite rows and keeps UI counters synchronized.
  async function load() {
    setLoading(true);
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.replace("/login");
      return;
    }
    const email = (sess.session.user.email ?? "").toLowerCase();
    setUserEmail(email);

    const { data, error } = await supabase
      .from("event_invites")
      .select("id,event_id,email,accepted,created_at,events:events(id,title)")
      .eq("email", email)
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`❌ ${error.message}`);
      setInvites([]);
    } else {
      setInvites((data ?? []) as any);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRsvp(inv: InviteRow, nextRsvp: "accepted" | "maybe" | "declined") {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setActingInviteId(inv.id);

    setStatus(nextRsvp === "accepted" ? "Accepting…" : "Saving RSVP…");

    const { error: inviteErr } = await supabase.rpc("accept_event_invite", {
      invite_id: inv.id,
    });

    if (inviteErr) {
      setStatus(`❌ ${inviteErr.message}`);
      setActingInviteId(null);
      return;
    }

    if (nextRsvp !== "accepted") {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (userId) {
        const { error: rsvpErr } = await supabase
          .from("event_members")
          .update({ rsvp: nextRsvp })
          .eq("event_id", inv.event_id)
          .eq("user_id", userId);
        if (rsvpErr) {
          setStatus(`⚠️ Joined, but RSVP update failed: ${rsvpErr.message}`);
          setActingInviteId(null);
          await load();
          return;
        }
      }
    }

    setStatus(
      nextRsvp === "accepted"
        ? "✅ Joined event!"
        : nextRsvp === "maybe"
          ? "✅ RSVP saved as Maybe."
          : "✅ RSVP saved as Can't attend."
    );
    await load();
    setActingInviteId(null);
    if (nextRsvp === "accepted" || nextRsvp === "maybe") {
      router.push(`/events/${inv.event_id}`);
    }
  }

  if (loading) {
    return (
      <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
        <Card>
          <Stack gap={10}>
            <div style={skeletonTitle} />
            <div style={skeletonRow} />
            <div style={skeletonRow} />
          </Stack>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
      <div
        style={{
          maxWidth: isMobile ? "100%" : 900,
          margin: "0 auto",
          fontFamily: "system-ui",
          color: "#e5e7eb",
        }}
      >
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>Invites</h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/events" style={{ color: "#93c5fd", textDecoration: "none" }}>
                ← Events
              </Link>
            </div>
          </div>

          <p style={{ marginTop: 8, color: "rgba(229,231,235,0.75)" }}>
            Accept invites sent to your email address.
          </p>
          {userEmail && (
            <p style={{ marginTop: 8, color: "rgba(229,231,235,0.65)", fontSize: 13 }}>
              Showing invites for <b style={{ color: "#e5e7eb" }}>{userEmail}</b>
            </p>
          )}

          {status && (
            <div role="status" aria-live="polite" style={statusBoxStyle(status.startsWith("✅"))}>
              {status}
            </div>
          )}

          <Stack gap={10} style={{ marginTop: spacing.sm }}>
            {invites.length === 0 ? (
              <div style={{ color: "rgba(229,231,235,0.75)" }}>No invites yet.</div>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    ...rowStyle,
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900 }}>{inv.events?.title ?? "Event"}</div>
                    <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                      {inv.accepted ? "✅ Accepted" : "Pending"} • {new Date(inv.created_at).toLocaleString()}
                    </div>
                  </div>

                  {!inv.accepted ? (
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, auto)" }}>
                      <Button
                        variant="primary"
                        onClick={() => setRsvp(inv, "accepted")}
                        disabled={actingInviteId === inv.id}
                      >
                        {actingInviteId === inv.id ? "Saving..." : "Yes"}
                      </Button>
                      <Button onClick={() => setRsvp(inv, "maybe")} disabled={actingInviteId === inv.id}>
                        Maybe
                      </Button>
                      <Button onClick={() => setRsvp(inv, "declined")} disabled={actingInviteId === inv.id}>
                        No
                      </Button>
                    </div>
                  ) : (
                    <Link
                      href={`/events/${inv.event_id}`}
                      style={{
                        ...buttonStyle("primary"),
                        textDecoration: "none",
                        display: "inline-block",
                        textAlign: "center",
                      }}
                    >
                      Open
                    </Link>
                  )}
                </div>
              ))
            )}
          </Stack>
        </Card>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: gradientPageBackground,
  padding: spacing.lg,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const skeletonTitle: React.CSSProperties = {
  height: 24,
  borderRadius: 10,
  background: "rgba(255,255,255,0.12)",
  width: "35%",
};

const skeletonRow: React.CSSProperties = {
  height: 58,
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
};

function statusBoxStyle(ok: boolean): React.CSSProperties {
  return {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}
