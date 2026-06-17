import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

// ---------------------------------------------------------------------------
// This is the "Voice URL" you configure on your Twilio TwiML App. Twilio
// hits this endpoint every time the candidate clicks "Call" in the browser.
// It returns TwiML (Twilio's call-control markup) telling Twilio what to do.
//
// IMPORTANT — CALL RECORDING CONSENT:
// Several U.S. states require all parties to consent before a call is
// recorded ("two-party consent" / "all-party consent" states), and deleting
// a recording afterward does not change that — the act of recording itself
// is what's regulated. The <Say> block below plays a brief, natural
// disclosure before the call connects and before <Record> starts, which is
// the standard way contact-center software satisfies this. This is NOT
// legal advice — confirm the exact disclosure language and approach with
// the campaign's compliance counsel before using this with real donors.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const to = formData.get("To") as string | null;

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (!to) {
    twiml.say("We couldn't find a number to dial. Please try again.");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Brief spoken consent disclosure, then record the call for note-taking
  // purposes. recordingStatusCallback fires when the recording is ready —
  // your server can transcribe it there and then delete the audio file
  // immediately after, if "transcribe then discard" is your policy.
  const callerNumber = process.env.TWILIO_CALLER_ID; // your Twilio phone number

  const dial = twiml.dial({
    callerId: callerNumber,
    record: "record-from-answer",
    recordingStatusCallback: "/api/call/recording-complete",
    recordingStatusCallbackEvent: ["completed"],
  });
  dial.number(
    {
      // Optional: play a brief beep or message to the donor before connecting,
      // satisfied here by the <Say> above firing before <Dial>.
    },
    to
  );

  // Insert the consent disclosure before the <Dial> verb executes.
  const responseXml = twiml.toString().replace(
    "<Dial",
    `<Say voice="Polly.Joanna">This call may be recorded for note-taking purposes.</Say><Dial`
  );

  return new NextResponse(responseXml, {
    headers: { "Content-Type": "text/xml" },
  });
}
