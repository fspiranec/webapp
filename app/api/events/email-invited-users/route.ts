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

  let body: EmailInvitedUsersRequest;
  try {
    body = (await req.json()) as EmailInvitedUsersRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const recipientEmails = Array.from(new Set((body.recipientEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean)));
  if (!body.eventId || !body.eventTitle || !body.inviteLink || recipientEmails.length === 0) {
    return NextResponse.json(
      { error: "eventId, eventTitle, inviteLink, and at least one recipient email are required" },
      { status: 400 }
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
