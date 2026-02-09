"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useIsMobile } from "@/lib/useIsMobile";

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
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.replace("/login");
        return;
      }
      const user = sess.session.user;
      setEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("event_members")
        .select("event_id, events(id,title,type,starts_at,location,surprise_mode)")
        .eq("user_id", user.id);

      if (error) {
        setErr(error.message);
        setEvents([]);
      } else {
        const list = (data ?? []).map((x: any) => x.events).filter(Boolean);
        setEvents(list);
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

  if (loading) {
    return (
      <div style={{ ...page, padding: isMobile ? 16 : 24 }}>
        <Shell isMobile={isMobile}>
          <Card>
            <div style={{ color: "rgba(229,231,235,0.8)" }}>Loading…</div>
          </Card>
        </Shell>
      </div>
    );
  }

  return (
    <div style={{ ...page, padding: isMobile ? 16 : 24 }}>
      <Shell isMobile={isMobile}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 34 }}>Your events</h1>
              <div style={{ color: "rgba(229,231,235,0.75)", marginTop: 6 }}>
                Logged in as <b style={{ color: "#e5e7eb" }}>{email}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button style={btnPrimary} onClick={() => router.push("/events/new")}>
                + New event
              </button>

              <button style={btnGhost} onClick={() => router.push("/invites")}>
                Invites
              </button>

              <button style={btnGhost} onClick={() => router.push("/profile")}>
                Profile
              </button>

              <button style={btnGhost} onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>

          {err && <div style={statusBox(false)}>❌ {err}</div>}

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {events.length === 0 ? (
              <div style={{ color: "rgba(229,231,235,0.75)" }}>
                No events yet. Create one!
              </div>
            ) : (
              events.map((e) => (
                <a key={e.id} href={`/events/${e.id}`} style={eventRow}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{e.title}</div>
                  <div style={{ color: "rgba(229,231,235,0.75)", fontSize: 13, marginTop: 4 }}>
                    {e.type}
                    {e.surprise_mode ? " • 🎁 surprise" : ""}
                    {e.starts_at ? ` • ${new Date(e.starts_at).toLocaleString()}` : ""}
                    {e.location ? ` • ${e.location}` : ""}
                  </div>
                </a>
              ))
            )}
          </div>
        </Card>
      </Shell>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Shell({ children, isMobile }: { children: React.ReactNode; isMobile: boolean }) {
  return (
    <div
      style={{
        maxWidth: isMobile ? "100%" : 980,
        margin: "0 auto",
        paddingTop: isMobile ? 20 : 40,
        fontFamily: "system-ui",
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 20,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        color: "#e5e7eb",
        backdropFilter: "blur(10px)",
      }}
    >
      {children}
    </div>
  );
}

/* ================= STYLES ================= */

const page: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(900px 500px at 50% 0%, rgba(124,58,237,0.45), transparent 60%), linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
};

const eventRow: React.CSSProperties = {
  display: "block",
  padding: 14,
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  textDecoration: "none",
  color: "#e5e7eb",
};

function statusBox(ok: boolean): React.CSSProperties {
  return {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}
