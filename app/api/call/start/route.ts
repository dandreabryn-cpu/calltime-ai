import { NextResponse } from "next/server";
import twilio from "twilio";

// ---------------------------------------------------------------------------
// PLUG IN YOUR KEYS: set these in your environment to enable live calling.
//   TWILIO_ACCOUNT_SID   — from your Twilio Console dashboard
//   TWILIO_API_KEY_SID   — create under Account > API keys & tokens
//   TWILIO_API_KEY_SECRET
//   TWILIO_TWIML_APP_SID — create a TwiML App, point its Voice URL at
//                          /api/call/voice-webhook (see that route)
// Docs: https://www.twilio.com/docs/voice/sdks/javascript/get-started
// ---------------------------------------------------------------------------
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
const TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;

export async function GET() {
  if (!ACCOUNT_SID || !API_KEY_SID || !API_KEY_SECRET || !TWIML_APP_SID) {
    return NextResponse.json(
      {
        error:
          "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, and TWILIO_TWIML_APP_SID to enable live calling.",
      },
      { status: 503 }
    );
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const identity = "candidate"; // single-user prototype; make per-user in production

  const token = new AccessToken(ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET, {
    identity,
    ttl: 3600,
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWIML_APP_SID,
    incomingAllow: false,
  });
  token.addGrant(voiceGrant);

  return NextResponse.json({ token: token.toJwt(), identity });
}
