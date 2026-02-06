"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");

  async function signUp() {
    setStatus("Signing up...");
    const { error } = await supabase.auth.signUp({ email, password });
    setStatus(error ? `❌ ${error.message}` : "✅ Signed up! (You can now sign in)");
  }

  async function signIn() {
    setStatus("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setStatus(error ? `❌ ${error.message}` : "✅ Signed in!");
  }

  async function signOut() {
    setStatus("Signing out...");
    const { error } = await supabase.auth.signOut();
    setStatus(error ? `❌ ${error.message}` : "✅ Signed out");
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", fontFamily: "system-ui" }}>
      <h1>Login</h1>

      <label>Email</label>
      <input
        style={{ width: "100%", padding: 8, margin: "6px 0 12px" }}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
      />

      <label>Password</label>
      <input
        style={{ width: "100%", padding: 8, margin: "6px 0 12px" }}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        type="password"
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
