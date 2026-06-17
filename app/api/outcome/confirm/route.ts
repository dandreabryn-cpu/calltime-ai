import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { renderEmailForOutcome, sendEmail } from "@/lib/email-templates";
import { CallOutcome } from "@/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { donorId, sessionId, finalOutcome, finalAmount, wasOverridden } = body as {
    donorId: string;
    sessionId: string;
    finalOutcome: CallOutcome;
    finalAmount: number | null;
    wasOverridden: boolean;
  };

  const donor = db.getDonor(donorId);
  const session = db.getSession(sessionId);
  if (!donor || !session) {
    return NextResponse.json({ error: "Donor or session not found." }, { status: 404 });
  }

  const updatedDonor = db.updateDonor(donorId, {
    outcome: finalOutcome,
    pledgedAmount: finalAmount,
    status: "completed",
    outcomeSource: wasOverridden ? "ai_overridden" : "ai_confirmed",
  });

  if (!updatedDonor) {
    return NextResponse.json({ error: "Failed to update donor." }, { status: 500 });
  }

  // ---------------------------------------------------------------------
  // Donation link: in production this should be a unique, trackable link
  // per donor/ask (e.g. a WinRed/Anedot contribution page with UTM params
  // or a pre-filled amount). Hardcoded placeholder here for the prototype.
  // ---------------------------------------------------------------------
  const donationLink =
    process.env.DONATION_LINK_BASE || "https://secure.example.com/donate";

  const email = renderEmailForOutcome({
    donor: updatedDonor,
    candidateName: session.candidateName,
    committeeName: session.committeeName,
    officeSought: session.officeSought,
    donationLink,
  });

  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  let emailError: string | null = null;

  if (email && updatedDonor.email) {
    try {
      await sendEmail(updatedDonor.email, email);
      db.updateDonor(donorId, { emailSent: true, emailSentAt: new Date().toISOString() });
      emailStatus = "sent";
    } catch (err) {
      emailStatus = "failed";
      emailError = err instanceof Error ? err.message : "Unknown email error.";
    }
  }

  return NextResponse.json({
    donor: db.getDonor(donorId),
    email,
    emailStatus,
    emailError,
  });
}
