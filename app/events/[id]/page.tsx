"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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
  created_at: string;
};

type ClaimRow = {
  id: string;
  event_item_id: string;
  user_id: string;
  created_at: string;
  profiles?: { id: string; full_name: string | null } | null;
};

export default function EventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemMode, setNewItemMode] = useState<"single" | "multi">("single");
  const [actionStatus, setActionStatus] = useState("");

  const claimsByItem = useMemo(() => {
    const map = new Map<string, ClaimRow[]>();
    for (const c of claims) {
      const arr = map.get(c.event_item_id) ?? [];
      arr.push(c);
      map.set(c.event_item_id, arr);
    }
    return map;
  }, [claims]);

  async function loadAll() {
    setErr("");
    setActionStatus("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Auth check
    const { data: sessionRes } = await supabase.auth.getSession();
    if (!sessionRes.session) {
      router.replace("/login");
      return;
    }
    const userId = sessionRes.session.user.id;
    setMe({ id: userId, email: sessionRes.session.user.email ?? "" });

    // Load event
    const evRes = await supabase.from("events").select("*").eq("id", eventId).single();
    if (evRes.error) {
      setErr(evRes.error.message);
      setLoading(false);
      return;
    }
    setEvent(evRes.data as EventRow);

    // Load items
    const itRes = await supabase
      .from("event_items")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (itRes.error) {
      setErr(itRes.error.message);
      setLoading(false);
      return;
    }
    setItems((itRes.data ?? []) as ItemRow[]);

    // Load claims (NOTE: In surprise_mode, creator will see ZERO claims due to RLS)
    const clRes = await supabase
      .from("item_claims")
      .select("id,event_item_id,user_id,created_at,profiles(id,full_name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (clRes.error) {
      // If RLS blocks, you might get empty or an error depending on policies; we’ll show message.
      setClaims([]);
    } else {
      setClaims((clRes.data ?? []) as any);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll().catch((e) => {
      setErr(e?.message ?? "Unknown error");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function addItem() {
    setActionStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const title = newItemTitle.trim();
    if (!title) return;

    const res = await supabase.from("event_items").insert({
      event_id: eventId,
      title,
      notes: newItemNotes.trim() ? newItemNotes.trim() : null,
      claim_mode: newItemMode,
    });

    if (res.error) {
      setActionStatus(`❌ ${res.error.message}`);
      return;
    }

    setNewItemTitle("");
    setNewItemNotes("");
    setNewItemMode("single");
    setActionStatus("✅ Item added");
    await loadAll();
  }

  async function claim(itemId: string) {
    setActionStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const res = await supabase.from("item_claims").insert({
      event_id: eventId,
      event_item_id: itemId,
      user_id: me.id,
    });

    if (res.error) {
      setActionStatus(`❌ ${res.error.message}`);
      return;
    }

    setActionStatus("✅ Claimed");
    await loadAll();
  }

  async function unclaim(itemId: string) {
    setActionStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const res = await supabase
      .from("item_claims")
      .delete()
      .eq("event_id", eventId)
      .eq("event_item_id", itemId)
      .eq("user_id", me.id);

    if (res.error) {
      setActionStatus(`❌ ${res.error.message}`);
      return;
    }

    setActionStatus("✅ Unclaimed");
    await loadAll();
  }

  if (loading) return <div style={pageStyle}><Card><p>Loading...</p></Card></div>;

  if (!event) {
    return (
      <div style={pageStyle}>
        <Card>
          <a href="/events" style={linkStyle}>← Back</a>
          <h2 style={{ marginTop: 10 }}>Event not found</h2>
          <p style={{ color: "#fca5a5" }}>{err || "No error message."}</p>
        </Card>
      </div>
    );
  }

  const isCreator = me?.id === event.creator_id;
  const isSurpriseCreator = event.surprise_mode && isCreator;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 880, margin: "0 auto", fontFamily: "system-ui", color: "#e5e7eb" }}>
        <a href="/events" style={linkStyle}>← Back to events</a>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 30 }}>{event.title}</h1>
              <div style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>
                <b>{event.type}</b> {event.surprise_mode ? "• 🎁 surprise mode" : ""}
              </div>
              {event.starts_at && <div style={{ marginTop: 6 }}>🗓️ {new Date(event.starts_at).toLocaleString()}</div>}
              {event.location && <div style={{ marginTop: 6 }}>📍 {event.location}</div>}
            </div>
            {me?.email && (
              <div style={{ color: "rgba(229,231,235,0.7)", fontSize: 13 }}>
                Signed in as <b>{me.email}</b>
              </div>
            )}
          </div>

          {event.description && (
            <p style={{ marginTop: 14, color: "rgba(229,231,235,0.85)" }}>{event.description}</p>
          )}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <Card>
            <h2 style={{ margin: 0, fontSize: 18 }}>Items</h2>
            <p style={{ marginTop: 6, color: "rgba(229,231,235,0.72)" }}>
              Add items people should bring (grill) or wishlist gifts (birthday).
            </p>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Item title (e.g. Burgers, Beer, Plates)"
                style={inputStyle}
              />
              <input
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Notes (optional)"
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select value={newItemMode} onChange={(e) => setNewItemMode(e.target.value as any)} style={inputStyle}>
                  <option value="single">Single claim</option>
                  <option value="multi">Multi claim</option>
                </select>

                <button
                  onClick={addItem}
                  disabled={!newItemTitle.trim()}
                  style={primaryBtnStyle(!newItemTitle.trim())}
                >
                  + Add item
                </button>
              </div>

              {actionStatus && (
                <div style={statusBoxStyle(actionStatus.startsWith("✅"))}>
                  {actionStatus}
                </div>
              )}
            </div>

            <hr style={hrStyle} />

            {items.length === 0 ? (
              <p style={{ color: "rgba(229,231,235,0.75)" }}>No items yet. Add the first one above.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((it) => {
                  const c = claimsByItem.get(it.id) ?? [];
                  const iClaimed = !!me && c.some((x) => x.user_id === me.id);

                  // For surprise creator, claims list will be empty due to RLS.
                  const claimText =
                    isSurpriseCreator
                      ? "🎁 Surprise mode: you can't see claims"
                      : c.length === 0
                        ? "No one claimed yet"
                        : it.claim_mode === "single"
                          ? `Claimed by ${displayName(c[0])}`
                          : `Claimed by ${c.map(displayName).join(", ")}`;

                  return (
                    <div key={it.id} style={itemRowStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <b style={{ fontSize: 16 }}>{it.title}</b>
                          <span style={pillStyle(it.claim_mode === "multi" ? "#34d399" : "#60a5fa")}>
                            {it.claim_mode.toUpperCase()}
                          </span>
                        </div>
                        {it.notes && <div style={{ marginTop: 6, color: "rgba(229,231,235,0.7)" }}>{it.notes}</div>}
                        <div style={{ marginTop: 8, color: "rgba(229,231,235,0.78)", fontSize: 13 }}>
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

          <Card>
            <h2 style={{ margin: 0, fontSize: 18 }}>Next</h2>
            <ul style={{ color: "rgba(229,231,235,0.8)" }}>
              <li>Invite people to event</li>
              <li>RSVP (accepted/declined)</li>
              <li>Polls</li>
              <li>Chat</li>
              <li>When someone leaves event → auto-release their claims</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function displayName(c: any) {
  return c?.profiles?.full_name || c?.user_id?.slice(0, 6) || "someone";
}

/** UI helpers */
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

const hrStyle: React.CSSProperties = { border: "none", borderTop: "1px solid rgba(255,255,255,0.12)", margin: "16px 0" };

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
