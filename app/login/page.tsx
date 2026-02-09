"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState("");

  async function login() {
    setStatus("");
    const cleanEmail = email.trim().toLowerCase();
    const pw = password;

    if (!cleanEmail.includes("@")) return setStatus("❌ Enter a valid email");
    if (!pw) return setStatus("❌ Enter your password");
    if (!supabase) return setStatus("❌ Supabase not ready");

    setStatus("Signing in…");
    const res = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pw });

    if (res.error) return setStatus(`❌ ${res.error.message}`);

    setStatus("✅ Signed in");
    router.push("/events");
  }

  async function loginWithGoogle() {
    setStatus("");
    if (!supabase) return setStatus("❌ Supabase not ready");

    setStatus("Redirecting to Google…");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Login</h1>

        <div style={hintStyle}>Existing users login here.</div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={inputStyle}
            autoComplete="email"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={inputStyle}
            type="password"
            autoComplete="current-password"
          />

          <button onClick={login} style={btnPrimary}>
            Sign in
          </button>

          <div style={dividerStyle}>
            <span style={dividerLabelStyle}>or</span>
          </div>

          <button onClick={loginWithGoogle} style={btnGhost}>
            Continue with Google
          </button>

          <button onClick={() => router.push("/register")} style={btnGhost}>
            New user? Create account
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
  maxWidth: 460,
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

const dividerStyle: React.CSSProperties = {
  position: "relative",
  textAlign: "center",
  height: 1,
  background: "rgba(255,255,255,0.14)",
  margin: "6px 0",
};

const dividerLabelStyle: React.CSSProperties = {
  position: "relative",
  top: -10,
  padding: "0 10px",
  fontSize: 12,
  color: "rgba(229,231,235,0.75)",
  background: "rgba(17,24,39,0.9)",
  borderRadius: 999,
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
