"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  function goNext() {
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next ? next : "/events";
  }

  async function upsertProfile(fullName: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;

    const name = fullName.trim();
    if (!name) throw new Error("Name is required");

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: name,
      avatar_url: null,
    });

    if (error) throw error;
  }

  async function signUp() {
    setStatus("Signing up...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      setStatus("❌ Please enter first and last name");
      return;
    }

    const fullName = `${fn} ${ln}`.trim();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName }, // keep also in auth metadata
      },
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    // If email confirmation is OFF, session exists immediately
    if (data.session) {
      try {
        await upsertProfile(fullName);
        setStatus("✅ Signed up");
        goNext();
      } catch (e: any) {
        setStatus(`❌ Profile save failed: ${e?.message || "unknown"}`);
      }
      return;
    }

    // Confirmation ON:
    setStatus("✅ Signed up! Confirm email, then sign in.");
  }

  async function signIn() {
    setStatus("Signing in...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    // Ensure profile exists on first login.
    // If user typed name, use it. Otherwise, try metadata.
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      const fn = firstName.trim();
      const ln = lastName.trim();
      const typedName = `${fn} ${ln}`.trim();

      const metaName =
        (user?.user_metadata as any)?.full_name ||
        (user?.user_metadata as any)?.name ||
        "";

      const fullNameToUse = typedName || String(metaName || "").trim();

      if (!fullNameToUse) {
        // Don’t allow empty profiles anymore
        setStatus("❌ Missing name. Enter first + last name, then sign in again.");
        return;
      }

      await upsertProfile(fullNameToUse);

      setStatus("✅ Signed in");
      goNext();
    } catch (e: any) {
      setStatus(`❌ Profile save failed: ${e?.message || "unknown"}`);
    }
  }

  async function signOut() {
    setStatus("Signing out...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    setStatus(error ? `❌ ${error.message}` : "✅ Signed out");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 460, margin: "38px auto", fontFamily: "system-ui", color: "#e5e7eb" }}>
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28 }}>Welcome</h1>
          <p style={{ marginTop: 8, color: "rgba(229,231,235,0.75)" }}>
            Sign in, or create an account.
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />

            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={signIn} style={btnGhost}>Sign in</button>
              <button onClick={signUp} style={btnPrimary}>Sign up</button>
              <button onClick={signOut} style={btnDanger}>Sign out</button>
            </div>

            {status && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: status.startsWith("✅") ? "#86efac" : "#fca5a5",
                }}
              >
                {status}
              </div>
            )}
          </div>
        </div>
      </div>
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

const btnDanger: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(248,113,113,0.15)",
  color: "#fecaca",
  fontWeight: 900,
  cursor: "pointer",
};
