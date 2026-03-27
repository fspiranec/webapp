"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDateTime } from "@/lib/dateTime";
import type { PollOptionRow, PollRow, PollVoteRow } from "./event-types";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export default function PollsCard(props: {
  eventId: string;
  meId: string;
  isCreator: boolean;
  eventMemberCount: number;
  polls: PollRow[];
  options: PollOptionRow[];
  votes: PollVoteRow[];
  onReload: () => Promise<void>;
  title?: string;
  showCreatePoll?: boolean;
  showManagementActions?: boolean;
  activeOnly?: boolean;
}) {
  const {
    eventId,
    meId,
    isCreator,
    eventMemberCount,
    polls,
    options,
    votes,
    onReload,
    title = "Polls",
    showCreatePoll = true,
    showManagementActions = true,
    activeOnly = false,
  } = props;
  const canCreatePoll = showCreatePoll;

  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [rawOptions, setRawOptions] = useState("Option 1\nOption 2");
  const [status, setStatus] = useState("");
  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [profilesById, setProfilesById] = useState<Map<string, ProfileRow>>(new Map());

  const optionsByPoll = useMemo(() => {
    const m = new Map<string, PollOptionRow[]>();
    for (const o of options) {
      const arr = m.get(o.poll_id) ?? [];
      arr.push(o);
      m.set(o.poll_id, arr);
    }
    return m;
  }, [options]);

  const votesByPoll = useMemo(() => {
    const m = new Map<string, PollVoteRow[]>();
    for (const v of votes) {
      const arr = m.get(v.poll_id) ?? [];
      arr.push(v);
      m.set(v.poll_id, arr);
    }
    return m;
  }, [votes]);

  const myVotesByPoll = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const v of votes) {
      if (v.user_id !== meId) continue;
      const set = m.get(v.poll_id) ?? new Set<string>();
      set.add(v.option_id);
      m.set(v.poll_id, set);
    }
    return m;
  }, [votes, meId]);

  function normalizedMode(p: PollRow): "single" | "multi" {
    return (p.mode ?? "single").toLowerCase().includes("multi") ? "multi" : "single";
  }

  function isClosed(poll: PollRow) {
    return !!poll.closed_at;
  }

  function countVotes(pollId: string, optionId: string) {
    return (votesByPoll.get(pollId) ?? []).filter((v) => v.option_id === optionId).length;
  }

  async function loadVoterProfiles() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const ids = Array.from(new Set(votes.map((v) => v.user_id)));
    if (ids.length === 0) {
      setProfilesById(new Map());
      return;
    }

    const res = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
    if (res.error) {
      console.error(res.error);
      return;
    }

    const map = new Map<string, ProfileRow>();
    for (const r of res.data ?? []) map.set(r.id, r);
    setProfilesById(map);
  }

  useEffect(() => {
    loadVoterProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votes]);

  async function createPoll() {
    setStatus("");
    const q = question.trim();
    if (!q) return;

    const lines = rawOptions.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length < 2) {
      setStatus("❌ Add at least 2 options.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const p = await supabase
      .from("event_polls")
      .insert({ event_id: eventId, question: q, mode, created_by: meId })
      .select("id")
      .single();

    if (p.error || !p.data?.id) {
      setStatus(`❌ ${p.error?.message}`);
      return;
    }

    const optionsInsert = await supabase.from("event_poll_options").insert(lines.map((label) => ({ poll_id: p.data.id, label })));
    if (optionsInsert.error) {
      setStatus(`❌ ${optionsInsert.error.message}`);
      return;
    }

    setQuestion("");
    setRawOptions("Option 1\nOption 2");
    setMode("single");
    setStatus("✅ Poll created");
    await onReload();
  }

  async function toggleVote(poll: PollRow, optionId: string) {
    if (isClosed(poll)) {
      setStatus("❌ This poll is closed.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const pollMode = normalizedMode(poll);
    const mySet = myVotesByPoll.get(poll.id) ?? new Set<string>();
    const already = mySet.has(optionId);

    if (already) {
      await supabase.from("event_poll_votes").delete().eq("event_id", eventId).eq("poll_id", poll.id).eq("option_id", optionId).eq("user_id", meId);
      await onReload();
      return;
    }

    if (pollMode === "single") {
      await supabase.from("event_poll_votes").delete().eq("event_id", eventId).eq("poll_id", poll.id).eq("user_id", meId);
    }

    await supabase.from("event_poll_votes").insert({
      event_id: eventId,
      poll_id: poll.id,
      option_id: optionId,
      user_id: meId,
    });

    await onReload();
  }

  function canManagePoll(poll: PollRow) {
    return isCreator || poll.created_by === meId;
  }

  async function runPollAction(pollId: string, action: "close" | "reopen" | "delete") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setStatus("");
    setBusyPollId(pollId);

    const res = await supabase.rpc("manage_event_poll", { eid: eventId, target_poll_id: pollId, action });

    setBusyPollId(null);
    if (res.error) {
      setStatus(`❌ ${res.error.message}`);
      return;
    }

    setStatus(action === "delete" ? "✅ Poll deleted" : action === "close" ? "✅ Poll closed" : "✅ Poll reopened");
    await onReload();
  }

  async function closePoll(pollId: string) {
    await runPollAction(pollId, "close");
  }

  async function reopenPoll(pollId: string) {
    await runPollAction(pollId, "reopen");
  }

  async function deletePoll(pollId: string) {
    await runPollAction(pollId, "delete");
  }

  return (
    <div style={card}>
      <h2 style={{ margin: "0 0 10px" }}>{title}</h2>

      {canCreatePoll && (
        <div style={{ ...pollBox, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Create new poll</div>
          <div style={{ fontSize: 13, opacity: 0.78 }}>Anyone in the event can create a poll. Poll creators and the event creator can close or delete their polls.</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" style={inputStyle} />

            <select value={mode} onChange={(e) => setMode(e.target.value as "single" | "multi")} style={inputStyle}>
              <option value="single">Single choice</option>
              <option value="multi">Multiple choice</option>
            </select>

            <textarea
              value={rawOptions}
              onChange={(e) => setRawOptions(e.target.value)}
              placeholder="One option per line"
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            />

            <button onClick={createPoll} style={createBtn}>Create poll</button>
            {status && <div style={{ color: status.startsWith("✅") ? "#86efac" : "#fca5a5", fontSize: 13 }}>{status}</div>}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {polls.filter((p) => (activeOnly ? !isClosed(p) : true)).length === 0 && (
          <div style={{ color: "rgba(229,231,235,0.75)" }}>{activeOnly ? "No active polls." : "No polls yet."}</div>
        )}

        {polls
          .filter((p) => (activeOnly ? !isClosed(p) : true))
          .map((p) => {
          const opts = optionsByPoll.get(p.id) ?? [];
          const mySet = myVotesByPoll.get(p.id) ?? new Set<string>();
          const votedPeopleCount = new Set((votesByPoll.get(p.id) ?? []).map((v) => v.user_id)).size;
          const closed = isClosed(p);
          const disableActions = busyPollId === p.id;
          const canManage = canManagePoll(p);

          return (
            <div key={p.id} style={{ ...pollBox, opacity: disableActions ? 0.8 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{p.question}</div>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                    {votedPeopleCount}/{eventMemberCount} people voted
                    {closed ? ` • Closed ${formatDateTime(p.closed_at)}` : " • Open"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.68, marginTop: 4 }}>
                    {canManage ? "You can manage this poll." : "Only the poll creator or event creator can manage this poll."}
                  </div>
                </div>

                {showManagementActions && canManage && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {closed ? (
                      <button onClick={() => reopenPoll(p.id)} style={btnSecondary} disabled={disableActions}>
                        Reopen
                      </button>
                    ) : (
                      <button onClick={() => closePoll(p.id)} style={btnSecondary} disabled={disableActions}>
                        Close poll
                      </button>
                    )}
                    <button onClick={() => deletePoll(p.id)} style={btnDanger} disabled={disableActions}>
                      Delete poll
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {opts.map((o) => {
                  const selected = mySet.has(o.id);
                  const c = countVotes(p.id, o.id);
                  const voters = (votesByPoll.get(p.id) ?? [])
                    .filter((v) => v.option_id === o.id)
                    .map((v) => profilesById.get(v.user_id))
                    .filter(Boolean) as ProfileRow[];

                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleVote(p, o.id)}
                      disabled={closed}
                      style={{
                        ...optBtn,
                        opacity: closed ? 0.7 : 1,
                        cursor: closed ? "not-allowed" : "pointer",
                        background: selected ? "rgba(167,139,250,0.16)" : "rgba(255,255,255,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{o.label}</div>
                          {voters.length > 0 && (
                            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                              {voters.map((u) => (
                                <span key={u.id} style={{ marginRight: 10 }}>
                                  {u.first_name} {u.last_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ fontWeight: 900 }}>{c}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
          })}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  borderRadius: 18,
  padding: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#e5e7eb",
};

const pollBox: React.CSSProperties = {
  borderRadius: 16,
  padding: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const optBtn: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
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

const createBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontWeight: 800,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid rgba(248,113,113,0.32)",
  background: "rgba(127,29,29,0.35)",
  color: "#fecaca",
  fontWeight: 800,
  cursor: "pointer",
};
