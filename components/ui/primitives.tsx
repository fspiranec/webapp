"use client";

import type React from "react";

type ButtonVariant = "primary" | "ghost";

const baseButtonStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  fontWeight: 900,
  minHeight: 44,
  cursor: "pointer",
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
    color: "#0b1020",
  },
  ghost: {
    background: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
  },
};

export function buttonStyle(variant: ButtonVariant): React.CSSProperties {
  return {
    ...baseButtonStyle,
    ...variantStyles[variant],
  };
}

export function Button({
  children,
  variant = "ghost",
  fullWidth = false,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}) {
  return (
    <button
      {...props}
      style={{
        ...buttonStyle(variant),
        width: fullWidth ? "100%" : "auto",
        textAlign: "center",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
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
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Stack({
  children,
  gap = 12,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

