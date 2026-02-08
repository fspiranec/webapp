"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import PollsCard from "./PollsCard";

/* ================= TYPES ================= */
type PollRow = {
  id: string;
  event_id: string;
  question: string;
  mode: "single" | "multi";
  created_by: string;
  created_at: string;
};

type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
};

type PollVoteRow = {
  id: string;
  event_id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

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
  created_by: string;
  created_at?: string;
};

type ClaimRow = {
  id: string;
  event_item_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  accepted: boolean;
  created_at: string;
};

type FriendRow = {
  id: string;
  friend_email: string;
  friend_name: string | null;
};

type MemberRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type MsgRow = {
  id: string;
  event_id: string;
  sender_id: string;
  visibility: "general" | "secret";
  body: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

/* ================= PAGE ================= */

export default function EventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);

  // Polls
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [pollOptions, setPollOptions] = useState<PollOptionRow[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVoteRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // Items
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemMode, setNewItemMode] = useState<"single" | "multi">("single");

  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMode, setEditMode] = useState<"single" | "multi">("single");

  // Invites
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");

  // Multi-invite selection
  const [selectedFriendIds, setSelectedFriendIds] = useState<Record<string, boolean>>({});
  const [bulkStatus, setBulkStatus] = useState("");

  // Delete event with password
  const [deletePw, setDeletePw] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("");

  // Leave event
  const [leaveStatus, setLeaveStatus] = useState("");

  // Chat
  const [chatTab, setChatTab] = useState<"general" | "secret">("general");
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [msgText, setMsgText] = useState("");
  const [chatStatus, setChatStatus] = useState("");

  /* ================= HELPERS ================= */

  const isCreator = me?.id === event?.creator_id;
  const hideClaims = !!event?.surprise_mode && !!isCreator;
  const isBirthday = event?.type === "birthday";

  const claimsByItem = useMemo(() => {
    const map = new Map<string, ClaimRow[]>();
    for (const c of claims) {
      const arr = map.get(c.event_item_id) ?? [];
      arr.push(c);
      map.set(c.event_item_id, arr);
    }
    return map;
  }, [claims]);

  function displayNameByUser(userId: string, fullName: string | null, email?: string | null) {
    const name = (fullName ?? "").trim();
    if (name) return name;
    const em = (email ?? "").trim();
    if (em) return em;
    return userId.slice(0, 6);
  }

  const selectedFriends = useMemo(() => {
    const ids = Object.keys(selectedFriendIds).filter((k) => selectedFriendIds[k]);
    return friends.filter((f) => ids.includes(f.id));
  }, [selectedFriendIds, friends]);

  function clearSelected() {
    setSelectedFriendIds({});
  }

  function setSelectedFriendIdsFromSelect(selectedIds: string[]) {
    setSelectedFriendIds(
      selectedIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = true;
        return acc;
      }, {})
    );
  }

  /* ================= LOAD ALL ================= */

  async function loadAll() {
    setLoading(true);
    setStatus("");
    setInviteStatus("");
    setBulkStatus("");
    setDeleteStatus("");
    setLeaveStatus("");
    setChatStatus("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

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
      setStatus(`❌ ${ev.error.message}`);
      setLoading(false);
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
      setStatus(`❌ ${it.error.message}`);
      setLoading(false);
      return;
    }
    setItems((it.data ?? []) as ItemRow[]);

    // Claims
    const cl = await supabase
      .from("item_claims")
      .select("id,event_item_id,user_id,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (cl.error) {
      setStatus(`❌ ${cl.error.message}`);
      setLoading(false);
      return;
    }

    const rawClaims = (cl.data ?? []) as { id: string; event_item_id: string; user_id: string }[];
    const claimUserIds = [...new Set(rawClaims.map((c) => c.user_id))];

    const claimProfilesMap = new Map<string, { full_name: string | null; email: string | null }>();

    if (claimUserIds.length > 0) {
      const pr = await supabase.from("profiles").select("id, full_name, email").in("id", claimUserIds);
      if (!pr.error) {
        (pr.data ?? []).forEach((p: any) => {
          if (p?.id) claimProfilesMap.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null });
        });
      }
    }

    setClaims(
      rawClaims.map((c) => {
        const prof = claimProfilesMap.get(c.user_id);
        return {
          id: c.id,
          event_item_id: c.event_item_id,
          user_id: c.user_id,
          full_name: prof?.full_name ?? null,
          email: prof?.email ?? null,
        };
      })
    );

    // Invites
    const inv = await supabase
      .from("event_invites")
      .select("id,email,accepted,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    setInvites((inv.data ?? []) as InviteRow[]);

    // Friends
    const fr = await supabase
      .from("friends")
      .select("id,friend_email,friend_name")
      .order("created_at", { ascending: false });

    const frList = (fr.data ?? []) as FriendRow[];
    setFriends(frList);

    setSelectedFriendIds((prev) => {
      const allowed = new Set(frList.map((f) => f.id));
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) if (allowed.has(k) && prev[k]) next[k] = true;
      return next;
    });

    // Members list
    const mem = await supabase.from("event_members").select("user_id").eq("event_id", eventId);
    const memberIds = (mem.data ?? []).map((m: any) => m.user_id);

    const memberProfilesMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (memberIds.length > 0) {
      const pr2 = await supabase.from("profiles").select("id, full_name, email").in("id", memberIds);
      if (!pr2.error) {
        (pr2.data ?? []).forEach((p: any) => {
          if (p?.id) memberProfilesMap.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null });
        });
      }
    }

    setMembers(
      memberIds.map((uid: string) => {
        const prof = memberProfilesMap.get(uid);
        return {
          user_id: uid,
          full_name: prof?.full_name ?? null,
          email: uid === user.id ? user.email ?? prof?.email ?? null : prof?.email ?? null,
        };
      })
    );

    // ===== POLLS (inside loadAll) =====
    const p = await supabase
      .from("event_polls")
      .select("id,event_id,question,mode,created_by,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (p.error) {
      setStatus(`❌ ${p.error.message}`);
      setPolls([]);
      setPollOptions([]);
      setPollVotes([]);
    } else {
      setPolls((p.data ?? []) as any);

      const pollIds = (p.data ?? []).map((x: any) => x.id);

      if (pollIds.length === 0) {
        setPollOptions([]);
        setPollVotes([]);
      } else {
        const o = await supabase
          .from("event_poll_options")
          .select("id,poll_id,label,created_at")
          .in("poll_id", pollIds)
          .order("created_at", { ascending: true });

        setPollOptions((o.data ?? []) as any);

        const v = await supabase
          .from("event_poll_votes")
          .select("id,event_id,poll_id,option_id,user_id,created_at")
          .eq("event_id", eventId);

        setPollVotes((v.data ?? []) as any);
      }
    }

    // Chat messages for current tab
    await loadMessages(chatTab);

    setLoading(false);
  }

  async function loadMessages(tab: "general" | "secret") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const msg = await supabase
      .from("event_messages")
      .select("id,event_id,sender_id,visibility,body,created_at")
      .eq("event_id", eventId)
      .eq("visibility", tab)
      .order("created_at", { ascending: true });

    const raw = (msg.data ?? []) as any[];
    const ids = [...new Set(raw.map((m) => m.sender_id))];

    const profilesMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (ids.length > 0) {
      const pr = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      if (!pr.error) {
        (pr.data ?? []).forEach((p: any) => {
          if (p?.id) profilesMap.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null });
        });
      }
    }

    setMessages(
      raw.map((m) => {
        const prof = profilesMap.get(m.sender_id);
        return {
          ...m,
          full_name: prof?.full_name ?? null,
          email: prof?.email ?? null,
        };
      }) as MsgRow[]
    );
  }

  useEffect(() => {
    loadAll().catch((e: any) => {
      setStatus(`❌ ${e?.message ?? "Unknown error"}`);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /* ================= ACTIONS: ITEMS ================= */

  async function addItem() {
    setStatus("");
    const title = newItemTitle.trim();
    if (!title || !me) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_items").insert({
      event_id: eventId,
      title,
      notes: newItemNotes.trim() ? newItemNotes.trim() : null,
      claim_mode: newItemMode,
      created_by: me.id,
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

  function startEdit(it: ItemRow) {
    setEditItemId(it.id);
    setEditTitle(it.title);
    setEditNotes(it.notes ?? "");
    setEditMode(it.claim_mode);
    setStatus("");
  }

  function cancelEdit() {
    setEditItemId(null);
    setEditTitle("");
    setEditNotes("");
    setEditMode("single");
  }

  async function saveEdit() {
    if (!editItemId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase
      .from("event_items")
      .update({
        title: editTitle.trim(),
        notes: editNotes.trim() ? editNotes.trim() : null,
        claim_mode: editMode,
      })
      .eq("id", editItemId)
      .eq("event_id", eventId);

    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Item updated");
    cancelEdit();
    await loadAll();
  }

  async function deleteItem(itemId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_items").delete().eq("id", itemId).eq("event_id", eventId);
    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus("✅ Item deleted");
    await loadAll();
  }

  async function claim(itemId: string) {
    setStatus("");
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
    setStatus("");
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

  /* ================= ACTIONS: INVITES ================= */

  async function sendInvite(email: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, message: "No supabase client" };

    const clean = email.trim().toLowerCase();
    if (!clean.includes("@")) return { ok: false, message: `Invalid email: ${email}` };

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return { ok: false, message: "Not logged in" };

    const res = await supabase.from("event_invites").insert({
      event_id: eventId,
      email: clean,
      invited_by: user.id,
    });

    if (res.error) {
      const msg = res.error.message.toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) return { ok: true, message: `Already invited: ${clean}` };
      return { ok: false, message: res.error.message };
    }

    return { ok: true, message: `Invited: ${clean}` };
  }

  async function sendSingleInvite() {
    setInviteStatus("");
    setBulkStatus("");

    const clean = inviteEmail.trim();
    if (!clean) {
      setInviteStatus("❌ Enter an email or choose a friend");
      return;
    }

    setInviteStatus("Sending…");
    const result = await sendInvite(clean);

    if (!result.ok) {
      setInviteStatus(`❌ ${result.message}`);
      return;
    }

    setInviteEmail("");
    setInviteStatus("✅ Invite created");
    await loadAll();
  }

  async function inviteSelectedFriends() {
    setInviteStatus("");
    setBulkStatus("");

    if (selectedFriends.length === 0) {
      setBulkStatus("❌ Select at least one friend");
      return;
    }

    setBulkStatus("Inviting selected…");

    const okMsgs: string[] = [];
    const badMsgs: string[] = [];

    for (const f of selectedFriends) {
      const r = await sendInvite(f.friend_email);
      if (r.ok) okMsgs.push(r.message);
      else badMsgs.push(`${f.friend_email}: ${r.message}`);
    }

    if (badMsgs.length === 0) {
      setBulkStatus(`✅ Invited ${okMsgs.length} friend(s)`);
      clearSelected();
    } else {
      setBulkStatus(`⚠️ Invited ${okMsgs.length}, failed ${badMsgs.length}: ${badMsgs.join(" | ")}`);
    }

    await loadAll();
  }

  async function uninvite(inviteId: string) {
    setInviteStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const res = await supabase.from("event_invites").delete().eq("id", inviteId).eq("event_id", eventId);
    if (res.error) {
      setInviteStatus(`❌ ${res.error.message}`);
      return;
    }

    setInviteStatus("✅ Uninvited");
    await loadAll();
  }

  /* ================= LEAVE EVENT ================= */

  async function leaveEvent() {
    setLeaveStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setLeaveStatus("Leaving…");
    const res = await supabase.rpc("leave_event", { eid: eventId });
    if (res.error) {
      setLeaveStatus(`❌ ${res.error.message}`);
      return;
    }

    setLeaveStatus("✅ Left event (claims released)");
    router.push("/events");
  }

  /* ================= DELETE EVENT (creator + password required) ================= */

  async function deleteEventWithPassword() {
    if (!event || !me?.email) return;

    const pw = deletePw.trim();
    if (!pw) {
      setDeleteStatus("❌ Enter your password");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setDeleteStatus("Re-authenticating…");

    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: me.email!,
      password: pw,
    });

    if (reauthErr) {
      setDeleteStatus(`❌ ${reauthErr.message}`);
      return;
    }

    setDeleteStatus("Deleting event…");
    const del = await supabase.from("events").delete().eq("id", eventId);

    if (del.error) {
      setDeleteStatus(`❌ ${del.error.message}`);
      return;
    }

    setDeleteStatus("✅ Deleted");
    router.push("/events");
  }

  /* ================= CHAT ================= */

  async function switchTab(tab: "general" | "secret") {
    setChatTab(tab);
    await loadMessages(tab);
  }

  async function sendMessage() {
    setChatStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !me) return;

    const body = msgText.trim();
    if (!body) return;

    setChatStatus("Sending…");
    const res = await supabase.from("event_messages").insert({
      event_id: eventId,
      sender_id: me.id,
      visibility: chatTab,
      body,
    });

    if (res.error) {
      setChatStatus(`❌ ${res.error.message}`);
      return;
    }

    setMsgText("");
    setChatStatus("✅ Sent");
    await loadMessages(chatTab);
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
      <div style={{ maxWidth: 980, margin: "0 auto", color: "#e5e7eb", fontFamily: "system-ui" }}>
        <a href="/events" style={linkStyle}>← Back to events</a>

        <div style={topLayout}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 28 }}>{event.title}</h1>
                <div style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>
                  {event.type} {event.surprise_mode ? "• Surprise mode" : ""}
                </div>
              </div>

              <button onClick={() => router.push(`/events/${event.id}/edit`)} style={btnGhost}>
                Edit event
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Starts</div>
                <div style={{ color: "rgba(229,231,235,0.82)" }}>
                  {event.starts_at ? new Date(event.starts_at).toLocaleString() : "Not set"}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700 }}>Location</div>
                <div style={{ color: "rgba(229,231,235,0.82)" }}>
                  {event.location || "Not set"}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700 }}>Description</div>
                <div style={{ color: "rgba(229,231,235,0.82)" }}>
                  {event.description || "No description"}
                </div>
              </div>
            </div>
          </Card>

          {isCreator && (
            <Card>
              <h2 style={{ marginTop: 0, color: "#fecaca" }}>Danger zone</h2>
              <p style={{ color: "rgba(229,231,235,0.75)" }}>Delete event (requires your password).</p>

              <input
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                placeholder="Your password"
                style={inputStyle}
              />
              <button onClick={deleteEventWithPassword} style={btnDanger}>Delete event permanently</button>

              {deleteStatus && <div style={statusBoxStyle(deleteStatus.startsWith("✅"))}>{deleteStatus}</div>}
            </Card>
          )}
        </div>

        <div style={threeColumnLayout}>
          <div style={columnStack}>
            {/* PEOPLE COMING */}
            <Card>
              <h2 style={{ marginTop: 0 }}>People coming</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {members.length === 0 ? (
                  <div style={{ color: "rgba(229,231,235,0.75)" }}>No members found.</div>
                ) : (
                  <details style={detailsStyle} open>
                    <summary style={summaryStyle}>People list ({members.length})</summary>
                    <div style={peopleListStyle}>
                      {members.map((m) => (
                        <div key={m.user_id} style={rowStyle}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900 }}>
                              {displayNameByUser(m.user_id, m.full_name, m.email)}
                              {m.user_id === event.creator_id ? " (creator)" : ""}
                              {m.user_id === me?.id ? " (you)" : ""}
                            </div>
                            {m.email ? (
                              <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>{m.email}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {!isCreator && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={leaveEvent} style={btnDanger}>Leave event</button>
                    {leaveStatus && <div style={statusBoxStyle(leaveStatus.startsWith("✅"))}>{leaveStatus}</div>}
                  </div>
                )}
              </div>

              {/* INVITES */}
              {isCreator && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ margin: 0 }}>Invites</h3>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Invite multiple friends</div>

                    {friends.length === 0 ? (
                      <div style={{ color: "rgba(229,231,235,0.75)" }}>
                        No friends yet. Add them in <a href="/profile" style={navLink}>/profile</a>.
                      </div>
                    ) : (
                      <select
                        multiple
                        value={selectedFriends.map((f) => f.id)}
                        onChange={(e) => {
                          const ids = Array.from(e.target.selectedOptions)
                            .map((opt) => opt.value)
                            .filter(Boolean);
                          setSelectedFriendIdsFromSelect(ids);
                        }}
                        style={{ ...inputStyle, minHeight: 140 }}
                      >
                        {friends.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.friend_name ? `${f.friend_name} — ${f.friend_email}` : f.friend_email}
                          </option>
                        ))}
                      </select>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      <button onClick={inviteSelectedFriends} style={btnPrimary}>
                        Invite selected ({selectedFriends.length})
                      </button>
                      <button onClick={clearSelected} style={btnGhost}>Clear selection</button>
                    </div>

                    {bulkStatus && <div style={statusBoxStyle(bulkStatus.startsWith("✅"))}>{bulkStatus}</div>}
                  </div>

                  <hr style={hrStyle} />

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="friend@email.com"
                        style={inputStyle}
                      />
                      <button onClick={sendSingleInvite} style={btnPrimary}>Send invite</button>
                    </div>

                    {inviteStatus && <div style={statusBoxStyle(inviteStatus.startsWith("✅"))}>{inviteStatus}</div>}
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    {invites.length === 0 ? (
                      <div style={{ color: "rgba(229,231,235,0.75)" }}>No invites yet.</div>
                    ) : (
                      <details style={detailsStyle}>
                        <summary style={summaryStyle}>
                          Invited people ({invites.length})
                        </summary>
                        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                          {invites.map((inv) => (
                            <div key={inv.id} style={rowStyle}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900 }}>{inv.email}</div>
                                <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                                  {inv.accepted ? "✅ Accepted" : "Pending"} • {new Date(inv.created_at).toLocaleString()}
                                </div>
                              </div>

                              <button style={btnDangerSmall} onClick={() => uninvite(inv.id)}>Uninvite</button>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </Card>

          </div>

          <div style={columnStack}>
            {/* ITEMS */}
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

                {status && <div style={statusBoxStyle(status.startsWith("✅"))}>{status}</div>}
              </div>

              <hr style={hrStyle} />

              {items.length === 0 ? (
                <p style={{ color: "rgba(229,231,235,0.75)" }}>No items yet. Add the first one above.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {items.map((it) => {
                    const cs = claimsByItem.get(it.id) ?? [];
                    const iClaimed = !!me && cs.some((c) => c.user_id === me.id);
                    const canEdit = !!me && (it.created_by === me.id || isCreator);

                    const claimText = hideClaims
                      ? "🎁 Surprise mode: creator can’t see claims"
                      : cs.length === 0
                        ? "Not claimed yet"
                        : it.claim_mode === "single"
                          ? `Claimed by ${displayNameByUser(cs[0].user_id, cs[0].full_name, cs[0].email)}`
                          : `Claimed by ${cs.map((c) => displayNameByUser(c.user_id, c.full_name, c.email)).join(", ")}`;

                    const editing = editItemId === it.id;

                    return (
                      <div key={it.id} style={itemRowStyle}>
                        <div style={{ flex: 1 }}>
                          {editing ? (
                            <div style={{ display: "grid", gap: 8 }}>
                              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle} />
                              <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={inputStyle} />
                              <select value={editMode} onChange={(e) => setEditMode(e.target.value as any)} style={inputStyle}>
                                <option value="single">Single claim</option>
                                <option value="multi">Multi claim</option>
                              </select>

                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button style={btnPrimary} onClick={saveEdit}>Save</button>
                                <button style={btnGhost} onClick={cancelEdit}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <b style={{ fontSize: 16 }}>{it.title}</b>
                                <span style={pillStyle(it.claim_mode === "multi" ? "#34d399" : "#60a5fa")}>
                                  {it.claim_mode.toUpperCase()}
                                </span>
                                {canEdit ? (
                                  <span style={{ fontSize: 12, color: "rgba(229,231,235,0.7)" }}>(you can edit)</span>
                                ) : null}
                              </div>

                              {it.notes && (
                                <div style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>{it.notes}</div>
                              )}

                              <div style={{ marginTop: 8, color: "rgba(229,231,235,0.82)", fontSize: 13 }}>
                                {claimText}
                              </div>
                            </>
                          )}
                        </div>

                        {!editing && (
                          <div style={itemActionRow}>
                            {!iClaimed ? (
                              <button onClick={() => claim(it.id)} style={smallBtnStyle}>Claim</button>
                            ) : (
                              <button onClick={() => unclaim(it.id)} style={smallBtnDangerStyle}>Unclaim</button>
                            )}

                            {canEdit && (
                              <>
                                <button onClick={() => startEdit(it)} style={btnGhostSmall}>Edit</button>
                                <button onClick={() => deleteItem(it.id)} style={btnDangerSmall}>Delete</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* POLLS */}
          <div style={columnStack}>
            {me && (
              <PollsCard
                eventId={eventId}
                meId={me.id}
                isCreator={!!isCreator}
                polls={polls}
                options={pollOptions}
                votes={pollVotes}
                onReload={loadAll}
              />
            )}
          </div>
        </div>

        {/* CHAT */}
        <Card>
          <h2 style={{ marginTop: 0 }}>Chat</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => switchTab("general")} style={chatTab === "general" ? btnPrimary : btnGhost}>
              General
            </button>

            {isBirthday && (
              <button onClick={() => switchTab("secret")} style={chatTab === "secret" ? btnPrimary : btnGhost}>
                Secret (creator can’t read)
              </button>
            )}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={chatBox}>
              {messages.length === 0 ? (
                <div style={{ color: "rgba(229,231,235,0.7)" }}>No messages yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                      <b>{displayNameByUser(m.sender_id, m.full_name, m.email)}</b> •{" "}
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div style={{ marginTop: 3 }}>{m.body}</div>
                  </div>
                ))
              )}
            </div>

            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Write a message…"
              style={{ ...inputStyle, minHeight: 90 }}
            />

            <button style={btnPrimary} onClick={sendMessage}>Send</button>

            {chatStatus && <div style={statusBoxStyle(chatStatus.startsWith("✅"))}>{chatStatus}</div>}
          </div>
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

const navLink: React.CSSProperties = { color: "#93c5fd", textDecoration: "none", marginRight: 10 };
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

const itemActionRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const topLayout: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 0.9fr)",
  alignItems: "start",
};

const threeColumnLayout: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 0.85fr)",
  alignItems: "start",
};

const columnStack: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const detailsStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  padding: 10,
};

const peopleListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 12,
  maxHeight: 320,
  overflowY: "auto",
  paddingRight: 2,
};

const summaryStyle: React.CSSProperties = {
  cursor: "pointer",
  fontWeight: 800,
  color: "#e5e7eb",
  listStyle: "none",
};

const chatBox: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 12,
  minHeight: 220,
  maxHeight: 320,
  overflowY: "auto",
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

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(248,113,113,0.18)",
  color: "#fecaca",
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 10,
};

const btnGhostSmall: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

const btnDangerSmall: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(248,113,113,0.18)",
  color: "#fecaca",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

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
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}
