"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useIsMobile } from "@/lib/useIsMobile";

type EventType = "grill" | "birthday" | "other";
const EVENT_IMAGE_BUCKET = "event-images";
const MAX_EVENT_IMAGE_WIDTH = 1600;
const MAX_EVENT_IMAGE_HEIGHT = 900;

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
  cover_image_path: string | null;
};

export default function EditEventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("grill");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const coverImageUrl = useMemo(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !coverImagePath) return "";
    return supabase.storage.from(EVENT_IMAGE_BUCKET).getPublicUrl(coverImagePath).data.publicUrl;
  }, [coverImagePath]);

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
        .select("id,creator_id,title,type,starts_at,ends_at,location,description,surprise_mode,cover_image_path")
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
      setCoverImagePath(row.cover_image_path ?? null);
      setLoading(false);
    });
  }, [eventId, router]);

  async function resizeImage(file: File) {
    const imageUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not read image file"));
        el.src = imageUrl;
      });

      const scale = Math.min(MAX_EVENT_IMAGE_WIDTH / img.width, MAX_EVENT_IMAGE_HEIGHT / img.height, 1);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process image");
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error("Could not resize image");

      return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "event-cover"}.jpg`, { type: "image/jpeg" });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function uploadCoverImage(existingPath: string | null) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !event) return existingPath;

    let nextPath = existingPath;

    if (removeCoverImage && existingPath) {
      await supabase.storage.from(EVENT_IMAGE_BUCKET).remove([existingPath]);
      nextPath = null;
    }

    if (!coverImageFile) return nextPath;

    const resizedFile = await resizeImage(coverImageFile);
    const uploadPath = `${event.id}/${Date.now()}-cover.jpg`;
    const uploadRes = await supabase.storage.from(EVENT_IMAGE_BUCKET).upload(uploadPath, resizedFile, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: true,
    });

    if (uploadRes.error) throw uploadRes.error;

    if (existingPath && existingPath !== uploadPath) {
      await supabase.storage.from(EVENT_IMAGE_BUCKET).remove([existingPath]);
    }

    return uploadPath;
  }

  async function updateEvent() {
    if (!event) return;

    setSaving(true);
    setStatus("");

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const surprise_mode = type === "birthday";
      const nextCoverImagePath = await uploadCoverImage(event.cover_image_path ?? null);

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
          cover_image_path: nextCoverImagePath,
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
      <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
        <div style={{ ...containerStyle, maxWidth: isMobile ? "100%" : 720 }}>
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
      <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
        <div style={{ ...containerStyle, maxWidth: isMobile ? "100%" : 720 }}>
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
    <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
      <div style={{ ...containerStyle, maxWidth: isMobile ? "100%" : 720 }}>
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
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grill party at my place" style={inputStyle} />
            </Field>

            <Field label="Event picture">
              <div style={{ display: "grid", gap: 10 }}>
                {coverImageUrl && !removeCoverImage && (
                  <img src={coverImageUrl} alt="Event cover preview" style={previewImageStyle} />
                )}

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCoverImageFile(file);
                    if (file) setRemoveCoverImage(false);
                    if (!file && !coverImagePath) setRemoveCoverImage(false);
                  }}
                  style={inputStyle}
                />

                <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                  Recommended: landscape image, resized automatically to a max of 1600×900.
                </div>

                {(coverImagePath || coverImageFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageFile(null);
                      setRemoveCoverImage(true);
                    }}
                    style={btnGhost}
                  >
                    Remove picture
                  </button>
                )}
              </div>
            </Field>

            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value as EventType)} style={inputStyle}>
                <option value="grill">Grill party</option>
                <option value="birthday">Birthday (surprise)</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Date & time">
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="End time">
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Zagreb, Jarun" style={inputStyle} />
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any notes for people..."
                style={{ ...inputStyle, minHeight: 110, resize: "vertical" as const }}
              />
            </Field>

            <button onClick={updateEvent} disabled={saving || !title.trim()} style={saveBtnStyle(saving || !title.trim())}>
              {saving ? "Saving..." : "Save changes"}
            </button>

            {status && <div style={statusBoxStyle(status.startsWith("✅"))}>{status}</div>}

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
  color: "#e5e7eb",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  margin: "0 auto",
};

const cardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 20,
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
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

const previewImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 320,
  objectFit: "cover",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
};

const btnGhost: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
  fontWeight: 700,
  cursor: "pointer",
};

function saveBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(148,163,184,0.25)" : "linear-gradient(90deg,#60a5fa,#a78bfa)",
    color: "#0b1020",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function statusBoxStyle(ok: boolean): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}

const linkStyle: React.CSSProperties = {
  color: "#c4b5fd",
  textDecoration: "none",
};
