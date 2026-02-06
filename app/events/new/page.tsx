"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"grill" | "birthday" | "other">("grill");
  const [startsAt, setStartsAt] = useState(""); // local datetime string
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, [router]);

  async function createEvent() {
    setStatus("Creating...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const surprise_mode = type === "birthday";

    // 1) Create event
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .insert({
        creator_id: user.id,
        type,
        title,
        description: description || null,
        location: location || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        surprise_mode,
      })
      .select("id")
      .single();

    if (eventErr) {
      setStatus(`❌ ${eventErr.message}`);
      return;
    }

    // 2) Add creator as member
    const { error: memErr } = await supabase.from("event_members").insert({
      event_id: event.id,
      user_id: user.id,
      role: "creator",
      rsvp: "accepted",
    });

    if (memErr) {
      setStatus(`❌ ${memErr.message}`);
      return;
    }

    setStatus("✅ Created!");
    router.push(`/events/${event.id}`);
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Create event</h1>

      <label>Title</label>
      <input style={{ width: "100%", padding: 8, margin: "6px 0 12px" }}
        value={title} onChange={(e) => setTitle(e.target.value)} />

      <label>Type</label>
      <select style={{ width: "100%", padding: 8, margin: "6px 0 12px" }}
        value={type} onChange={(e) => setType(e.target.value as any)}>
        <option value="grill">Grill party</option>
        <option value="birthday">Birthday (surprise mode)</option>
        <option value="other">Other</option>
      </select>

      <label>Date & time</label>
      <input
        type="datetime-local"
        style={{ width: "100%", padding: 8, margin: "6px 0 12px" }}
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
      />

      <label>Location</label>
      <input style={{ width: "100%", padding: 8, margin: "6px 0 12px" }}
        value={location} onChange={(e) => setLocation(e.target.value)} />

      <label>Description</label>
      <textarea style={{ width: "100%", padding: 8, margin: "6px 0 12px" }}
        value={description} onChange={(e) => setDescription(e.target.value)} />

      <button onClick={createEvent} disabled={!title.trim()}>
        Create
      </button>

      <p style={{ marginTop: 12 }}>{status}</p>

      <p style={{ marginTop: 24 }}>
        <a href="/events">← Back to events</a>
      </p>
    </div>
  );
}
