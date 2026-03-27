import { NextResponse } from "next/server";

type EmailInvitedUsersRequest = {
  eventId?: string;
  eventTitle?: string;
  eventType?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  description?: string | null;
  inviteLink?: string;
  recipientEmails?: string[];
  subject?: string;
  message?: string;
};

const MAX_RECIPIENTS_PER_REQUEST = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const senderRateMap = new Map<string, number[]>();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateRange(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt) return "Time: not specified";

  const start = new Date(startsAt).toLocaleString();
  if (!endsAt) return `Time: ${start}`;
  return `Time: ${start} - ${new Date(endsAt).toLocaleString()}`;
}

function canSendFromKey(rateKey: string) {
  const now = Date.now();
  const recent = (senderRateMap.get(rateKey) ?? []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  recent.push(now);
  senderRateMap.set(rateKey, recent);
  return true;
}

function isSafeAbsoluteUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Event Planner";

  if (!apiKey || !senderEmail) {
    return NextResponse.json(
      { error: "Missing BREVO_API_KEY or BREVO_SENDER_EMAIL environment variable" },
      { status: 500 }
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized: missing bearer token" }, { status: 401 });
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!userRes.ok) {
    return NextResponse.json({ error: "Unauthorized: invalid user token" }, { status: 401 });
  }

  let body: EmailInvitedUsersRequest;
  try {
    body = (await req.json()) as EmailInvitedUsersRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const recipientEmails = Array.from(
    new Set((body.recipientEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean))
  );
  if (!body.eventId || !body.eventTitle || !body.inviteLink || recipientEmails.length === 0) {
    return NextResponse.json(
      { error: "eventId, eventTitle, inviteLink, and at least one recipient email are required" },
      { status: 400 }
    );
  }
  if (!isSafeAbsoluteUrl(body.inviteLink)) {
    return NextResponse.json({ error: "inviteLink must be an absolute http(s) URL" }, { status: 400 });
  }
  if (recipientEmails.length > MAX_RECIPIENTS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many recipients. Maximum allowed is ${MAX_RECIPIENTS_PER_REQUEST}.` },
      { status: 400 }
    );
  }
  const rateKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-sender";
  if (!canSendFromKey(rateKey)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before sending more reminder emails." },
      { status: 429 }
    );
  }

  const defaultMessage = [
    `You are invited to ${body.eventTitle}.`,
    body.eventType ? `Type: ${body.eventType}` : null,
    formatDateRange(body.startsAt, body.endsAt),
    body.location ? `Location: ${body.location}` : null,
    body.description ? `Details: ${body.description}` : null,
    `Join or review the event here: ${body.inviteLink}`,
  ]
    .filter(Boolean)
    .join("\n");

  const subject = body.subject?.trim() || `Reminder: ${body.eventTitle}`;
  const message = body.message?.trim() || defaultMessage;
  const textContent = `${message}\n\nOpen event invitation: ${body.inviteLink}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">${escapeHtml(subject)}</h2>
      ${message
        .split(/\n+/)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("")}
      <p><a href="${body.inviteLink}">Open event invitation</a></p>
    </div>
  `;

  const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: recipientEmails.map((email) => ({ email })),
      subject,
      textContent,
      htmlContent,
      tags: ["event-invite-reminder"],
    }),
  });

  if (!brevoRes.ok) {
    const errorText = await brevoRes.text();
    return NextResponse.json({ error: `Brevo request failed: ${errorText}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: recipientEmails.length });
}
