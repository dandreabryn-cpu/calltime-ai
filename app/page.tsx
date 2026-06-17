"use client";

import { useState, useEffect, useCallback } from "react";
import { ImportScreen } from "@/components/ImportScreen";
import { QueueRail } from "@/components/QueueRail";
import { BriefingPanel } from "@/components/BriefingPanel";
import { useTwilioDialer } from "@/lib/useTwilioDialer";
import { Donor, CallSession, CallOutcome } from "@/types";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<CallSession | null>(null);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [activeDonorId, setActiveDonorId] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"idle" | "saving" | "done">("idle");
  const [emailStatus, setEmailStatus] = useState<"sent" | "skipped" | "failed" | null>(null);
  const [twilioConfigured, setTwilioConfigured] = useState(true);

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

  async function handleConfirmOutcome(
    outcome: CallOutcome,
    amount: number | null,
    wasOverridden: boolean
  ) {
    if (!activeDonor || !sessionId) return;
    setConfirmStatus("saving");
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

  if (!sessionId) {
    return <ImportScreen onImported={setSessionId} />;
  }

  if (!session || !activeDonor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <p className="font-mono text-sm text-[var(--slate)]">Loading session…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--paper)]">
      <div className="w-[300px] shrink-0">
        <QueueRail
          donors={donors}
          activeDonorId={activeDonorId}
          onSelect={handleSelectDonor}
        />
      </div>
      <main className="flex-1">
        <BriefingPanel
          donor={activeDonor}
          callState={callState}
          twilioConfigured={twilioConfigured}
          onStartCall={() => startCall(activeDonor.phone)}
          onEndCall={endCall}
          onDetectOutcome={handleDetectOutcome}
          isDetecting={isDetecting}
          onConfirmOutcome={handleConfirmOutcome}
          confirmStatus={confirmStatus}
          emailStatus={emailStatus}
        />
      </main>
    </div>
  );
}
