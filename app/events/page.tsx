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
      setEmail(sess.session.user.email ?? "");

      const { data, error } = await supabase
        .from("event_members")
        .select("event_id, events(id,title,type,starts_at,location,surprise_mode)")
        .eq("user_id", sess.session.user.id);

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

  if (loading) return <div style={page}><Card>Loading…</Card></div>;

  return (
    <div style={page}>
      <div style={{ maxWidth: 880, margin: "0 auto", fontFamily: "system-ui", color: "#e5e7eb" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0 }}>Your events</h1>
              <div style={{ color: "rgba(229,231,235,0.75)", marginTop: 6 }}>
                Logged in as <b>{email}</b>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={btnPrimary} onClick={() => router.push("/events/new")}>+ New event</button>
              <button style={btnGhost} onClick={signOut}>Sign out</button>
            </div>
          </div>

          {err && <p style={{ color: "#fca5a5" }}>❌ {err}</p>}

          <div style={{ marginTop: 14 }}>
            {events.length === 0 ? (
              <p style={{ color: "rgba(229,231,235,0.75)" }}>No events yet. Create one!</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {events.map((e) => (
                  <a key={e.id} href={`/events/${e.id}`} style={eventRow}>
                    <div style={{ fontWeight: 800 }}>{e.title}</div>
                    <div style={{ color: "rgba(229,231,235,0.75)", fontSize: 13 }}>
                      {e.type} {e.surprise_mode ? "• 🎁 surprise" : ""}
                      {e.starts_at ? ` • ${new Date(e.starts_at).toLocaleString()}` : ""}
                      {e.location ? ` • ${e.location}` : ""}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
    }}>
      {children}
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 800,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 800,
  cursor: "pointer",
};

const eventRow: React.CSSProperties = {
  display: "block",
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  textDecoration: "none",
  color: "#e5e7eb",
};
