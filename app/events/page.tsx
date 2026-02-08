"use client";

import React, { useMemo, useState } from "react";

/** Replace these with your real types */
type Friend = { id: string; name: string; email?: string };
type Invite = { id: string; name: string; status: "invited" | "accepted" | "declined" | "maybe" };
type Item = { id: string; title: string; claimedBy?: string | null };

export default function EventDetailsLayoutExample() {
  // ---- mock state; replace with your fetched data ----
  const friends: Friend[] = [
    { id: "1", name: "Ana" },
    { id: "2", name: "Marko" },
    { id: "3", name: "Ivana" },
  ];

  const [selectedFriendId, setSelectedFriendId] = useState<string>(""); // optional
  const invites: Invite[] = [
    { id: "i1", name: "Ana", status: "accepted" },
    { id: "i2", name: "Marko", status: "invited" },
    { id: "i3", name: "Ivana", status: "maybe" },
  ];

  const peopleComing = useMemo(
    () => invites.filter((i) => i.status === "accepted"),
    [invites]
  );

  const items: Item[] = [
    { id: "it1", title: "Chips", claimedBy: "Ana" },
    { id: "it2", title: "Drinks", claimedBy: null },
  ];

  // ---- handlers (wire to your real actions) ----
  function onInviteSelected(friendId: string) {
    setSelectedFriendId(friendId);
    // call your invite mutation here if you want immediate invite
    // or show "Invite" button next to dropdown
  }

  function claimItem(id: string) {
    // your claim mutation
    console.log("claim", id);
  }
  function unclaimItem(id: string) {
    // your unclaim mutation
    console.log("unclaim", id);
  }
  function editItem(id: string) {
    console.log("edit", id);
  }
  function deleteItem(id: string) {
    console.log("delete", id);
  }

  return (
    <div style={page}>
      <Shell>
        <Card>
          {/* ======= TOP GRID: Left (People/Invites/Items) + Right (Polls) ======= */}
          <div style={topGrid}>
            {/* LEFT COLUMN */}
            <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
              {/* People coming (left) */}
              <Panel title="People coming">
                {peopleComing.length === 0 ? (
                  <div style={muted}>No one confirmed yet.</div>
                ) : (
                  <div style={chipWrap}>
                    {peopleComing.map((p) => (
                      <span key={p.id} style={chip}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Invite dropdown: "Choose one friend (optional)" */}
              <Panel title="Invite a friend">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    value={selectedFriendId}
                    onChange={(e) => onInviteSelected(e.target.value)}
                    style={select}
                  >
                    <option value="">Choose one friend (optional)</option>
                    {friends.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  {/* Optional: keep a button if you don’t want auto-invite on select */}
                  <button style={btnPrimary} onClick={() => console.log("invite", selectedFriendId)} disabled={!selectedFriendId}>
                    Invite
                  </button>
                </div>
              </Panel>

              {/* Invited list + status as dropdown */}
              <Dropdown title="Invited people & status" subtitle={`${invites.length} total`}>
                <div style={{ display: "grid", gap: 8 }}>
                  {invites.map((i) => (
                    <div key={i.id} style={rowBetween}>
                      <div style={{ fontWeight: 800 }}>{i.name}</div>
                      <span style={statusPill(i.status)}>{i.status}</span>
                    </div>
                  ))}
                </div>
              </Dropdown>

              {/* Items with actions inline (claimed / unclaimed / edit / delete) */}
              <Panel title="Items">
                <div style={{ display: "grid", gap: 10 }}>
                  {items.map((it) => {
                    const isClaimed = !!it.claimedBy;
                    return (
                      <div key={it.id} style={itemRow}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900 }}>{it.title}</div>
                          <div style={muted}>
                            {isClaimed ? `Claimed by ${it.claimedBy}` : "Unclaimed"}
                          </div>
                        </div>

                        {/* ACTIONS: one beside another */}
                        <div style={actionsRow}>
                          {!isClaimed ? (
                            <button style={btnSmallPrimary} onClick={() => claimItem(it.id)}>
                              Claim
                            </button>
                          ) : (
                            <button style={btnSmallGhost} onClick={() => unclaimItem(it.id)}>
                              Unclaim
                            </button>
                          )}

                          <button style={btnSmallGhost} onClick={() => editItem(it.id)}>
                            Edit
                          </button>
                          <button style={btnSmallDanger} onClick={() => deleteItem(it.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            {/* RIGHT COLUMN: Polls */}
            <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
              <Panel title="Polls">
                <div style={muted}>
                  Put your polls UI here. This panel stays on the right on desktop, stacks on mobile.
                </div>
              </Panel>
            </div>
          </div>

          {/* ======= CHAT UNDER (full width) ======= */}
          <div style={{ marginTop: 14 }}>
            <Panel title="Chat">
              <div style={muted}>Chat goes here (full width, under both columns).</div>
            </Panel>
          </div>
        </Card>
      </Shell>
    </div>
  );
}

/* ================= small UI components (same style language) ================= */

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 980, margin: "0 auto", paddingTop: 40, fontFamily: "system-ui" }}>{children}</div>;
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={panel}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

/** Drop-down without extra libs, keeps your look */
function Dropdown({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <details style={panel}>
      <summary style={summaryRow}>
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          {subtitle ? <div style={{ marginTop: 3, ...muted }}>{subtitle}</div> : null}
        </div>
        <span style={{ ...muted, fontWeight: 900 }}>▼</span>
      </summary>
      <div style={{ marginTop: 10 }}>{children}</div>
    </details>
  );
}

/* ================= styles (keep your palette) ================= */

const page: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(900px 500px at 50% 0%, rgba(124,58,237,0.45), transparent 60%), linear-gradient(180deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  padding: 24,
};

const topGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr",
  gap: 12,
};

/** mobile stacking without changing theme (simple) */
const media = typeof window !== "undefined" ? window.matchMedia("(max-width: 860px)") : null;
if (media?.matches) topGrid.gridTemplateColumns = "1fr";

const panel: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  minWidth: 0,
};

const summaryRow: React.CSSProperties = {
  listStyle: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  cursor: "pointer",
};

const muted: React.CSSProperties = {
  color: "rgba(229,231,235,0.75)",
  fontSize: 13,
};

const chipWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chip: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  fontWeight: 900,
  fontSize: 13,
};

const rowBetween: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const itemRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
};

const actionsRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const select: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  outline: "none",
  minWidth: 260,
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

const btnSmallPrimary: React.CSSProperties = {
  ...btnPrimary,
  padding: "8px 10px",
  borderRadius: 12,
  fontWeight: 900,
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

const btnSmallGhost: React.CSSProperties = {
  ...btnGhost,
  padding: "8px 10px",
  borderRadius: 12,
};

const btnSmallDanger: React.CSSProperties = {
  ...btnSmallGhost,
  border: "1px solid rgba(248,113,113,0.35)",
  background: "rgba(248,113,113,0.12)",
};

function statusPill(status: Invite["status"]): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: status === "accepted" ? "#86efac" : status === "declined" ? "#fca5a5" : "#e5e7eb",
  };
}
