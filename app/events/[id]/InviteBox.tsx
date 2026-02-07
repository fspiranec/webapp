"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function InviteBox({ eventId }: { eventId: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function sendInvite() {
    setMsg("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setMsg("❌ Not logged in");
      return;
    }

    const clean = email.trim().toLowerCase();
    if (!clean.includes("@")) {
      setMsg("❌ Enter a valid email");
      return;
    }

    const { error } = await supabase.from("event_invites").insert({
      event_id: eventId,
      email: clean,
      invited_by: sess.session.user.id,
    });

    if (error) {
      setMsg(`❌ ${error.message}`);
      return;
    }

    setEmail("");
    setMsg("✅ Invite created");
  }

  return (
    <div style={box}>
      <h3 style={{ margin: 0 }}>Invite people</h3>
      <p style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>
        Enter email to invite. They must sign in with the same email and accept the invite.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@email.com"
          style={input}
        />
        <button onClick={sendInvite} style={btn}>
          Send invite
        </button>
      </div>

      {msg && (
        <div style={{ marginTop: 10, color: msg.startsWith("✅") ? "#86efac" : "#fca5a5" }}>
          {msg}
        </div>
      )}
    </div>
  );
}

const box: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const input: React.CSSProperties = {
  flex: 1,
  minWidth: 240,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(17,24,39,0.65)",
  color: "#e5e7eb",
  outline: "none",
};

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
};
