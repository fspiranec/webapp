"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function ensureProfile() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data, error } = await supabase.auth.getUser();
    const user = data.user;

    if (error || !user) return;

    // create if missing
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: null,
      avatar_url: null,
    });
  }

  async function signUp() {
    setStatus("Signing up...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    // If email confirmation is OFF, user is already logged in here
    if (data.session) {
      await ensureProfile();
      window.location.href = "/events";
      return;
    }

    // If email confirmation is ON, you must confirm email first
    setStatus("✅ Signed up! Check your email to confirm, then sign in.");
  }

  async function signIn() {
    setStatus("Signing in...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    await ensureProfile();
    window.location.href = "/events";
  }

  async function signOut() {
    setStatus("Signing out...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    setStatus(error ? `❌ ${error.message}` : "✅ Signed out");
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", fontFamily: "system-ui" }}>
      <h1>Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={signIn}>Sign in</button>
        <button onClick={signUp}>Sign up</button>
        <button onClick={signOut}>Sign out</button>
      </div>

      <p style={{ marginTop: 16 }}>{status}</p>
    </div>
  );
}
