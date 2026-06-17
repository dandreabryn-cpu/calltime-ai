import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { detectOutcomeFromTranscript } from "@/lib/outcome-detection";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { donorId, transcript } = body as { donorId: string; transcript: string };

  const donor = db.getDonor(donorId);
  if (!donor) {
    return NextResponse.json({ error: "Donor not found." }, { status: 404 });
  }
  if (!transcript || transcript.trim().length === 0) {
    return NextResponse.json({ error: "No transcript provided." }, { status: 400 });
  }

  try {
    const result = await detectOutcomeFromTranscript(transcript, donor);

    const updated = db.updateDonor(donorId, {
      transcript,
      aiSuggestedOutcome: result.outcome,
      aiSuggestedAmount: result.pledgedAmount,
      aiConfidence: result.confidence,
      aiReasoning: result.reasoning,
    });

    return NextResponse.json({ donor: updated, aiResult: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Outcome detection failed." },
      { status: 500 }
    );
  }
}
