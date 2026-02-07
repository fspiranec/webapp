"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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
  created_at?: string;
};

type PollVoteRow = {
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
  polls: PollRow[];
  options: PollOptionRow[];
  votes: PollVoteRow[];
  onRefresh: () => Promise<void>;
}) {
  const { eventId, meId, isCreator, polls, options, votes, onRefresh } = props;

  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [optsText, setOptsText] = useState("Option 1\nOption 2");
  const [status, setStatus] = useState("");

  const optionsByPoll = useMemo(() => {
    const map = new Map<string, PollOptionRow[]>();
    for (const o of options) {
      const arr = map.get(o.poll_id) ?? [];
      arr.push(o);
      map.set(o.poll_id, arr);
    }
    return map;
  }, [options]);

  const votesByPoll = useMemo(() => {
    const map = new Map<string, PollVoteRow[]>();
    for (const v of votes) {
      const arr = map.get(v.poll_id) ?? [];
      arr.push(v);
      map.set(v.poll_id, arr);
    }
    return map;
  }, [votes]);

  const votesByOption = useMemo(() => {
    const map = new Map<string, PollVoteRow[]>();
    for (const v of votes) {
      const arr = map.get(v.option_id) ?? [];
      arr.push(v);
      map.set(v.option_id, arr);
    }
    return map;
  }, [votes]);

  function myVotesForPoll(pollId: string) {
    return (votesByPoll.get(pollId) ?? []).filter((v) => v.user_id === meId);
  }

  function myVotedOptionIdsForPoll(pollId: string) {
    return new Set(myVotesForPoll(pollId).map((v) => v.option_id));
  }

  async function createPoll() {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const question = q.trim();
    const lines = optsText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!question) return setStatus("❌ Enter a question");
    if (lines.length < 2) return setStatus("❌ Enter at least 2 options");

    setStatus("Creating…");

    const ins = await supabase
      .from("event_polls")
      .insert({ event_id: eventId, question, mode, created_by: meId })
      .select("id")
      .single();

    if (ins.error) return setStatus(`❌ ${ins.error.message}`);
    const pollId = ins.data.id as string;

    const payload = lines.map((label) => ({ poll_id: pollId, label }));
    const insOpt = await supabase.from("event_poll_options").insert(payload);

    if (insOpt.error) return setStatus(`❌ ${insOpt.error.message}`);

    setQ("");
    setMode("single");
    setOptsText("Option 1\nOption 2");
    setStatus("✅ Poll created");
    await onRefresh();
  }

  async function deletePoll(pollId: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setStatus("Deleting…");
    const del = await supabase.from("event_polls").delete().eq("id", pollId).eq("event_id", eventId);

    if (del.error) return setStatus(`❌ ${del.error.message}`);
    setStatus("✅ Deleted");
    await onRefresh();
  }

  async function toggleVote(poll: PollRow, optionId: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const mine = myVotesForPoll(poll.id);
    const mineSet = new Set(mine.map((v) => v.option_id));
    const already = mineSet.has(optionId);

    // If already voted this option -> unvote
    if (already) {
      const del = await supabase
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("poll_id", poll.id)
        .eq("option_id", optionId)
        .eq("user_id", meId);

      if (del.error) return setStatus(`❌ ${del.error.message}`);
      await onRefresh();
      return;
    }

    // SINGLE: remove my other votes first
    if (poll.mode === "single") {
      const delMine = await supabase
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("poll_id", poll.id)
        .eq("user_id", meId);

      if (delMine.error) return setStatus(`❌ ${delMine.error.message}`);
    }

    const ins = await supabase.from("event_poll_votes").insert({
      event_id: eventId,
      poll_id: poll.id,
      option_id: optionId,
      user_id: meId,
    });

    if (ins.error) return setStatus(`❌ ${ins.error.message}`);
    await onRefresh();
  }

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Polls</h2>

      {isCreator && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Create a poll</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Poll question…"
            style={input}
          />
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={{ ...input, marginTop: 10 }}>
            <option value="single">Single choice (one answer)</option>
            <option value="multi">Multi choice (many answers)</option>
          </select>

          <textarea
            value={optsText}
            onChange={(e) => setOptsText(e.target.value)}
            style={{ ...input, marginTop: 10, minHeight: 90 }}
          />

          <button onClick={createPoll} style={btnPrimary}>
            + Create poll
          </button>
        </div>
      )}

      {status ? <div style={statusBox(status.startsWith("✅"))}>{status}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {polls.length === 0 ? (
          <div style={{ color: "rgba(229,231,235,0.75)" }}>No polls yet.</div>
        ) : (
          polls.map((p) => {
            const opts = optionsByPoll.get(p.id) ?? [];
            const mySet = myVotedOptionIdsForPoll(p.id);

            return (
              <div key={p.id} style={pollBox}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{p.question}</div>
                    <div style={{ fontSize: 13, color: "rgba(229,231,235,0.7)", marginTop: 3 }}>
                      Mode: <b>{p.mode.toUpperCase()}</b>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(229,231,235,0.6)", marginTop: 6 }}>
                      Tip: click the same option again to unvote. In SINGLE mode, picking another option switches your vote.
                    </div>
                  </div>

                  {isCreator && (
                    <button onClick={() => deletePoll(p.id)} style={btnDangerSmall}>
                      Delete poll
                    </button>
                  )}
                </div>

                {/* ✅ OPTIONS (this is what your screenshot is missing) */}
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {opts.length === 0 ? (
                    <div style={{ color: "rgba(229,231,235,0.7)" }}>
                      No options found (check `event_poll_options`).
                    </div>
                  ) : (
                    opts.map((o) => {
                      const count = (votesByOption.get(o.id) ?? []).length;
                      const selected = mySet.has(o.id);

                      return (
                        <button
                          key={o.id}
                          onClick={() => toggleVote(p, o.id)}
                          style={optionBtn(selected)}
                        >
                          <span style={{ fontWeight: 900 }}>{o.label}</span>
                          <span style={{ opacity: 0.85 }}>({count})</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ===== styles ===== */
const card: React.CSSProperties = {
  borderRadius: 18,
  padding: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  marginTop: 14,
};

const pollBox: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const input: React.CSSProperties = {
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
  height: 36,
};

function optionBtn(selected: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: selected ? "rgba(96,165,250,0.22)" : "rgba(255,255,255,0.06)",
    color: selected ? "#bfdbfe" : "#e5e7eb",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: 700,
  };
}

function statusBox(ok: boolean): React.CSSProperties {
  return {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}
