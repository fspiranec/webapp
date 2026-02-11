"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type PollRow = {
  id: string;
  event_id: string;
  question: string;
  mode?: string | null;
  created_by: string;
  created_at?: string | null;
};

type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  created_at?: string | null;
};

type PollVoteRow = {
  id: string;
  event_id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export default function PollsCard(props: {
  eventId: string;
  meId: string;
  isCreator: boolean;
  polls: PollRow[];
  options: PollOptionRow[];
  votes: PollVoteRow[];
  onReload: () => Promise<void>;
}) {
  const { eventId, meId, isCreator, polls, options, votes, onReload } = props;

  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [rawOptions, setRawOptions] = useState("Option 1\nOption 2");
  const [status, setStatus] = useState("");

  const [profilesById, setProfilesById] = useState<Map<string, ProfileRow>>(new Map());

  /* ---------- data maps ---------- */

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

  /* ---------- helpers ---------- */

  function normalizedMode(p: PollRow): "single" | "multi" {
    return (p.mode ?? "single").toLowerCase().includes("multi") ? "multi" : "single";
  }

  function countVotes(pollId: string, optionId: string) {
    return (votesByPoll.get(pollId) ?? []).filter((v) => v.option_id === optionId).length;
  }

  /* ---------- load voter profiles ---------- */

  async function loadVoterProfiles() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const ids = Array.from(new Set(votes.map((v) => v.user_id)));
    if (ids.length === 0) {
      setProfilesById(new Map());
      return;
    }

    const res = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", ids);

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

  /* ---------- actions ---------- */

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

    const optionsInsert = await supabase.from("event_poll_options").insert(
      lines.map((label) => ({ poll_id: p.data.id, label }))
    );

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
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const pollMode = normalizedMode(poll);
    const mySet = myVotesByPoll.get(poll.id) ?? new Set<string>();
    const already = mySet.has(optionId);

    if (already) {
      await supabase
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("poll_id", poll.id)
        .eq("option_id", optionId)
        .eq("user_id", meId);

      await onReload();
      return;
    }

    if (pollMode === "single") {
      await supabase
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("poll_id", poll.id)
        .eq("user_id", meId);
    }

    await supabase.from("event_poll_votes").insert({
      event_id: eventId,
      poll_id: poll.id,
      option_id: optionId,
      user_id: meId,
    });

    await onReload();
  }

  /* ---------- UI ---------- */

  return (
    <div style={card}>
      <h2>Polls</h2>

      {isCreator && (
        <div style={{ ...pollBox, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Create new poll</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Question"
              style={inputStyle}
            />

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
        {polls.map((p) => {
          const opts = optionsByPoll.get(p.id) ?? [];
          const mySet = myVotesByPoll.get(p.id) ?? new Set<string>();

          return (
            <div key={p.id} style={pollBox}>
              <div style={{ fontWeight: 900 }}>{p.question}</div>

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
                      style={{
                        ...optBtn,
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

/* ---------- styles ---------- */

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
  cursor: "pointer",
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
