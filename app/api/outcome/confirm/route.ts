import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { renderEmailForOutcome, sendEmail } from "@/lib/email-templates";
import { CallOutcome } from "@/types";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {
          donorId,
          sessionId,
          finalOutcome,
          finalAmount,
          wasOverridden,
          sendEmail: shouldSendEmail = true,
          emailSubject,
          emailBody,
    } = body as {
          donorId: string;
          sessionId: string;
          finalOutcome: CallOutcome;
          finalAmount: number | null;
          wasOverridden: boolean;
          sendEmail?: boolean;
          emailSubject?: string;
          emailBody?: string;
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

  const donationLink =
        process.env.DONATION_LINK_BASE || "https://secure.example.com/donate";

  // Use the user-edited draft if provided, otherwise fall back to server-rendered template
  let email = renderEmailForOutcome({
        donor: updatedDonor,
        candidateName: session.candidateName,
        committeeName: session.committeeName,
        officeSought: session.officeSought,
        donationLink,
  });

  // Override with user-edited content if passed from the modal
  if (email && emailSubject && emailBody) {
        email = { subject: emailSubject, body: emailBody };
  }

  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
    let emailError: string | null = null;

  if (shouldSendEmail && email && updatedDonor.email) {
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
