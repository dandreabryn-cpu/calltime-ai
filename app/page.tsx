"use client";

import { useState, useEffect, useCallback } from "react";
import { ImportScreen } from "@/components/ImportScreen";
import { QueueRail } from "@/components/QueueRail";
import { BriefingPanel } from "@/components/BriefingPanel";
import { EmailPreviewModal, EmailDraft } from "@/components/EmailPreviewModal";
import { useTwilioDialer } from "@/lib/useTwilioDialer";
import { Donor, CallSession, CallOutcome } from "@/types";

// Mirrors the email context the server uses to render the draft
function buildEmailDraft(
    donor: Donor,
    session: CallSession,
    outcome: CallOutcome
  ): EmailDraft {
    const donationLink =
          process.env.NEXT_PUBLIC_DONATION_LINK_BASE || "https://secure.example.com/donate";
    const amount = donor.pledgedAmount ?? donor.askAmount;
    const formattedAmount = amount ? `$${amount.toLocaleString()}` : "your gift";

  if (outcome === "pledged") {
        return {
                subject: `Thank you, ${donor.firstName}! Completing your gift to ${session.candidateName}`,
                body: `Hi ${donor.firstName},\n\nThank you so much for taking the time to speak with ${session.candidateName} today — it means a great deal to have your support.\n\nAs discussed, here's the link to complete your gift of ${formattedAmount}:\n${donationLink}\n\nYour support helps ${session.candidateName} continue the campaign for ${session.officeSought}, and we're grateful to have you on the team.\n\nIf you have any questions or run into any trouble with the link, just reply to this email and we'll take care of it right away.\n\nThank you again,\n${session.candidateName} for ${session.officeSought}\nPaid for by ${session.committeeName}`,
        };
  }

  // declined or unsure — gracious follow-up
  return {
        subject: `Great speaking with you, ${donor.firstName}`,
        body: `Hi ${donor.firstName},\n\nIt was great to connect with you today — thank you for taking the time to chat with ${session.candidateName}.\n\nWe know now isn't the right moment for everyone, and we completely understand. If anything changes, or if you'd like to support the campaign down the road, here's a link where you can always make a gift:\n${donationLink}\n\nEither way, we're grateful for your time and your support of ${session.candidateName}'s campaign in other ways — every conversation matters.\n\nWarmly,\n${session.candidateName} for ${session.officeSought}\nPaid for by ${session.committeeName}`,
  };
}

