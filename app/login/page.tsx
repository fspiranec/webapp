"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useIsMobile } from "@/lib/useIsMobile";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const isMobile = useIsMobile();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  function getNextPath() {
    if (typeof window === "undefined") return "/events";
    return new URLSearchParams(window.location.search).get("next") || "/events";
  }

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
    router.push(getNextPath());
  }

  async function loginWithGoogle() {
    setStatus("");
    if (!supabase) return setStatus("❌ Supabase not ready");

    setStatus("Redirecting to Google…");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`,
      },
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
    }
  }

  return (
    <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
      <div style={{ ...cardStyle, maxWidth: isMobile ? "100%" : 460 }}>
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

          {/* ✅ Google styled button */}
          <button
            onClick={loginWithGoogle}
            style={btnGoogle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f8f8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            onMouseDown={(e) => (e.currentTarget.style.background = "#eeeeee")}
            onMouseUp={(e) => (e.currentTarget.style.background = "#f7f8f8")}
          >
            <GoogleLogo />
            <span>Continue with Google</span>
          </button>

          <button onClick={() => router.push(`/register?next=${encodeURIComponent(getNextPath())}`)} style={btnGhost}>
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

/* ✅ Google button style */
const btnGoogle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #dadce0",
  background: "#ffffff",
  color: "#3c4043",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  transition: "background 0.2s ease",
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

/* ===== Google logo ===== */

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.85-6.85C35.91 2.38 30.4 0 24 0 14.64 0 6.36 5.4 2.44 13.28l7.98 6.2C12.1 13.18 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.64-.14-3.22-.4-4.74H24v9h12.5c-.54 2.92-2.2 5.4-4.7 7.08l7.3 5.68C43.96 37.1 46.1 31.3 46.1 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.42 28.48A14.48 14.48 0 0 1 9.5 24c0-1.56.27-3.06.75-4.48l-7.98-6.2A23.96 23.96 0 0 0 0 24c0 3.98.96 7.74 2.67 11.08l7.75-6.6z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.4 0 11.78-2.12 15.7-5.76l-7.3-5.68c-2.02 1.36-4.6 2.16-8.4 2.16-6.4 0-11.9-3.68-13.58-8.98l-7.75 6.6C6.36 42.6 14.64 48 24 48z"
      />
    </svg>
  );
}
