# Call Time AI — Prototype

A web app that runs a fundraising call-time session: import a donor list,
work through a queue with a briefing card per donor, place the call from
the browser, and have AI read the transcript to propose an outcome
(pledged / declined / unsure / no answer) that the candidate confirms with
one tap — which then fires the right follow-up email automatically.

This is a working prototype, not a finished product. The app logic, UI,
and AI outcome-detection are real and functional. The parts that depend on
paid third-party infrastructure (live phone calls, live transcription,
real email sending) are wired up correctly in the code but need your own
API keys to go live — see below.

## What works right now, with no setup

- CSV import of a donor list (flexible column matching — handles common
  header variations like "First Name" / "first" / "firstname")
- The call queue and briefing card UI
- AI outcome detection: paste a transcript, get back a structured read
  (this needs an Anthropic API key — see below — but the logic itself
  is fully built)
- Candidate confirm/override flow
- Email template rendering for both outcomes (pledge confirmation, gracious
  follow-up)

## What needs your own API keys to go fully live

### 1. Calling (Twilio) — lets the candidate dial from the browser

1. Create a Twilio account at twilio.com and buy a phone number.
2. In the Twilio Console, create an API Key (Account → API keys & tokens).
3. Create a TwiML App (Voice → TwiML Apps). Set its Voice Request URL
   to `https://<your-deployed-domain>/api/call/voice-webhook`.
4. Add these to your environment:
   ```
   TWILIO_ACCOUNT_SID=...
   TWILIO_API_KEY_SID=...
   TWILIO_API_KEY_SECRET=...
   TWILIO_TWIML_APP_SID=...
   TWILIO_CALLER_ID=+1...   (the Twilio number you bought)
   ```

Docs: https://www.twilio.com/docs/voice/sdks/javascript/get-started

Call recording / consent: the voice webhook
(`app/api/call/voice-webhook/route.ts`) plays a brief spoken disclosure
before recording starts, because several states require all parties to
consent before a call is recorded — and deleting the recording afterward
does not change that requirement, since it's the act of recording that's
regulated. This is not legal advice; confirm the disclosure language
and approach with your campaign's compliance counsel before using this
with real donors. State laws vary and this matters.

### 2. AI outcome detection (Anthropic)

```
ANTHROPIC_API_KEY=...
```

Get one at https://console.anthropic.com. This is what reads the call
transcript and proposes pledged/declined/unsure/no_answer plus a pledged
amount. The logic lives in `lib/outcome-detection.ts`.

### 3. Live transcription (not yet wired up — see "Next steps" below)

Right now, the transcript box in the UI is a manual paste field so you can
test the AI's outcome detection without needing a live call. To make this
automatic from a real call, you'll want to pipe the Twilio call's audio to
a streaming transcription provider (Deepgram and AssemblyAI both have
good real-time APIs and Twilio Media Streams integrations). This is the
single biggest remaining piece of engineering work — see "Next steps."

### 4. Email sending (Resend)

```
RESEND_API_KEY=...
FROM_EMAIL=campaign@yourdomain.org
```

Get a key at https://resend.com. Swap `lib/email-templates.ts`'s
`sendEmail` function for SendGrid/Postmark/etc. if your campaign already
uses one of those.

### 5. Donation link

```
DONATION_LINK_BASE=https://your-actual-donate-page.com
```

In production this should ideally be a unique, trackable link per
donor/ask (e.g. a WinRed or Anedot page with a pre-filled amount), not one
shared URL. Worth a follow-up task once the core flow is validated.

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the keys you have
npm run dev
```

Open http://localhost:3000. If you haven't set any keys yet, click
"load sample data" on the setup screen to try the queue and the manual
transcript-to-AI-outcome flow without needing Twilio at all.

## Architecture overview

```
app/
  page.tsx                     — main app shell (import screen, then queue + briefing)
  api/
    import/                    — CSV upload, creates a CallSession + Donors
    session/[id]/              — fetch a session and its donor queue
    call/start/                — mints a Twilio Voice access token for the browser
    call/voice-webhook/        — TwiML Twilio calls to connect an outbound call
    outcome/detect/            — sends a transcript to Claude, returns a structured read
    outcome/confirm/           — locks in the outcome, fires the matching email
lib/
  store.ts                     — in-memory data store (swap for a real DB, see below)
  csv-import.ts                — flexible CSV-to-Donor parsing
  outcome-detection.ts         — the Claude prompt and API call
  email-templates.ts           — the two follow-up templates and send logic
  useTwilioDialer.ts           — client-side hook wrapping the Twilio Voice SDK
components/
  ImportScreen.tsx, QueueRail.tsx, BriefingPanel.tsx
types/index.ts                 — shared types (Donor, CallSession, outcomes)
```

## Important: the data store is in-memory

`lib/store.ts` holds everything in a JavaScript Map. This means all data
is lost every time the server restarts, and it won't work correctly if
you deploy with multiple server instances. This was the right call for a
prototype: zero setup, easy to read. But before testing with a real
campaign for more than a single sitting, swap it for a real database.
Postgres via Prisma or Drizzle is the natural choice if deploying on
Vercel; the function signatures in `store.ts` are written so a developer
can reimplement them against a real DB without touching any calling code.

## Next steps, roughly in priority order

1. Live transcription pipeline. Wire Twilio Media Streams to a real-time
   transcription provider so the transcript box fills in automatically
   instead of requiring a manual paste. This is the one piece that turns
   "AI-assisted" into "hands-free."
2. Real database, per above.
3. Auth. Right now there's no login — anyone with the URL can see and use
   the session. Fine for a single-candidate test, not fine beyond that.
4. Per-donor trackable donation links, instead of one shared URL.
5. FEC/state disclaimer review on the email templates — the "Paid for by"
   line is a placeholder; confirm exact required language for the
   relevant race type with compliance counsel.
6. Two-party consent review with compliance counsel, confirmed before any
   real donor calls happen, not after.
