"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// Public landing page to explain value before auth and improve first-run UX.
export default function Home() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        router.replace("/events");
      } else {
        setCheckingSession(false);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        router.replace("/events");
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  if (checkingSession) {
    return (
      <main style={pageStyle}>
        <section style={heroCardStyle}>
          <p style={subtitleStyle}>Checking your session…</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={heroCardStyle}>
        <p style={eyebrowStyle}>Plan better events together</p>
        <h1 style={titleStyle}>One workspace for invites, polls, tasks, and event chat</h1>
        <p style={subtitleStyle}>
          Coordinate birthday surprises, grill parties, and group events without jumping between multiple apps.
        </p>

        <div style={actionsStyle}>
          <Link href="/register" style={btnPrimaryStyle}>
            Create account
          </Link>
          <Link href="/login" style={btnGhostStyle}>
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(900px 500px at 50% 0%, rgba(124,58,237,0.45), transparent 60%), linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  color: "#e5e7eb",
  fontFamily: "system-ui",
};

const heroCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 760,
  borderRadius: 22,
  padding: 24,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(229,231,235,0.8)",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 38,
  lineHeight: 1.15,
};

const subtitleStyle: React.CSSProperties = {
  margin: "14px 0 0",
  color: "rgba(229,231,235,0.8)",
  maxWidth: 620,
  fontSize: 16,
};

const actionsStyle: React.CSSProperties = {
  marginTop: 22,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
  color: "#0b1020",
  fontWeight: 900,
  textDecoration: "none",
};

const btnGhostStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  textDecoration: "none",
};
