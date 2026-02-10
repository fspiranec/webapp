"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type PollRow = {
  id: string;
  event_id: string;
  question: string;
  mode?: string | null; // tolerate different schemas
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

  const optionsByPoll = useMemo(() => {
    const m = new Map<string, PollOptionRow[]>();
    for (const o of options) {
      if (!o.poll_id) continue;
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
    const m = new Map<string, Set<string>>(); // poll_id -> set(option_id)
    for (const v of votes) {
      if (v.user_id !== meId) continue;
      const set = m.get(v.poll_id) ?? new Set<string>();
      set.add(v.option_id);
      m.set(v.poll_id, set);
    }
    return m;
  }, [votes, meId]);

  function normalizedMode(p: PollRow): "single" | "multi" {
    const x = (p.mode ?? "single").toLowerCase();
    return x.includes("multi") ? "multi" : "single";
  }

  function countVotes(pollId: string, optionId: string) {
    const arr = votesByPoll.get(pollId) ?? [];
    return arr.filter((v) => v.option_id === optionId).length;
  }

  async function createPoll() {
    setStatus("");
    const q = question.trim();
    if (!q) return;

    const lines = rawOptions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setStatus("❌ Add at least 2 options (one per line).");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setStatus("Creating…");

    const basePayload = {
      event_id: eventId,
      question: q,
      created_by: meId,
    };

    const payloads: Array<Record<string, unknown>> = [
      { ...basePayload, mode },
      { ...basePayload, mode: mode === "multi" ? "multiple_choice" : "single_choice" },
      { ...basePayload, allow_multiple: mode === "multi" },
      basePayload,
    ];

    let p: { data: { id: string } | null; error: { message: string } | null } = {
      data: null,
      error: null,
    };

    for (let i = 0; i < payloads.length; i += 1) {
      p = await supabase.from("event_polls").insert(payloads[i]).select("id").single();

      if (!p.error || !p.error.message) break;

      const msg = p.error.message.toLowerCase();
      const schemaMismatch =
        msg.includes("column") ||
        msg.includes("schema cache") ||
        msg.includes("invalid input value") ||
        msg.includes("violates check constraint");

      if (!schemaMismatch || i === payloads.length - 1) break;
    }

    if (p.error || !p.data?.id) {
      setStatus(`❌ ${p.error?.message ?? "Failed to create poll"}`);
      return;
    }

    const pollId = p.data.id;

    const ins = await supabase.from("event_poll_options").insert(
      lines.map((label) => ({
        poll_id: pollId,
        label,
      }))
    );

    if (ins.error) {
      setStatus(`❌ ${ins.error.message}`);
      return;
    }

    setQuestion("");
    setRawOptions("Option 1\nOption 2");
    setMode("single");
    setStatus("✅ Poll created");
    await onReload();
  }

  async function toggleVote(poll: PollRow, optionId: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const pollMode = normalizedMode(poll);
    const mySet = myVotesByPoll.get(poll.id) ?? new Set<string>();
    const already = mySet.has(optionId);

    // UNVOTE
    if (already) {
      const del = await supabase
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("poll_id", poll.id)
        .eq("option_id", optionId)
        .eq("user_id", meId);

      if (del.error) {
        setStatus(`❌ ${del.error.message}`);
        return;
      }

      await onReload();
      return;
    }

    // SINGLE: remove other votes first
    if (pollMode === "single") {
      const delOthers = await supabase
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("poll_id", poll.id)
        .eq("user_id", meId);

      if (delOthers.error) {
        setStatus(`❌ ${delOthers.error.message}`);
        return;
      }
    }

    // INSERT vote
    const ins = await supabase.from("event_poll_votes").insert({
      event_id: eventId,
      poll_id: poll.id,
      option_id: optionId,
      user_id: meId,
    });

    if (ins.error) {
      setStatus(`❌ ${ins.error.message}`);
      return;
    }

    await onReload();
  }

  async function deletePoll(pollId: string) {
    if (!isCreator) return;
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setStatus("Deleting…");

    // delete votes -> options -> poll
    await supabase.from("event_poll_votes").delete().eq("poll_id", pollId).eq("event_id", eventId);
    await supabase.from("event_poll_options").delete().eq("poll_id", pollId);
    const del = await supabase.from("event_polls").delete().eq("id", pollId).eq("event_id", eventId);

    if (del.error) {
      setStatus(`❌ ${del.error.message}`);
      return;
    }

    setStatus("✅ Deleted");
    await onReload();
  }

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Polls</h2>

      {/* Create */}
      {isCreator && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Create a poll</div>

          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question…"
            style={input}
          />

          <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={input}>
            <option value="single">Single choice (one answer)</option>
            <option value="multi">Multiple choice</option>
          </select>

          <textarea
            value={rawOptions}
            onChange={(e) => setRawOptions(e.target.value)}
            style={{ ...input, minHeight: 110 }}
            placeholder={"Option 1\nOption 2\nOption 3"}
          />

          <button onClick={createPoll} style={btnPrimary}>
            + Create poll
          </button>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {polls.length === 0 ? (
          <div style={{ color: "rgba(229,231,235,0.7)" }}>No polls yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {polls.map((p) => {
              const pollMode = normalizedMode(p);
              const opts = optionsByPoll.get(p.id) ?? [];
              const mySet = myVotesByPoll.get(p.id) ?? new Set<string>();

              return (
                <div key={p.id} style={pollBox}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{p.question}</div>
                      <div style={{ fontSize: 13, color: "rgba(229,231,235,0.7)", marginTop: 4 }}>
                        Mode: <b>{pollMode.toUpperCase()}</b>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(229,231,235,0.6)", marginTop: 6 }}>
                        Tip: click an option again to unvote.
                        {pollMode === "single" ? " Picking another option switches your vote." : ""}
                      </div>
                    </div>

                    {isCreator && (
                      <button onClick={() => deletePoll(p.id)} style={btnDangerSmall}>
                        Delete poll
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    {opts.length === 0 ? (
                      <div style={{ color: "rgba(229,231,235,0.7)" }}>
                        No options found for this poll.
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          (Check <code>event_poll_options</code>: rows must have <code>poll_id</code> = this poll id)
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {opts.map((o) => {
                          const selected = mySet.has(o.id);
                          const c = countVotes(p.id, o.id);

                          return (
                            <button
                              key={o.id}
                              onClick={() => toggleVote(p, o.id)}
                              style={{
                                ...optBtn,
                                borderColor: selected ? "rgba(167,139,250,0.55)" : "rgba(255,255,255,0.12)",
                                background: selected ? "rgba(167,139,250,0.16)" : "rgba(255,255,255,0.05)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ textAlign: "left" }}>
                                  <div style={{ fontWeight: 900 }}>{o.label}</div>
                                </div>
                                <div style={{ fontWeight: 900 }}>{c}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {status && <div style={statusBox(status.startsWith("✅"))}>{status}</div>}
    </div>
  );
}

/* styles */
const card: React.CSSProperties = {
  borderRadius: 18,
  padding: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  marginTop: 14,
  color: "#e5e7eb",
  fontFamily: "system-ui",
};

const pollBox: React.CSSProperties = {
  borderRadius: 16,
  padding: 14,
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

const optBtn: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
  cursor: "pointer",
};

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
