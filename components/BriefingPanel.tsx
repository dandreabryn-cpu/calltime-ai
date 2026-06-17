"use client";

import { useState } from "react";
import { Donor, CallOutcome } from "@/types";

interface BriefingPanelProps {
  donor: Donor;
  callState: "idle" | "connecting" | "in_call" | "ended";
  twilioConfigured: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onDetectOutcome: (transcript: string) => Promise<void>;
  isDetecting: boolean;
  onConfirmOutcome: (outcome: CallOutcome, amount: number | null, wasOverridden: boolean) => void;
  confirmStatus: "idle" | "saving" | "done";
  emailStatus: "sent" | "skipped" | "failed" | null;
}

const OUTCOME_LABELS: Record<Exclude<CallOutcome, null>, string> = {
  pledged: "Pledged",
  declined: "Declined",
  unsure: "Unsure / follow up",
  no_answer: "No answer",
};

export function BriefingPanel({
  donor,
  callState,
  twilioConfigured,
  onStartCall,
  onEndCall,
  onDetectOutcome,
  isDetecting,
  onConfirmOutcome,
  confirmStatus,
  emailStatus,
}: BriefingPanelProps) {
  const [manualTranscript, setManualTranscript] = useState("");
  const [overrideOutcome, setOverrideOutcome] = useState<CallOutcome>(null);
  const [overrideAmount, setOverrideAmount] = useState<string>("");

  const hasAiSuggestion = donor.aiSuggestedOutcome !== null;
  const effectiveOutcome = overrideOutcome ?? donor.aiSuggestedOutcome;
  const effectiveAmount =
    overrideAmount !== ""
      ? Number.parseFloat(overrideAmount) || null
      : donor.aiSuggestedAmount;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-7">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[var(--hairline)] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--slate)]">
            Calling
          </p>
          <h1 className="font-display text-3xl text-[var(--ink)]">
            {donor.firstName} {donor.lastName}
          </h1>
          <p className="mt-1 font-mono text-sm text-[var(--slate)]">{donor.phone}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--slate)]">
            Ask
          </p>
          <p className="font-display text-3xl text-[var(--brass-dim)]">
            ${donor.askAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Briefing */}
      <div className="grid grid-cols-2 gap-6 py-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--slate)]">
            Giving history
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
            {donor.givingHistory || "No giving history on file."}
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--slate)]">
            Talking points
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
            {donor.notes || "No notes on file."}
          </p>
        </div>
      </div>

      {/* Call controls */}
      <div className="border-t border-[var(--hairline)] py-6">
        {!twilioConfigured && (
          <div className="mb-4 rounded-sm border border-[var(--brass)] bg-[var(--paper-dim)] px-4 py-3 text-sm text-[var(--ink)]">
            Live calling isn&rsquo;t connected yet. Add your Twilio credentials to place
            real calls — see the README. For now, you can paste a transcript below
            to test how the AI reads call outcomes.
          </div>
        )}

        <div className="flex items-center gap-3">
          {callState === "idle" || callState === "ended" ? (
            <button
              onClick={onStartCall}
              disabled={!twilioConfigured}
              className="rounded-sm bg-[var(--ink)] px-5 py-2.5 font-mono text-sm uppercase tracking-[0.08em] text-[var(--paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Call {donor.firstName}
            </button>
          ) : (
            <button
              onClick={onEndCall}
              className="rounded-sm bg-[var(--brick)] px-5 py-2.5 font-mono text-sm uppercase tracking-[0.08em] text-[var(--paper)] transition-opacity hover:opacity-90"
            >
              {callState === "connecting" ? "Connecting…" : "End call"}
            </button>
          )}
          {callState === "in_call" && (
            <span className="flex items-center gap-2 font-mono text-sm text-[var(--brick)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brick)]" />
              Live — recorded for notes
            </span>
          )}
        </div>
      </div>

      {/* Transcript + outcome detection */}
      <div className="border-t border-[var(--hairline)] py-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--slate)]">
          Call transcript
        </p>
        <textarea
          value={manualTranscript}
          onChange={(e) => setManualTranscript(e.target.value)}
          placeholder="For this prototype: paste or type how the call went, and the AI will read it for a pledge, decline, or follow-up. (A live deployment fills this in automatically from the call recording.)"
          rows={5}
          className="mt-2 w-full rounded-sm border border-[var(--hairline)] bg-white px-3 py-2 text-sm leading-relaxed text-[var(--ink)] placeholder:text-[var(--slate)] focus:border-[var(--brass)]"
        />
        <button
          onClick={() => onDetectOutcome(manualTranscript)}
          disabled={isDetecting || manualTranscript.trim().length === 0}
          className="mt-3 rounded-sm border border-[var(--ink)] px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDetecting ? "Reading transcript…" : "Detect outcome"}
        </button>
      </div>

      {/* AI suggestion + confirm */}
      {hasAiSuggestion && (
        <div className="border-t border-[var(--hairline)] py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--slate)]">
            AI read of the call
          </p>
          <div className="mt-3 rounded-sm border border-[var(--hairline)] bg-[var(--paper-dim)] p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-xl text-[var(--ink)]">
                {donor.aiSuggestedOutcome
                  ? OUTCOME_LABELS[donor.aiSuggestedOutcome]
                  : "Unclear"}
                {donor.aiSuggestedAmount != null && (
                  <span className="ml-2 text-[var(--brass-dim)]">
                    ${donor.aiSuggestedAmount.toLocaleString()}
                  </span>
                )}
              </p>
              <span className="font-mono text-[11px] uppercase text-[var(--slate)]">
                {donor.aiConfidence} confidence
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--slate)]">
              {donor.aiReasoning}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={effectiveOutcome ?? ""}
              onChange={(e) => setOverrideOutcome(e.target.value as CallOutcome)}
              className="rounded-sm border border-[var(--hairline)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
            >
              {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {effectiveOutcome === "pledged" && (
              <input
                type="number"
                placeholder="Amount"
                value={
                  overrideAmount !== ""
                    ? overrideAmount
                    : donor.aiSuggestedAmount?.toString() ?? ""
                }
                onChange={(e) => setOverrideAmount(e.target.value)}
                className="w-32 rounded-sm border border-[var(--hairline)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
              />
            )}
            <button
              onClick={() =>
                onConfirmOutcome(
                  effectiveOutcome,
                  effectiveOutcome === "pledged" ? effectiveAmount : null,
                  overrideOutcome !== null && overrideOutcome !== donor.aiSuggestedOutcome
                )
              }
              disabled={confirmStatus === "saving" || confirmStatus === "done"}
              className="rounded-sm bg-[var(--pine)] px-5 py-2 font-mono text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmStatus === "saving"
                ? "Confirming…"
                : confirmStatus === "done"
                ? "Confirmed"
                : "Confirm & send follow-up"}
            </button>
          </div>

          {confirmStatus === "done" && (
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.06em] text-[var(--pine)]">
              {emailStatus === "sent" && "Follow-up email sent."}
              {emailStatus === "skipped" && "No email sent (no email on file, or no-answer outcome)."}
              {emailStatus === "failed" && "Email failed to send — check your email provider settings."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
