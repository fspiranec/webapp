"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Card, Stack, buttonStyle } from "@/components/ui/primitives";
import { gradientPageBackground, spacing } from "@/lib/uiStyles";

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
        <Card style={heroCardStyle}>
          <p style={subtitleStyle}>Checking your session…</p>
        </Card>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <Card style={heroCardStyle}>
        <p style={eyebrowStyle}>Plan better events together</p>
        <h1 style={titleStyle}>One workspace for invites, polls, tasks, and event chat</h1>
        <p style={subtitleStyle}>
          Coordinate birthday surprises, grill parties, and group events without jumping between multiple apps.
        </p>

        <Stack gap={spacing.xs} style={actionsStyle}>
          <Link href="/register" style={btnPrimaryStyle}>
            Create account
          </Link>
          <Link href="/login" style={btnGhostStyle}>
            Sign in
          </Link>
        </Stack>
      </Card>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: spacing.lg,
  display: "grid",
  placeItems: "center",
  background: gradientPageBackground,
  color: "#e5e7eb",
  fontFamily: "system-ui",
};

const heroCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 760,
  padding: spacing.lg,
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
  margin: `${spacing.sm}px 0 0`,
  color: "rgba(229,231,235,0.8)",
  maxWidth: 620,
  fontSize: 16,
};

const actionsStyle: React.CSSProperties = {
  marginTop: spacing.md,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, max-content))",
};

const btnPrimaryStyle: React.CSSProperties = {
  ...buttonStyle("primary"),
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const btnGhostStyle: React.CSSProperties = {
  ...buttonStyle("ghost"),
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
