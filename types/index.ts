// Core data shapes for the CallTime AI prototype.
// Keep these in one place — both the API routes and the UI import from here
// so the "shape of a donor" only ever has to change in one spot.

export type CallOutcome = "pledged" | "declined" | "unsure" | "no_answer" | null;

export interface Donor {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  askAmount: number;
  /** Free-text giving history pulled in from a CRM export or typed by the call time manager. */
  givingHistory: string;
  /** Free-text talking points / relationship notes the candidate should see before dialing. */
  notes: string;
  status: "queued" | "in_progress" | "completed" | "skipped";
  outcome: CallOutcome;
  /** Amount the donor actually committed to, which may differ from askAmount. */
  pledgedAmount: number | null;
  /** Raw transcript captured during the call, if transcription is enabled. */
  transcript: string | null;
  /** The AI's proposed read of the call, before the candidate confirms or overrides it. */
  aiSuggestedOutcome: CallOutcome;
  aiSuggestedAmount: number | null;
  aiConfidence: "high" | "medium" | "low" | null;
  aiReasoning: string | null;
  /** Whether the candidate accepted the AI's suggestion as-is or corrected it. */
  outcomeSource: "ai_confirmed" | "ai_overridden" | "manual" | null;
  emailSent: boolean;
  emailSentAt: string | null;
}

export interface CallSession {
  id: string;
  candidateName: string;
  committeeName: string;
  officeSought: string;
  createdAt: string;
  donorIds: string[];
}

export interface OutcomeDetectionResult {
  outcome: CallOutcome;
  pledgedAmount: number | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}
