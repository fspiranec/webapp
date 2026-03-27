"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Stack } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { gradientPageBackground, spacing } from "@/lib/uiStyles";
import { useIsMobile } from "@/lib/useIsMobile";

// Login screen supports email/password and Google OAuth flows.
// It also preserves a `next` return path so users land where they intended after auth.
export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const isMobile = useIsMobile();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Reads optional redirect target from query string; defaults to events hub for safe navigation.
  function getNextPath() {
    if (typeof window === "undefined") return "/events";
    return new URLSearchParams(window.location.search).get("next") || "/events";
  }

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) router.replace(getNextPath());
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        router.replace(getNextPath());
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  // Standard credential login with lightweight client-side validation for faster feedback.
  async function login() {
    setStatus("");
    const cleanEmail = email.trim().toLowerCase();
    const pw = password;

    if (!cleanEmail.includes("@")) return setStatus("❌ Enter a valid email");
    if (!pw) return setStatus("❌ Enter your password");
    if (!supabase) return setStatus("❌ Supabase not ready");
    if (passwordLoading || oauthLoading) return;

    setPasswordLoading(true);

    setStatus("Signing in…");
    const res = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pw });

    if (res.error) {
      setPasswordLoading(false);
      return setStatus(`❌ ${res.error.message}`);
    }

    setStatus("✅ Signed in");
    router.push(getNextPath());
  }

  // Starts OAuth redirect flow; Supabase returns user to callback route for profile synchronization.
  async function loginWithGoogle() {
    setStatus("");
    if (oauthLoading) return;
    if (!supabase) return setStatus("❌ Supabase not ready");
    setOauthLoading(true);
    setPasswordLoading(false);

    setStatus("Redirecting to Google…");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`,
      },
    });

    if (error) {
      setOauthLoading(false);
      setStatus(`❌ ${error.message}`);
    }
  }

  return (
    <div style={{ ...pageStyle, padding: isMobile ? 16 : 24 }}>
      <Card style={{ ...cardStyle, maxWidth: isMobile ? "100%" : 460 }}>
        <h1 style={{ marginTop: 0 }}>Login</h1>

        <div style={hintStyle}>Existing users login here.</div>

        <Stack gap={spacing.xs} style={{ marginTop: spacing.sm }}>
          <label htmlFor="login-email" style={srOnly}>Email</label>
          <input
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={inputStyle}
            autoComplete="email"
          />
          <label htmlFor="login-password" style={srOnly}>Password</label>
          <input
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={inputStyle}
            type="password"
            autoComplete="current-password"
          />

          <Button variant="primary" onClick={login} disabled={passwordLoading || oauthLoading}>
            {passwordLoading ? "Signing in..." : "Sign in"}
          </Button>

          <div style={dividerStyle}>
            <span style={dividerLabelStyle}>or</span>
          </div>

          {/* ✅ Google styled button */}
              <button
                type="button"
                onClick={loginWithGoogle}
                style={btnGoogle}
                disabled={oauthLoading || passwordLoading}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f8f8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            onMouseDown={(e) => (e.currentTarget.style.background = "#eeeeee")}
            onMouseUp={(e) => (e.currentTarget.style.background = "#f7f8f8")}
          >
            <GoogleLogo />
            <span>{oauthLoading ? "Redirecting..." : "Continue with Google"}</span>
          </button>

          <Button type="button" onClick={() => router.push(`/register?next=${encodeURIComponent(getNextPath())}`)}>
            New user? Create account
          </Button>

          <Button type="button" onClick={() => router.push("/")}>
            Back to home
          </Button>

          {status ? <div role="status" aria-live="polite" style={statusBox(status.startsWith("✅"))}>{status}</div> : null}
        </Stack>
      </Card>
    </div>
  );
}

/* ===== styles ===== */
// Style tokens below keep this standalone page visually consistent with the rest of the app.

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: spacing.lg,
  background: gradientPageBackground,
  color: "#e5e7eb",
  fontFamily: "system-ui",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  padding: 18,
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

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
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
