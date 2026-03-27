"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Stack, StatusBanner } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { gradientPageBackground, spacing } from "@/lib/uiStyles";
import { useIsMobile } from "@/lib/useIsMobile";

type EventType = "grill" | "birthday" | "other";
type TemplateKey = "blank" | "birthday-surprise" | "grill-weekend" | "team-hangout";

const EVENT_TEMPLATES: Record<
  Exclude<TemplateKey, "blank">,
  { title: string; type: EventType; description: string; location: string }
> = {
  "birthday-surprise": {
    title: "Birthday surprise party 🎉",
    type: "birthday",
    description: "Keep this event secret. Add tasks for cake, decorations, and arrival coordination.",
    location: "Host's place",
  },
  "grill-weekend": {
    title: "Weekend grill party 🔥",
    type: "grill",
    description: "Bring your favorite sides and drinks. Use the items list for shared groceries.",
    location: "Backyard / park",
  },
  "team-hangout": {
    title: "Team hangout",
    type: "other",
    description: "Casual meetup with polls for date/time and a task board for planning.",
    location: "TBD",
  },
};

// Dedicated event-creation form for richer setup than the quick-create flow.
export default function NewEventPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<TemplateKey>("blank");
  const [type, setType] = useState<EventType>("grill");
  const [startsAt, setStartsAt] = useState(""); // datetime-local
  const [endsAt, setEndsAt] = useState("");
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

  // Persists event row and redirects to detail page so creator can continue setup.
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

      const user = session.user;
      const userId = user.id;
      const fallbackName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        user.email ||
        "Unknown user";

      // ✅ Ensure profile exists (required because events.creator_id references profiles.id)
      const { error: profErr } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fallbackName,
        email: user.email ?? null,
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
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
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

  function applyTemplate(nextTemplate: TemplateKey) {
    setTemplate(nextTemplate);
    if (nextTemplate === "blank") return;
    const tpl = EVENT_TEMPLATES[nextTemplate];
    setTitle(tpl.title);
    setType(tpl.type);
    setDescription(tpl.description);
    setLocation(tpl.location);
  }

  return (
    <div style={{ minHeight: "100vh", background: gradientPageBackground, padding: isMobile ? 16 : 24 }}>
      <div
        style={{
          maxWidth: isMobile ? "100%" : 720,
          margin: "28px auto",
          fontFamily: "system-ui",
          color: "#e5e7eb",
        }}
      >
        <Link href="/events" style={{ color: "#93c5fd", textDecoration: "none" }}>
          ← Back to events
        </Link>

        <Card style={{ marginTop: spacing.sm, padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Create event</h1>
          <p style={{ marginTop: 8, color: "rgba(229,231,235,0.8)" }}>
            Make a grill party, birthday (surprise mode), or any event.
          </p>

          <Stack gap={12} style={{ marginTop: spacing.md }}>
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Grill party at my place"
                style={inputStyle}
              />
            </Field>

            <Field label="Quick template">
              <select value={template} onChange={(e) => applyTemplate(e.target.value as TemplateKey)} style={inputStyle}>
                <option value="blank">Blank event</option>
                <option value="birthday-surprise">Birthday surprise</option>
                <option value="grill-weekend">Weekend grill</option>
                <option value="team-hangout">Team hangout</option>
              </select>
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

            <Button
              variant="primary"
              onClick={createEvent}
              disabled={saving || !title.trim()}
              style={{
                background: saving || !title.trim() ? "rgba(148,163,184,0.25)" : "linear-gradient(90deg,#60a5fa,#a78bfa)",
                cursor: saving || !title.trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Creating..." : "Create event"}
            </Button>

            {status && (
              <StatusBanner tone={status.startsWith("✅") ? "success" : "error"}>
                {status}
              </StatusBanner>
            )}

            <div style={{ color: "rgba(229,231,235,0.7)", fontSize: 13 }}>
              Tip: Birthday type automatically enables <b>full surprise mode</b>.
            </div>
          </Stack>
        </Card>
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
