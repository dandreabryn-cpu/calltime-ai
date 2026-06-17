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

const OUTCOME_BADGE: Record<Exclude<CallOutcome, null>, string> = {
    pledged: "badge badge-pledged",
    declined: "badge badge-declined",
    unsure: "badge badge-follow-up",
    no_answer: "badge badge-no-answer",
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
        <div className="flex h-full flex-col overflow-y-auto bg-[var(--paper)] px-8 py-7">
          {/* Header */}
              <div className="flex items-start justify-between pb-5 mb-1">
                      <div>
                                <p className="label-cap mb-1">Calling</p>p>
                                <h1 className="font-display text-[2rem] font-normal leading-tight text-[var(--ink)]">
                                  {donor.firstName} {donor.lastName}
                                </h1>h1>
                                <p className="mt-1.5 font-mono text-sm text-[var(--slate)]">{donor.phone}</p>p>
                      </div>div>
                      <div className="text-right">
                                <p className="label-cap mb-1">Ask</p>p>
                                <p className="font-display text-[2rem] font-normal text-[var(--brass-dim)]">
                                            ${donor.askAmount.toLocaleString()}
                                </p>p>
                      </div>div>
              </div>div>
        
              <hr className="divider mb-6" />
        
          {/* Briefing cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="card px-5 py-4">
                                <p className="label-cap mb-2">Giving history</p>p>
                                <p className="text-[15px] leading-relaxed text-[var(--ink-soft)]">
                                  {donor.givingHistory || "No giving history on file."}
                                </p>p>
                      </div>div>
                      <div className="card px-5 py-4">
                                <p className="label-cap mb-2">Talking points</p>p>
                                <p className="text-[15px] leading-relaxed text-[var(--ink-soft)]">
                                  {donor.notes || "No notes on file."}
                                </p>p>
                      </div>div>
              </div>div>
        
          {/* Call controls */}
              <div className="mb-6">
                {!twilioConfigured && (
                    <div className="mb-4 rounded-[var(--radius)] border border-[var(--brass)] bg-[var(--brass-light)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                                <span className="font-semibold text-[var(--brass-dim)]">Live calling not connected.</span>span>{" "}
                                Add Twilio credentials to place real calls — see the README. Paste a transcript below to test AI outcome detection.
                    </div>div>
                      )}
              
                      <div className="flex items-center gap-3">
                        {callState === "idle" || callState === "ended" ? (
                      <button
                                      onClick={onStartCall}
                                      disabled={!twilioConfigured}
                                      className="btn-primary"
                                    >
                                    Call {donor.firstName}
                      </button>button>
                    ) : (
                      <button
                                      onClick={onEndCall}
                                      className="btn-danger"
                                    >
                        {callState === "connecting" ? "Connecting…" : "End call"}
                      </button>button>
                                )}
                        {callState === "in_call" && (
                      <span className="flex items-center gap-2 font-mono text-sm text-[var(--brick)]">
                                    <span className="inline-block h-2 w-2 rounded-full bg-[var(--brick)] animate-pulse" />
                                    Live
                      </span>span>
                                )}
                      </div>div>
              </div>div>
        
              <hr className="divider mb-6" />
        
          {/* Transcript */}
              <div className="mb-6">
                      <p className="label-cap mb-2">Call transcript</p>p>
                      <textarea
                                  value={manualTranscript}
                                  onChange={(e) => setManualTranscript(e.target.value)}
                                  rows={5}
                                  placeholder="Paste or type how the call went — the AI will read it for a pledge, decline, or follow-up. (A live deployment fills this in automatically from the call recording.)"
                                  className="resize-y"
                                  style={{ minHeight: "100px" }}
                                />
                      <div className="mt-3">
                                <button
                                              onClick={() => onDetectOutcome(manualTranscript)}
                                              disabled={isDetecting || !manualTranscript.trim()}
                                              className="btn-secondary"
                                            >
                                  {isDetecting ? "Detecting…" : "Detect outcome"}
                                </button>button>
                      </div>div>
              </div>div>
        
          {/* AI result */}
          {hasAiSuggestion && donor.aiSuggestedOutcome && (
                  <>
                            <hr className="divider mb-6" />
                            <div className="mb-6">
                                        <p className="label-cap mb-3">AI read of the call</p>p>
                                        <div className="card px-5 py-4 mb-4">
                                                      <div className="flex items-start justify-between gap-4">
                                                                      <div>
                                                                                        <div className="flex items-center gap-2 mb-2">
                                                                                                            <span className={OUTCOME_BADGE[donor.aiSuggestedOutcome]}>
                                                                                                              {OUTCOME_LABELS[donor.aiSuggestedOutcome]}
                                                                                                              </span>span>
                                                                                          {donor.aiSuggestedAmount && (
                                          <span className="font-mono text-sm text-[var(--ink)]">
                                                                  ${donor.aiSuggestedAmount.toLocaleString()}
                                          </span>span>
                                                                                                            )}
                                                                                          </div>div>
                                                                        {donor.aiConfidence && (
                                        <p className="label-cap text-[var(--slate-light)]">{donor.aiConfidence} confidence</p>p>
                                                                                        )}
                                                                      </div>div>
                                                      </div>div>
                                          {donor.aiReasoning && (
                                    <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{donor.aiReasoning}</p>p>
                                                      )}
                                        </div>div>
                            
                              {/* Confirm / override */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                                      <select
                                                                        value={effectiveOutcome ?? ""}
                                                                        onChange={(e) => setOverrideOutcome(e.target.value as CallOutcome)}
                                                                        style={{ width: "auto", minWidth: "180px" }}
                                                                      >
                                                        {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                                                                                          <option key={k} value={k}>{v}</option>option>
                                                                                        ))}
                                                      </select>select>
                                        
                                          {effectiveOutcome === "pledged" && (
                                    <input
                                                        type="text"
                                                        placeholder="Amount"
                                                        value={overrideAmount}
                                                        onChange={(e) => setOverrideAmount(e.target.value)}
                                                        style={{ width: "120px" }}
                                                      />
                                  )}
                                        
                                                      <button
                                                                        onClick={() =>
                                                                                            onConfirmOutcome(
                                                                                                                  effectiveOutcome,
                                                                                                                  effectiveOutcome === "pledged" ? effectiveAmount : null,
                                                                                                                  overrideOutcome !== null
                                                                                                                )
                                                                        }
                                                                        disabled={confirmStatus === "saving" || confirmStatus === "done"}
                                                                        className="btn-primary"
                                                                      >
                                                        {confirmStatus === "saving"
                                                                            ? "Saving…"
                                                                            : confirmStatus === "done"
                                                                            ? "Confirmed ✓"
                                                                            : "Confirm"}
                                                      </button>button>
                                        </div>div>
                            
                              {emailStatus && (
                                  <p className={`mt-3 font-mono text-xs ${
                                                    emailStatus === "sent"
                                                      ? "text-[var(--pine)]"
                                                      : emailStatus === "failed"
                                                      ? "text-[var(--brick)]"
                                                      : "text-[var(--slate)]"
                                  }`}>
                                    {emailStatus === "sent"
                                                        ? "✓ Follow-up email sent"
                                                        : emailStatus === "failed"
                                                        ? "Email failed to send — check your email provider settings."
                                                        : "Email skipped"}
                                  </p>p>
                                        )}
                            </div>div>
                  </>>
                )}
        </div>div>
      );
}</></div>
