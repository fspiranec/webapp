"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.replace("/login");
        return;
      }

      const userId = sess.session.user.id;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      if (!error && data?.full_name) {
        // Try to prefill from "First Last"
        const parts = data.full_name.trim().split(/\s+/);
        setFirst(parts[0] ?? "");
        setLast(parts.slice(1).join(" ") ?? "");
      }

      setLoading(false);
    })();
  }, [router]);

  async function save() {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const fn = first.trim();
    const ln = last.trim();

    if (!fn || !ln) {
      setStatus("❌ Please enter first and last name");
      return;
    }

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.replace("/login");
      return;
    }

    const userId = sess.session.user.id;

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: `${fn} ${ln}`,
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    setStatus("✅ Saved!");
    router.replace("/events");
  }

  if (loading) {
    return (
      <div style={page}>
        <Card>
          <p>Loading…</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={{ maxWidth: 520, margin: "0 auto", color: "#e5e7eb", fontFamily: "system-ui" }}>
        <Card>
          <h1 style={{ marginTop: 0 }}>Your profile</h1>
          <p style={{ color: "rgba(229,231,235,0.75)" }}>
            Set your name so other people see it on claims and invites.
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <input
              placeholder="First name"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              style={input}
            />
            <input
              placeholder="Last name"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              style={input}
            />

            <button onClick={save} style={btnPrimary}>
              Save
            </button>

            {status && (
              <div style={statusBox(status.startsWith("✅"))}>
                {status}
              </div>
            )}

            <a href="/events" style={{ color: "#93c5fd", textDecoration: "none", marginTop: 8 }}>
              ← Back to events
            </a>
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

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(17,24,39,0.65)",
  color: "#e5e7eb",
  outline: "none",
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

function statusBox(ok: boolean): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}
