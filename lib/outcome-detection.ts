import { Donor, OutcomeDetectionResult } from "@/types";

// ---------------------------------------------------------------------------
// PLUG IN YOUR KEY: set ANTHROPIC_API_KEY in your environment (.env.local for
// local dev, the Vercel project settings for deployment). Get one at
// https://console.anthropic.com
// ---------------------------------------------------------------------------
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You analyze transcripts of political fundraising phone calls between a candidate and a donor. Your only job is to determine the outcome of the call and return it as JSON.

Read the transcript carefully and classify the outcome as exactly one of:
- "pledged": the donor clearly committed to giving, even informally ("sure, I'll send something", "put me down for $500")
- "declined": the donor clearly said no or indicated they will not be giving this time
- "unsure": the donor was noncommittal, asked to be followed up with, said "maybe" or "let me think about it", or the call ended without a clear answer
- "no_answer": this was a voicemail or the donor never picked up / the call did not meaningfully connect

If the donor mentioned a specific dollar amount they're committing to, extract it as a number (no currency symbols). If no amount was mentioned but the outcome is "pledged", use null and note in your reasoning that an amount should be confirmed.

Respond with ONLY a JSON object, no other text, no markdown code fences:
{
  "outcome": "pledged" | "declined" | "unsure" | "no_answer",
  "pledgedAmount": number | null,
  "confidence": "high" | "medium" | "low",
  "reasoning": "one sentence explaining what in the transcript led to this read"
}`;

export async function detectOutcomeFromTranscript(
  transcript: string,
  donor: Pick<Donor, "firstName" | "lastName" | "askAmount">
): Promise<OutcomeDetectionResult> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to enable AI outcome detection."
    );
  }

  const userMessage = `Donor: ${donor.firstName} ${donor.lastName}
Ask amount going into the call: $${donor.askAmount}

Transcript:
${transcript}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("No text content returned from the model.");
  }

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();

  let parsed: OutcomeDetectionResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Could not parse AI response as JSON: ${cleaned}`);
  }

  return parsed;
}
