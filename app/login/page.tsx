"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function signUp() {
    setStatus("Signing up...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setStatus(error ? `❌ ${error.message}` : "✅ Signed up! Check your email if confirmation is enabled.");
  }

  async function signIn() {
    setStatus("Signing in...");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setStatus(error ? `❌ ${error.message}` : "✅ Signed in!");
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
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
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
