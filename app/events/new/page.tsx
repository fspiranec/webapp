"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type EventType = "grill" | "birthday" | "other";

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("grill");
  const [startsAt, setStartsAt] = useState(""); // datetime-local
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // hard-check auth
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  async function createEvent() {
    setSaving(true);
    setStatus("");

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      // ✅ Use session (reliable) to ensure we're authenticated
      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const session = sessionRes.session;
      if (!session) {
        setStatus("❌ Not logged in. Please sign in again.");
        router.replace("/login");
        return;
      }

      const userId = session.user.id;

      // ✅ Ensure profile exists (required because events.creator_id references profiles.id)
      const { error: profErr } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: null,
        avatar_url: null,
      });
      if (profErr) throw profErr;

      const surprise_mode = type === "birthday";

      // ✅ Insert event
      const { data: event, error: eventErr } = await supabase
        .from("events")
        .insert({
          creator_id: userId,
          type,
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          location: location.trim() ? location.trim() : null,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          surprise_mode,
        })
        .select("id")
        .single();

      if (eventErr) throw eventErr;

      // ✅ Add creator as member
      const { error: memErr } = await supabase.from("event_members").insert({
        event_id: event.id,
        user_id: userId,
        role: "creator",
        rsvp: "accepted",
      });

      if (memErr) throw memErr;

      setStatus("✅ Event created!");
      router.push(`/events/${event.id}`);
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "28px auto",
          fontFamily: "system-ui",
          color: "#e5e7eb",
        }}
      >
        <a href="/events" style={{ color: "#93c5fd", textDecoration: "none" }}>
          ← Back to events
        </a>

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            padding: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28 }}>Create event</h1>
          <p style={{ marginTop: 8, color: "rgba(229,231,235,0.8)" }}>
            Make a grill party, birthday (surprise mode), or any event.
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Grill party at my place"
                style={inputStyle}
              />
            </Field>

            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value as EventType)} style={inputStyle}>
                <option value="grill">Grill party</option>
                <option value="birthday">Birthday (surprise)</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Date & time">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Location">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Zagreb, Jarun"
                style={inputStyle}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any notes for people..."
                style={{ ...inputStyle, minHeight: 110, resize: "vertical" as const }}
              />
            </Field>

            <button
              onClick={createEvent}
              disabled={saving || !title.trim()}
              style={{
                padding: "11px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: saving || !title.trim() ? "rgba(148,163,184,0.25)" : "linear-gradient(90deg,#60a5fa,#a78bfa)",
                color: "#0b1020",
                fontWeight: 700,
                cursor: saving || !title.trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Creating..." : "Create event"}
            </button>

            {status && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: status.startsWith("✅") ? "#86efac" : "#fca5a5",
                }}
              >
                {status}
              </div>
            )}

            <div style={{ color: "rgba(229,231,235,0.7)", fontSize: 13 }}>
              Tip: Birthday type automatically enables <b>full surprise mode</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 6, fontSize: 13, color: "rgba(229,231,235,0.75)" }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(17,24,39,0.65)",
  color: "#e5e7eb",
  outline: "none",
};
