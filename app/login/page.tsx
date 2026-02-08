"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  function fullNameFromInputs() {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const full = `${fn} ${ln}`.trim();
    return { fn, ln, full };
  }

  async function upsertProfile(fullName: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      avatar_url: null,
    });

    if (error) throw new Error(error.message);
  }

  async function signUp() {
    try {
      setStatus("Signing up...");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { fn, ln, full } = fullNameFromInputs();
      if (!fn || !ln) {
        setStatus("❌ Please enter first and last name");
        return;
      }
      if (full.length < 2) {
        setStatus("❌ Name is too short");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: full,          // ✅ stored in auth metadata
            first_name: fn,
            last_name: ln,
          },
        },
      });

      if (error) {
        setStatus(`❌ ${error.message}`);
        return;
      }

      // If confirmation OFF -> session exists right away
      if (data.session) {
        await upsertProfile(full);
        window.location.href = "/events";
        return;
      }

      setStatus("✅ Signed up! Confirm email, then sign in.");
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? "Unknown error"}`);
    }
  }

  async function signIn() {
    try {
      setStatus("Signing in...");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setStatus(`❌ ${error.message}`);
        return;
      }

      // Ensure profile has a real name:
      // 1) try metadata
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      const metaName = (user?.user_metadata as any)?.full_name?.trim?.() || "";

      // 2) if missing, force user to enter it now
      if (!metaName) {
        const { fn, ln, full } = fullNameFromInputs();
        if (!fn || !ln) {
          setStatus("❌ Enter first + last name (needed once to set your profile)");
          return;
        }
        await upsertProfile(full);
      } else {
        await upsertProfile(metaName);
      }

      window.location.href = "/events";
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? "Unknown error"}`);
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
        background:
          "linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          margin: "38px auto",
          fontFamily: "system-ui",
          color: "#e5e7eb",
        }}
      >
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

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

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
