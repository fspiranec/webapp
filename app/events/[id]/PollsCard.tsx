"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Poll = {
  id: string;
  event_id: string;
  question: string;
  mode: "single" | "multi";
  created_by: string;
  created_at: string;
};

type Option = {
  id: string;
  poll_id: string;
  label: string;
};

type Vote = {
  id: string;
  event_id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

export default function PollsCard(props: {
  eventId: string;
  meId: string;
  isCreator: boolean;
  polls: Poll[];
  options: Option[];
  votes: Vote[];
  onReload: () => Promise<void>;
}) {
  const { eventId, meId, isCreator, polls, options, votes, onReload } = props;

  const [status, setStatus] = useState("");

  // create poll form
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [optionsText, setOptionsText] = useState("Option 1\nOption 2");

  const optionsByPoll = useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const o of options) {
      const arr = map.get(o.poll_id) ?? [];
      arr.push(o);
      map.set(o.poll_id, arr);
    }
    return map;
  }, [options]);

  const votesByOption = useMemo(() => {
    const map = new Map<string, Vote[]>();
    for (const v of votes) {
      const arr = map.get(v.option_id) ?? [];
      arr.push(v);
      map.set(v.option_id, arr);
    }
    return map;
  }, [votes]);

  const myVotesByPoll = useMemo(() => {
    const map = new Map<string, Set<string>>(); // poll_id -> set(option_id)
    for (const v of votes) {
      if (v.user_id !== meId) continue;
      const set = map.get(v.poll_id) ?? new Set<string>();
      set.add(v.option_id);
      map.set(v.poll_id, set);
    }
    return map;
  }, [votes, meId]);

  async function createPoll() {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const question = q.trim();
    const rawLines = optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!question) {
      setStatus("❌ Enter poll question");
      return;
    }
    if (rawLines.length < 2) {
      setStatus("❌ Add at least 2 options (one per line)");
      return;
    }

    setStatus("Creating poll…");

    const p = await supabase
      .from("event_polls")
      .insert({
        event_id: eventId,
        question,
        mode,
        created_by: meId,
      })
      .select("id")
      .single();

    if (p.error) {
      setStatus(`❌ ${p.error.message}`);
      return;
    }

    const pollId = p.data.id as string;

    const ins = await supabase.from("event_poll_options").insert(
      rawLines.map((label) => ({
        poll_id: pollId,
        label,
      }))
    );

    if (ins.error) {
      setStatus(`❌ ${ins.error.message}`);
      return;
    }

    setQ("");
    setOptionsText("Option 1\nOption 2");
    setMode("single");
    setStatus("✅ Poll created");
    await onReload();
  }

  async function deletePoll(pollId: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setStatus("Deleting…");
    const del = await supabase.from("event_polls").delete().eq("id", pollId).eq("event_id", eventId);
    if (del.error) {
      setStatus(`❌ ${del.error.message}`);
      return;
    }
    setStatus("✅ Deleted");
    await onReload();
  }

  async function toggleVote(pollId: string, optionId: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const r = await supabase.rpc("toggle_poll_vote", {
      p_poll_id: pollId,
      p_option_id: optionId,
    });

    if (r.error) {
      setStatus(`❌ ${r.error.message}`);
      return;
    }

    await onReload();
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Polls</h2>

      {isCreator && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Create a poll</div>

          <input
            style={inputStyle}
            placeholder="Poll question…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <select style={inputStyle} value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="single">Single choice (one answer)</option>
              <option value="multi">Multiple choice (many answers)</option>
            </select>
          </div>

          <textarea
            style={{ ...inputStyle, minHeight: 110, marginTop: 10 }}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={"Option 1\nOption 2\nOption 3"}
          />

          <button style={btnPrimary} onClick={createPoll}>
            + Create poll
          </button>
        </div>
      )}

      {status && <div style={statusBoxStyle(status.startsWith("✅"))}>{status}</div>}

      {polls.length === 0 ? (
        <div style={{ color: "rgba(229,231,235,0.75)" }}>No polls yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          {polls.map((p) => {
            const opts = optionsByPoll.get(p.id) ?? [];
            const mySet = myVotesByPoll.get(p.id) ?? new Set<string>();

            return (
              <div key={p.id} style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{p.question}</div>
                    <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)", marginTop: 4 }}>
                      Mode: <b>{p.mode.toUpperCase()}</b>
                    </div>
                  </div>

                  {isCreator && (
                    <button style={btnDangerSmall} onClick={() => deletePoll(p.id)}>
                      Delete poll
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {opts.map((o) => {
                    const v = votesByOption.get(o.id) ?? [];
                    const count = v.length;
                    const mine = mySet.has(o.id);

                    return (
                      <button
                        key={o.id}
                        onClick={() => toggleVote(p.id, o.id)}
                        style={voteBtn(mine)}
                        title="Click to vote/unvote"
                      >
                        <span style={{ fontWeight: 900 }}>{o.label}</span>
                        <span style={{ opacity: 0.8 }}>({count})</span>
                        {mine ? <span style={tag}>You voted</span> : null}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                  Tip: click the same option again to unvote. In SINGLE mode, picking another option switches your vote.
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ================= UI STYLES ================= */

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
        color: "#e5e7eb",
        fontFamily: "system-ui",
      }}
    >
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

const btnPrimary: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
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

const panel: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

function voteBtn(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: active ? "rgba(96,165,250,0.20)" : "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    cursor: "pointer",
    textAlign: "left",
  };
}

const tag: React.CSSProperties = {
  marginLeft: 10,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.18)",
  fontSize: 12,
  color: "#93c5fd",
  whiteSpace: "nowrap",
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
