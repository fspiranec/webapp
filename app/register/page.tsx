"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Stack } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { gradientPageBackground, spacing } from "@/lib/uiStyles";
import { useIsMobile } from "@/lib/useIsMobile";

// Registration screen captures profile basics and creates both auth + profile records.
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

  // Preserve caller intent by honoring `next` query parameter after successful signup.
  function getNextPath() {
    if (typeof window === "undefined") return "/events";
    return new URLSearchParams(window.location.search).get("next") || "/events";
  }

  // Creates Supabase auth user then upserts the public profile used across event features.
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
      <Card style={{ ...cardStyle, maxWidth: isMobile ? "100%" : 520 }}>
        <h1 style={{ marginTop: 0 }}>Create account</h1>

        <div style={hintStyle}>
          First name, last name and email are required. Phone is optional.
        </div>

        <Stack gap={spacing.xs} style={{ marginTop: spacing.sm }}>
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

          <Button variant="primary" onClick={register}>
            Create account
          </Button>

          <Button onClick={() => router.push(`/login?next=${encodeURIComponent(getNextPath())}`)}>
            Back to login
          </Button>

          {status ? <div style={statusBox(status.startsWith("✅"))}>{status}</div> : null}
        </Stack>
      </Card>
    </div>
  );
}

/* ===== styles ===== */

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
  maxWidth: 520,
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

// Shared success/error status style helper for auth feedback banners.
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
