// ---------------------------------------------------------------------------
// Email dispatch layer.
//
// One entry point — dispatchEmail() — routes an outreach email to the
// configured provider. Gmail is first-class: it can SEND or, by default, drop
// the message into the rep's Gmail Drafts for review (EMAIL_SEND_MODE=draft).
//
// Providers (EMAIL_PROVIDER): "gmail" | "resend" | "sendgrid" | "console".
// With nothing configured it falls back to "console" (logs only) so running the
// app never accidentally emails a real prospect.
// ---------------------------------------------------------------------------

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface DispatchResult {
  provider: string;
  status: "sent" | "drafted" | "logged" | "error";
  detail: string;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || process.env.GMAIL_SENDER || "growth@orcacoastplaygrounds.com";
}

function toBase64Url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function mime(email: OutboundEmail): string {
  const from = email.from || fromAddress();
  return [
    `From: ${from}`,
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    email.body,
  ].join("\r\n");
}

// --- Gmail ---------------------------------------------------------------

/** Exchange the long-lived refresh token for a short-lived access token. */
async function gmailAccessToken(): Promise<string | null> {
  const client_id = process.env.GMAIL_CLIENT_ID;
  const client_secret = process.env.GMAIL_CLIENT_SECRET;
  const refresh_token = process.env.GMAIL_REFRESH_TOKEN;
  if (!client_id || !client_secret || !refresh_token) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

async function gmailDispatch(email: OutboundEmail): Promise<DispatchResult> {
  const token = await gmailAccessToken();
  if (!token) {
    return { provider: "gmail", status: "error", detail: "Gmail not configured (set GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN)." };
  }
  const raw = toBase64Url(mime(email));
  // Default to draft mode — safest for sales review before send.
  const mode = (process.env.EMAIL_SEND_MODE || "draft").toLowerCase();
  const draft = mode !== "send";
  const url = draft
    ? "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
    : "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
  const payload = draft ? { message: { raw } } : { raw };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { provider: "gmail", status: "error", detail: `Gmail API ${res.status}: ${text.slice(0, 140)}` };
    }
    return draft
      ? { provider: "gmail", status: "drafted", detail: `Draft created in Gmail for ${email.to}.` }
      : { provider: "gmail", status: "sent", detail: `Sent via Gmail to ${email.to}.` };
  } catch (e: any) {
    return { provider: "gmail", status: "error", detail: `Gmail request failed: ${e?.message ?? e}` };
  }
}

// --- Resend / SendGrid ---------------------------------------------------

async function resendDispatch(email: OutboundEmail): Promise<DispatchResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { provider: "resend", status: "error", detail: "RESEND_API_KEY not set." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: email.to, subject: email.subject, text: email.body }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { provider: "resend", status: "error", detail: `Resend ${res.status}` };
    return { provider: "resend", status: "sent", detail: `Sent via Resend to ${email.to}.` };
  } catch (e: any) {
    return { provider: "resend", status: "error", detail: `Resend failed: ${e?.message ?? e}` };
  }
}

async function sendgridDispatch(email: OutboundEmail): Promise<DispatchResult> {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return { provider: "sendgrid", status: "error", detail: "SENDGRID_API_KEY not set." };
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }] }],
        from: { email: fromAddress() },
        subject: email.subject,
        content: [{ type: "text/plain", value: email.body }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { provider: "sendgrid", status: "error", detail: `SendGrid ${res.status}` };
    return { provider: "sendgrid", status: "sent", detail: `Sent via SendGrid to ${email.to}.` };
  } catch (e: any) {
    return { provider: "sendgrid", status: "error", detail: `SendGrid failed: ${e?.message ?? e}` };
  }
}

// --- Dispatcher ----------------------------------------------------------

export async function dispatchEmail(email: OutboundEmail): Promise<DispatchResult> {
  if (!email.to) return { provider: "none", status: "error", detail: "No recipient email." };
  const provider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  switch (provider) {
    case "gmail":
      return gmailDispatch(email);
    case "resend":
      return resendDispatch(email);
    case "sendgrid":
      return sendgridDispatch(email);
    default:
      return {
        provider: "console",
        status: "logged",
        detail: `Logged (no provider). Set EMAIL_PROVIDER=gmail to draft/send via Gmail. → ${email.to}: ${email.subject}`,
      };
  }
}
