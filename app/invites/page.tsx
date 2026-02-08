"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type InviteRow = {
  id: string;
  event_id: string;
  email: string;
  accepted: boolean;
  created_at: string;
  events?: { id: string; title: string } | null;
};

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

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

    const { data, error } = await supabase
      .from("event_invites")
      .select("id,event_id,email,accepted,created_at,events:events(id,title)")
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

  async function accept(inv: InviteRow) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setStatus("Accepting…");

    // ✅ One RPC does everything (accept + join/rejoin)
    const { error } = await supabase.rpc("accept_event_invite", {
      invite_id: inv.id,
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    setStatus("✅ Joined event!");
    await load();
    router.push(`/events/${inv.event_id}`);
  }

  if (loading) return <div style={pageStyle}><Card>Loading…</Card></div>;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "system-ui", color: "#e5e7eb" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>Invites</h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a href="/events" style={{ color: "#93c5fd", textDecoration: "none" }}>← Events</a>
            </div>
          </div>

          <p style={{ marginTop: 8, color: "rgba(229,231,235,0.75)" }}>
            Accept invites sent to your email address.
          </p>

          {status && <div style={statusBoxStyle(status.startsWith("✅"))}>{status}</div>}

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {invites.length === 0 ? (
              <div style={{ color: "rgba(229,231,235,0.75)" }}>No invites yet.</div>
            ) : (
              invites.map((inv) => (
                <div key={inv.id} style={rowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900 }}>{inv.events?.title ?? "Event"}</div>
                    <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                      {inv.accepted ? "✅ Accepted" : "Pending"} • {new Date(inv.created_at).toLocaleString()}
                    </div>
                  </div>

                  {!inv.accepted ? (
                    <button onClick={() => accept(inv)} style={btnPrimary}>
                      Accept
                    </button>
                  ) : (
                    <a
                      href={`/events/${inv.event_id}`}
                      style={{
                        ...btnPrimary,
                        textDecoration: "none",
                        display: "inline-block",
                        textAlign: "center",
                      }}
                    >
                      Open
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 18,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
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

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
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
