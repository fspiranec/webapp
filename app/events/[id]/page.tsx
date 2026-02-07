"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/* ================= TYPES ================= */

type EventRow = {
  id: string;
  creator_id: string;
  title: string;
  type: string;
  starts_at: string | null;
  location: string | null;
  description: string | null;
  surprise_mode: boolean;
};

type ItemRow = {
  id: string;
  title: string;
  notes: string | null;
  claim_mode: "single" | "multi";
};

type ClaimRow = {
  id: string;
  event_item_id: string;
  user_id: string;
  profiles: { full_name: string | null }[]; // ✅ array
};

/* ================= PAGE ================= */

export default function EventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemMode, setNewItemMode] = useState<"single" | "multi">("single");

  async function loadAll() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.replace("/login");
      return;
    }

    setMe({ id: sess.session.user.id, email: sess.session.user.email ?? "" });

    const ev = await supabase.from("events").select("*").eq("id", eventId).single();
    if (ev.error) {
      setLoading(false);
      return;
    }
    setEvent(ev.data);

    const it = await supabase
      .from("event_items")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at");

    setItems((it.data ?? []) as any);

    const cl = await supabase
      .from("item_claims")
      .select("id,event_item_id,user_id,profiles:profiles(full_name)")
      .eq("event_id", eventId);

    setClaims((cl.data ?? []) as any);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const claimsByItem = useMemo(() => {
    const map = new Map<string, ClaimRow[]>();
    claims.forEach((c) => {
      const arr = map.get(c.event_item_id) ?? [];
      arr.push(c);
      map.set(c.event_item_id, arr);
    });
    return map;
  }, [claims]);

  function displayName(c: ClaimRow) {
    const full = c.profiles?.[0]?.full_name;
    return full ?? c.user_id.slice(0, 6);
  }

  const isCreator = me?.id === event?.creator_id;
  const hideClaims = event?.surprise_mode && isCreator;

  async function addItem() {
    if (!newItemTitle.trim()) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_items").insert({
      event_id: eventId,
      title: newItemTitle.trim(),
      notes: newItemNotes.trim() || null,
      claim_mode: newItemMode,
    });

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setNewItemTitle("");
    setNewItemNotes("");
    setNewItemMode("single");
    setStatus("✅ Item added");
    loadAll();
  }

  async function claim(itemId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const res = await supabase.from("item_claims").insert({
      event_id: eventId,
      event_item_id: itemId,
      user_id: me.id,
    });

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Claimed");
    loadAll();
  }

  async function unclaim(itemId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    await supabase
      .from("item_claims")
      .delete()
      .eq("event_item_id", itemId)
      .eq("user_id", me.id);

    setStatus("✅ Unclaimed");
    loadAll();
  }

  if (loading) return <div style={page}>Loading…</div>;
  if (!event) return <div style={page}>Event not found</div>;

  return (
    <div style={page}>
      <div style={{ maxWidth: 900, margin: "0 auto", color: "#e5e7eb" }}>
        <a href="/events" style={link}>← Back</a>

        <Card>
          <h1>{event.title}</h1>
          <p>
            {event.type} {event.surprise_mode && "🎁 Surprise"}
          </p>
          {event.starts_at && <p>🗓 {new Date(event.starts_at).toLocaleString()}</p>}
          {event.location && <p>📍 {event.location}</p>}
          {event.description && <p>{event.description}</p>}
        </Card>

        <Card>
          <h2>Items</h2>

          <div style={{ display: "grid", gap: 8 }}>
            <input placeholder="Item name" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} style={input} />
            <input placeholder="Notes" value={newItemNotes} onChange={(e) => setNewItemNotes(e.target.value)} style={input} />
            <select value={newItemMode} onChange={(e) => setNewItemMode(e.target.value as any)} style={input}>
              <option value="single">Single</option>
              <option value="multi">Multi</option>
            </select>
            <button onClick={addItem} style={btnPrimary}>Add item</button>
          </div>

          {status && <p style={{ marginTop: 10 }}>{status}</p>}

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {items.map((it) => {
              const cs = claimsByItem.get(it.id) ?? [];
              const iClaimed = cs.some((c) => c.user_id === me?.id);

              return (
                <div key={it.id} style={itemRow}>
                  <div>
                    <b>{it.title}</b> ({it.claim_mode})
                    {it.notes && <div>{it.notes}</div>}
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {hideClaims
                        ? "🎁 Surprise mode"
                        : cs.length === 0
                          ? "Not claimed yet"
                          : it.claim_mode === "single"
                            ? `Claimed by ${displayName(cs[0])}`
                            : `Claimed by ${cs.map(displayName).join(", ")}`}
                    </div>
                  </div>

                  {iClaimed ? (
                    <button onClick={() => unclaim(it.id)} style={btnDanger}>Unclaim</button>
                  ) : (
                    <button onClick={() => claim(it.id)} style={btnGhost}>Claim</button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#0b1020,#111827)",
  padding: 24,
  fontFamily: "system-ui",
};

const link: React.CSSProperties = { color: "#93c5fd", textDecoration: "none" };

const Card = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 16, marginTop: 16 }}>
    {children}
  </div>
);

const input: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(17,24,39,0.7)",
  color: "#e5e7eb",
};

const btnPrimary: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 800,
};

const btnGhost: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "rgba(255,255,255,0.1)",
  color: "#e5e7eb",
};

const btnDanger: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "rgba(248,113,113,0.2)",
  color: "#fecaca",
};

const itemRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,0.05)",
};
