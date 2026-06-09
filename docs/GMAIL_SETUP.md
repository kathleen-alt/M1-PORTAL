# Gmail Setup (send / draft sequence emails)

Connect a Gmail account so sequence steps create a **draft** (default, for review) or **send** directly. ~10 minutes.

## 1. Create a Google Cloud project + OAuth client
1. Go to <https://console.cloud.google.com/> → create a project.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → OAuth consent screen** → External → add your email as a Test user.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → *Web application*.
   - Authorized redirect URI: `https://developers.google.com/oauthplayground` (easiest for getting a refresh token).
   - Save the **Client ID** and **Client secret**.

## 2. Get a refresh token (OAuth Playground)
1. Open <https://developers.google.com/oauthplayground>.
2. Gear icon (top right) → check **Use your own OAuth credentials** → paste Client ID + secret.
3. In “Input your own scopes”, add: `https://www.googleapis.com/auth/gmail.compose`
   (use `https://www.googleapis.com/auth/gmail.send` if you want direct send).
4. **Authorize APIs** → sign in with the sending account → **Exchange authorization code for tokens**.
5. Copy the **Refresh token**.

## 3. Configure the app
In `.env`:

```bash
EMAIL_PROVIDER="gmail"
EMAIL_SEND_MODE="draft"        # "draft" = create Gmail drafts for review; "send" = send
GMAIL_CLIENT_ID="…"
GMAIL_CLIENT_SECRET="…"
GMAIL_REFRESH_TOKEN="…"
GMAIL_SENDER="kathleen@marketone.ca"
EMAIL_FROM="kathleen@marketone.ca"
```

Restart the app. Now marking a sequence step **sent** on a lead will (by default) place a ready-to-review email in that account's Gmail **Drafts**, addressed to the prospect contact. Switch `EMAIL_SEND_MODE="send"` once you're comfortable.

## Notes
- **Draft mode is recommended** to start — a human reviews every email before it goes out.
- For production scale, prefer a Google **Workspace** account and (optionally) a service account with domain-wide delegation instead of a personal refresh token.
- Reply tracking: point a Gmail push/poll watcher at `POST /api/leads/:id/replied` so an inbound reply auto-pauses that prospect's sequence and moves them to *Responded*.
