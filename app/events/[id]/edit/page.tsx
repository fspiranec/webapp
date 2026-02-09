"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type EventType = "grill" | "birthday" | "other";

type EventRow = {
  id: string;
  creator_id: string;
  title: string;
  type: EventType;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  surprise_mode: boolean;
};

export default function EditEventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("grill");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const { data: eventData, error } = await supabase
        .from("events")
        .select("id,creator_id,title,type,starts_at,ends_at,location,description,surprise_mode")
        .eq("id", eventId)
        .single();

      if (error) {
        setStatus(`❌ ${error.message}`);
        setLoading(false);
        return;
      }

      const row = eventData as EventRow;
      if (row.creator_id !== data.session.user.id) {
        setStatus("❌ Only the creator can edit this event.");
        setLoading(false);
        return;
      }

      setEvent(row);
      setTitle(row.title ?? "");
      setType(row.type ?? "grill");
      setStartsAt(row.starts_at ? new Date(row.starts_at).toISOString().slice(0, 16) : "");
      setEndsAt(row.ends_at ? new Date(row.ends_at).toISOString().slice(0, 16) : "");
      setLocation(row.location ?? "");
      setDescription(row.description ?? "");
      setLoading(false);
    });
  }, [eventId, router]);

  async function updateEvent() {
    if (!event) return;

    setSaving(true);
    setStatus("");

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const surprise_mode = type === "birthday";

      const { error } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          type,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          location: location.trim() ? location.trim() : null,
          description: description.trim() ? description.trim() : null,
          surprise_mode,
        })
        .eq("id", event.id);

      if (error) throw error;

      setStatus("✅ Event updated!");
      router.push(`/events/${event.id}`);
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <a href={`/events/${eventId}`} style={linkStyle}>← Back to event</a>
          <div style={cardStyle}>
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <a href="/events" style={linkStyle}>← Back to events</a>
          <div style={cardStyle}>
            <h2 style={{ margin: 0 }}>Event not found</h2>
            {status && <p style={{ color: "#fca5a5" }}>{status}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <a href={`/events/${eventId}`} style={linkStyle}>
          ← Back to event
        </a>

        <div style={cardStyle}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Edit event</h1>
          <p style={{ marginTop: 8, color: "rgba(229,231,235,0.8)" }}>
            Update the event details below.
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

            <Field label="End time">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
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
              onClick={updateEvent}
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
              {saving ? "Saving..." : "Save changes"}
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

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "28px auto",
  fontFamily: "system-ui",
  color: "#e5e7eb",
};

const linkStyle: React.CSSProperties = { color: "#93c5fd", textDecoration: "none" };

const cardStyle: React.CSSProperties = {
  marginTop: 14,
  borderRadius: 18,
  padding: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(17,24,39,0.65)",
  color: "#e5e7eb",
  outline: "none",
};