export default function Home() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [session, setSession] = useState<CallSession | null>(null);
    const [donors, setDonors] = useState<Donor[]>([]);
    const [activeDonorId, setActiveDonorId] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [confirmStatus, setConfirmStatus] = useState<"idle" | "saving" | "done">("idle");
    const [emailStatus, setEmailStatus] = useState<"sent" | "skipped" | "failed" | null>(null);
    const [twilioConfigured, setTwilioConfigured] = useState(true);

  // Email preview modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailDraft, setEmailDraft] = useState<EmailDraft>({ subject: "", body: "" });
    const [pendingConfirm, setPendingConfirm] = useState<{
          outcome: CallOutcome;
          amount: number | null;
          wasOverridden: boolean;
    } | null>(null);

  const { callState, startCall, endCall } = useTwilioDialer();

  const refreshSession = useCallback(async (id: string) => {
        const res = await fetch(`/api/session/${id}`);
        const data = await res.json();
        if (res.ok) {
                setSession(data.session);
                setDonors(data.donors);
                setActiveDonorId((prev) => prev ?? (data.donors[0]?.id ?? null));
        }
  }, []);

  useEffect(() => {
        if (sessionId) refreshSession(sessionId);
  }, [sessionId, refreshSession]);

  useEffect(() => {
        fetch("/api/call/start")
          .then((res) => setTwilioConfigured(res.ok))
          .catch(() => setTwilioConfigured(false));
  }, []);

  const activeDonor = donors.find((d) => d.id === activeDonorId) ?? null;

  function handleSelectDonor(id: string) {
        setActiveDonorId(id);
        setConfirmStatus("idle");
        setEmailStatus(null);
        setEmailModalOpen(false);
        setPendingConfirm(null);
  }

  async function handleDetectOutcome(transcript: string) {
        if (!activeDonor) return;
        setIsDetecting(true);
        try {
                const res = await fetch("/api/outcome/detect", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ donorId: activeDonor.id, transcript }),
                });
                const data = await res.json();
                if (res.ok) {
                          setDonors((prev) => prev.map((d) => (d.id === activeDonor.id ? data.donor : d)));
                } else {
                          alert(data.error || "Outcome detection failed.");
                }
        } finally {
                setIsDetecting(false);
        }
  }

  // Called when user clicks "Confirm" — opens the email preview modal if
  // the outcome warrants an email (pledged / declined / unsure).
  function handleRequestConfirm(
        outcome: CallOutcome,
        amount: number | null,
        wasOverridden: boolean
      ) {
        if (!activeDonor || !session) return;

      // no_answer: skip email preview, confirm directly
      if (!outcome || outcome === "no_answer") {
              void executeConfirm(outcome, amount, wasOverridden, false);
              return;
      }

      // Build the draft client-side from the same template logic as the server
      const draft = buildEmailDraft(activeDonor, session, outcome);
        setEmailDraft(draft);
        setPendingConfirm({ outcome, amount, wasOverridden });
        setEmailModalOpen(true);
  }

  // Executes the actual API call — called from modal actions
  async function executeConfirm(
        outcome: CallOutcome,
        amount: number | null,
        wasOverridden: boolean,
        sendEmail: boolean
      ) {
        if (!activeDonor || !sessionId) return;
        setConfirmStatus("saving");
        setEmailModalOpen(false);
        try {
                const res = await fetch("/api/outcome/confirm", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                                      donorId: activeDonor.id,
                                      sessionId,
                                      finalOutcome: outcome,
                                      finalAmount: amount,
                                      wasOverridden,
                                      sendEmail,
                                      // Pass the edited draft so the server can use it instead of re-rendering
                                      emailSubject: sendEmail ? emailDraft.subject : undefined,
                                      emailBody: sendEmail ? emailDraft.body : undefined,
                          }),
                });
                const data = await res.json();
                if (res.ok) {
                          setDonors((prev) => prev.map((d) => (d.id === activeDonor.id ? data.donor : d)));
                          setEmailStatus(data.emailStatus);
                          setConfirmStatus("done");
                } else {
                          alert(data.error || "Could not confirm outcome.");
                          setConfirmStatus("idle");
                }
        } catch {
                setConfirmStatus("idle");
        }
  }

  function handleModalSendAndConfirm() {
        if (!pendingConfirm) return;
        void executeConfirm(
                pendingConfirm.outcome,
                pendingConfirm.amount,
                pendingConfirm.wasOverridden,
                true
              );
        setPendingConfirm(null);
  }

  function handleModalConfirmWithoutSending() {
        if (!pendingConfirm) return;
        void executeConfirm(
                pendingConfirm.outcome,
                pendingConfirm.amount,
                pendingConfirm.wasOverridden,
                false
              );
        setPendingConfirm(null);
  }

  function handleModalCancel() {
        setEmailModalOpen(false);
        setPendingConfirm(null);
  }

  if (!sessionId) {
        return <ImportScreen onImported={setSessionId} />;
  }

  if (!session || !activeDonor) {
        return (
                <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
                        <p className="font-mono text-sm text-[var(--slate)]">Loading session…</p>p>
                </div>div>
              );
  }
  
    return (
          <div className="flex h-screen bg-[var(--paper)]">
            {/* Email preview modal */}
            {emailModalOpen && pendingConfirm && (
                    <EmailPreviewModal
                                draft={emailDraft}
                                donorName={`${activeDonor.firstName} ${activeDonor.lastName}`}
                                donorEmail={activeDonor.email ?? null}
                                outcome={pendingConfirm.outcome ?? "unsure"}
                                onDraftChange={setEmailDraft}
                                onSendAndConfirm={handleModalSendAndConfirm}
                                onConfirmWithoutSending={handleModalConfirmWithoutSending}
                                onCancel={handleModalCancel}
                                isSaving={confirmStatus === "saving"}
                              />
                  )}
          
                <div className="w-[300px] shrink-0">
                        <QueueRail
                                    donors={donors}
                                    activeDonorId={activeDonorId}
                                    onSelectDonor={handleSelectDonor}
                                    sessionProgress={{
                                                  called: donors.filter((d) => d.status === "completed").length,
                                                  total: donors.length,
                                    }}
                                  />
                </div>div>
                <div className="flex-1 overflow-hidden">
                        <BriefingPanel
                                    donor={activeDonor}
                                    callState={callState}
                                    twilioConfigured={twilioConfigured}
                                    onStartCall={() => startCall(activeDonor.phone)}
                                    onEndCall={endCall}
                                    onDetectOutcome={handleDetectOutcome}
                                    isDetecting={isDetecting}
                                    onConfirmOutcome={handleRequestConfirm}
                                    confirmStatus={confirmStatus}
                                    emailStatus={emailStatus}
                                  />
                </div>div>
          </div>div>
        );
}</div>
