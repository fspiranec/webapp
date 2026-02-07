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
  event_id: string;
  title: string;
  notes: string | null;
  claim_mode: "single" | "multi";
  created_at?: string;
};

type ClaimRow = {
  id: string;
  event_item_id: string;
  user_id: string;
  full_name: string | null; // ✅ manual join result
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

  /* ================= HELPERS ================= */

  const claimsByItem = useMemo(() => {
    const map = new Map<string, ClaimRow[]>();
    for (const c of claims) {
      const arr = map.get(c.event_item_id) ?? [];
      arr.push(c);
      map.set(c.event_item_id, arr);
    }
    return map;
  }, [claims]);

  function displayName(c: ClaimRow) {
    return c.full_name ?? c.user_id.slice(0, 6);
  }

  const isCreator = me?.id === event?.creator_id;
  const hideClaims = !!event?.surprise_mode && !!isCreator;

  /* ================= DATA LOAD ================= */

  async function loadAll() {
    setLoading(true);
    setStatus("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Session
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.replace("/login");
      return;
    }
    const user = sess.session.user;
    setMe({ id: user.id, email: user.email ?? "" });

    // Event
    const ev = await supabase.from("events").select("*").eq("id", eventId).single();
    if (ev.error) {
      setLoading(false);
      setStatus(`❌ ${ev.error.message}`);
      return;
    }
    setEvent(ev.data as EventRow);

    // Items
    const it = await supabase
      .from("event_items")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (it.error) {
      setLoading(false);
      setStatus(`❌ ${it.error.message}`);
      return;
    }
    setItems((it.data ?? []) as ItemRow[]);

    // Claims (manual join for names)
    const cl = await supabase
      .from("item_claims")
      .select("id,event_item_id,user_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    // Surprise mode: creator may see 0 rows due to RLS (that's expected)
    const rawClaims = (cl.data ?? []) as { id: string; event_item_id: string; user_id: string }[];

    const userIds = [...new Set(rawClaims.map((c) => c.user_id))];
    const profilesMap = new Map<string, string>();

    if (userIds.length > 0) {
      const pr = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      (pr.data ?? []).forEach((p: any) => {
        if (p?.id && p?.full_name) profilesMap.set(p.id, p.full_name);
      });
    }

    const mergedClaims: ClaimRow[] = rawClaims.map((c) => ({
      id: c.id,
      event_item_id: c.event_item_id,
      user_id: c.user_id,
      full_name: profilesMap.get(c.user_id) ?? null,
    }));

    setClaims(mergedClaims);

    setLoading(false);
  }

  useEffect(() => {
    loadAll().catch((e: any) => {
      setStatus(`❌ ${e?.message ?? "Unknown error"}`);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /* ================= ACTIONS ================= */

  async function addItem() {
    const title = newItemTitle.trim();
    if (!title) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_items").insert({
      event_id: eventId,
      title,
      notes: newItemNotes.trim() ? newItemNotes.trim() : null,
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
    await loadAll();
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
    await loadAll();
  }

  async function unclaim(itemId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const res = await supabase
      .from("item_claims")
      .delete()
      .eq("event_id", eventId)
      .eq("event_item_id", itemId)
      .eq("user_id", me.id);

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Unclaimed");
    await loadAll();
  }

  /* ================= UI ================= */

  if (loading) return <div style={pageStyle}><Card><p>Loading…</p></Card></div>;

  if (!event) {
    return (
      <div style={pageStyle}>
        <Card>
          <a href="/events" style={linkStyle}>← Back</a>
          <h2 style={{ marginTop: 10 }}>Event not found</h2>
          {status && <p style={{ color: "#fca5a5" }}>{status}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 900, margin: "0 auto", color: "#e5e7eb", fontFamily: "system-ui" }}>
        <a href="/events" style={linkStyle}>← Back to events</a>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0 }}>{event.title}</h1>
              <div style={{ color: "rgba(229,231,235,0.75)", marginTop: 6 }}>
                <b>{event.type}</b> {event.surprise_mode ? "• 🎁 surprise mode" : ""}
              </div>
              {event.starts_at && <div style={{ marginTop: 6 }}>🗓 {new Date(event.starts_at).toLocaleString()}</div>}
              {event.location && <div style={{ marginTop: 6 }}>📍 {event.location}</div>}
            </div>
            {me?.email && (
              <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                Signed in as <b>{me.email}</b>
              </div>
            )}
          </div>

          {event.description && <p style={{ marginTop: 12, color: "rgba(229,231,235,0.85)" }}>{event.description}</p>}
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>Items</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Item name (e.g. Beer, Burgers, Plates)"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Notes (optional)"
              value={newItemNotes}
              onChange={(e) => setNewItemNotes(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select value={newItemMode} onChange={(e) => setNewItemMode(e.target.value as any)} style={inputStyle}>
                <option value="single">Single claim</option>
                <option value="multi">Multi claim</option>
              </select>

              <button onClick={addItem} disabled={!newItemTitle.trim()} style={primaryBtnStyle(!newItemTitle.trim())}>
                + Add item
              </button>
            </div>

            {status && (
              <div style={statusBoxStyle(status.startsWith("✅"))}>
                {status}
              </div>
            )}
          </div>

          <hr style={hrStyle} />

          {items.length === 0 ? (
            <p style={{ color: "rgba(229,231,235,0.75)" }}>No items yet. Add the first one above.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((it) => {
                const cs = claimsByItem.get(it.id) ?? [];
                const iClaimed = !!me && cs.some((c) => c.user_id === me.id);

                const claimText = hideClaims
                  ? "🎁 Surprise mode: creator can’t see claims"
                  : cs.length === 0
                    ? "Not claimed yet"
                    : it.claim_mode === "single"
                      ? `Claimed by ${displayName(cs[0])}`
                      : `Claimed by ${cs.map(displayName).join(", ")}`; // ✅ multi-claim shows all names

                return (
                  <div key={it.id} style={itemRowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <b style={{ fontSize: 16 }}>{it.title}</b>
                        <span style={pillStyle(it.claim_mode === "multi" ? "#34d399" : "#60a5fa")}>
                          {it.claim_mode.toUpperCase()}
                        </span>
                      </div>
                      {it.notes && <div style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>{it.notes}</div>}
                      <div style={{ marginTop: 8, color: "rgba(229,231,235,0.82)", fontSize: 13 }}>
                        {claimText}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {!iClaimed ? (
                        <button onClick={() => claim(it.id)} style={smallBtnStyle}>
                          Claim
                        </button>
                      ) : (
                        <button onClick={() => unclaim(it.id)} style={smallBtnDangerStyle}>
                          Unclaim
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 18,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        marginTop: 14,
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

const linkStyle: React.CSSProperties = { color: "#93c5fd", textDecoration: "none", fontFamily: "system-ui" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(17,24,39,0.65)",
  color: "#e5e7eb",
  outline: "none",
};

const hrStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.12)",
  margin: "16px 0",
};

const itemRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

function pillStyle(color: string): React.CSSProperties {
  return {
    fontSize: 12,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    color,
    background: "rgba(0,0,0,0.15)",
  };
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(148,163,184,0.25)" : "linear-gradient(90deg,#60a5fa,#a78bfa)",
    color: "#0b1020",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const smallBtnStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(96,165,250,0.16)",
  color: "#bfdbfe",
  cursor: "pointer",
  fontWeight: 700,
};

const smallBtnDangerStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(248,113,113,0.16)",
  color: "#fecaca",
  cursor: "pointer",
  fontWeight: 700,
};

function statusBoxStyle(ok: boolean): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}
