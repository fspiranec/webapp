"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useIsMobile } from "@/lib/useIsMobile";

type FriendRow = {
  id: string;
  friend_email: string;
  friend_name: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwStatus, setPwStatus] = useState("");

  async function load() {
    setLoading(true);
    setStatus("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.replace("/login");
      return;
    }

    setEmail(sess.session.user.email ?? "");

    const { data, error } = await supabase
      .from("friends")
      .select("id,friend_email,friend_name,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`❌ ${error.message}`);
      setFriends([]);
    } else {
      setFriends((data ?? []) as FriendRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addFriend() {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const cleanEmail = friendEmail.trim().toLowerCase();
    const cleanName = friendName.trim();

    if (!cleanEmail.includes("@")) {
      setStatus("❌ Enter a valid email");
      return;
    }

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) {
      setStatus("❌ Not logged in");
      return;
    }

    const { error } = await supabase.from("friends").insert({
      owner_id: userId,
      friend_email: cleanEmail,
      friend_name: cleanName ? cleanName : null,
    });

    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    setFriendEmail("");
    setFriendName("");
    setStatus("✅ Friend added");
    await load();
  }

  async function removeFriend(id: string) {
    setStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.from("friends").delete().eq("id", id);
    if (error) {
      setStatus(`❌ ${error.message}`);
      return;
    }

    setStatus("✅ Removed");
    await load();
  }

  async function changePassword() {
    setPwStatus("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const cp = currentPassword.trim();
    const np = newPassword.trim();
    if (np.length < 6) {
      setPwStatus("❌ New password must be at least 6 characters");
      return;
    }

    // Re-auth (password required)
    setPwStatus("Re-authenticating…");
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email,
      password: cp,
    });

    if (reauthErr) {
      setPwStatus(`❌ ${reauthErr.message}`);
      return;
    }

    // Update password
    setPwStatus("Updating password…");
    const { error: updErr } = await supabase.auth.updateUser({ password: np });

    if (updErr) {
      setPwStatus(`❌ ${updErr.message}`);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setPwStatus("✅ Password changed");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div style={{ ...page, padding: isMobile ? 16 : 24 }}>
        <Shell isMobile={isMobile}>
          <Card>Loading…</Card>
        </Shell>
      </div>
    );
  }

  return (
    <div style={{ ...page, padding: isMobile ? 16 : 24 }}>
      <Shell isMobile={isMobile}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 34 }}>Profile</h1>
              <div style={{ color: "rgba(229,231,235,0.75)", marginTop: 6 }}>
                Logged in as <b>{email}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button style={btnGhost} onClick={() => router.push("/events")}>Events</button>
              <button style={btnGhost} onClick={signOut}>Sign out</button>
            </div>
          </div>

          {/* Change password */}
          <div style={{ marginTop: 18 }}>
            <h2 style={{ margin: 0 }}>Change password</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                type="password"
                style={input}
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                type="password"
                style={input}
              />
              <button style={btnPrimary} onClick={changePassword}>
                Update password
              </button>
              {pwStatus && <div style={statusBox(pwStatus.startsWith("✅"))}>{pwStatus}</div>}
            </div>
          </div>

          <hr style={hr} />

          {/* Friends */}
          <div>
            <h2 style={{ margin: 0 }}>Friends</h2>
            <p style={{ marginTop: 6, color: "rgba(229,231,235,0.75)" }}>
              Add friends here. In events you’ll be able to invite multiple friends with checkboxes.
            </p>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="Name (optional)"
                  style={input}
                />
                <input
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="Email"
                  style={input}
                />
              </div>

              <button style={btnPrimary} onClick={addFriend}>
                + Add friend
              </button>

              {status && <div style={statusBox(status.startsWith("✅"))}>{status}</div>}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              {friends.length === 0 ? (
                <div style={{ color: "rgba(229,231,235,0.75)" }}>No friends yet.</div>
              ) : (
                friends.map((f) => (
                  <div key={f.id} style={row}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900 }}>
                        {f.friend_name ? f.friend_name : f.friend_email}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(229,231,235,0.75)" }}>
                        {f.friend_email}
                      </div>
                    </div>

                    <button style={btnDanger} onClick={() => removeFriend(f.id)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </Shell>
    </div>
  );
}

/* UI */

function Shell({ children, isMobile }: { children: React.ReactNode; isMobile: boolean }) {
  return (
    <div
      style={{
        maxWidth: isMobile ? "100%" : 980,
        margin: "0 auto",
        paddingTop: isMobile ? 20 : 40,
        fontFamily: "system-ui",
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 20,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        color: "#e5e7eb",
        backdropFilter: "blur(10px)",
      }}
    >
      {children}
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(900px 500px at 50% 0%, rgba(124,58,237,0.45), transparent 60%), linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(17,24,39,0.65)",
  color: "#e5e7eb",
  outline: "none",
};

const row: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(248,113,113,0.15)",
  color: "#fecaca",
  fontWeight: 900,
  cursor: "pointer",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.12)",
  margin: "18px 0",
};

function statusBox(ok: boolean): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: ok ? "#86efac" : "#fca5a5",
  };
}
