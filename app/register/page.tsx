"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useIsMobile } from "@/lib/useIsMobile";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const isMobile = useIsMobile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState("");

  function getNextPath() {
    if (typeof window === "undefined") return "/events";
    return new URLSearchParams(window.location.search).get("next") || "/events";
  }

  async function register() {
    setStatus("");

    const fn = firstName.trim();
    const ln = lastName.trim();
    const full = `${fn} ${ln}`.trim();
    const cleanEmail = email.trim().toLowerCase();
    const pw = password;

    if (!fn) return setStatus("❌ First name is required");
    if (!ln) return setStatus("❌ Last name is required");
    if (!cleanEmail.includes("@")) return setStatus("❌ Enter a valid email");
    if (pw.length < 6) return setStatus("❌ Password must be at least 6 characters");
    if (!supabase) return setStatus("❌ Supabase not ready");

    setStatus("Creating account…");

    // 1) Create auth user + store metadata (optional but useful)
    const signUp = await supabase.auth.signUp({
      email: cleanEmail,
      password: pw,
      options: {
        data: {
          first_name: fn,
          last_name: ln,
          full_name: full,
          phone: phone.trim() ? phone.trim() : null,
        },
      },
    });

    if (signUp.error) return setStatus(`❌ ${signUp.error.message}`);

    const userId = signUp.data.user?.id;
    if (!userId) {
      // This can happen if email confirmation is enabled; user still exists in auth but session may be null.
      setStatus("✅ Account created. Check your email to confirm, then login.");
      return;
    }

    // 2) Insert into public.profiles (DB)
    const ins = await supabase.from("profiles").insert({
      id: userId,
      first_name: fn,
      last_name: ln,
      full_name: full,
      email: cleanEmail,
      phone: phone.trim() ? phone.trim() : null,
    });

    if (ins.error) {
      // If profile insert fails because session isn't active (email confirm), you can still let user login later.
      setStatus(`⚠️ User created, but profile insert failed: ${ins.error.message}`);
      return;
    }

    setStatus("✅ Registered! Redirecting…");
    router.push(getNextPath());
  }

  return (
    <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
      <div style={{ ...cardStyle, maxWidth: isMobile ? "100%" : 520 }}>
        <h1 style={{ marginTop: 0 }}>Create account</h1>

        <div style={hintStyle}>
          First name, last name and email are required. Phone is optional.
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name *"
              style={inputStyle}
              autoComplete="given-name"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name *"
              style={inputStyle}
              autoComplete="family-name"
            />
          </div>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email *"
            style={inputStyle}
            autoComplete="email"
          />

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            style={inputStyle}
            autoComplete="tel"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars) *"
            style={inputStyle}
            type="password"
            autoComplete="new-password"
          />

          <button onClick={register} style={btnPrimary}>
            Create account
          </button>

          <button onClick={() => router.push(`/login?next=${encodeURIComponent(getNextPath())}`)} style={btnGhost}>
            Back to login
          </button>

          {status ? <div style={statusBox(status.startsWith("✅"))}>{status}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* ===== styles ===== */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  color: "#e5e7eb",
  fontFamily: "system-ui",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 18,
  padding: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
};

const hintStyle: React.CSSProperties = {
  color: "rgba(229,231,235,0.75)",
  fontSize: 13,
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
