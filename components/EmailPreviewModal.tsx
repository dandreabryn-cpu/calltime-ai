"use client";

import { useEffect, useRef } from "react";

export interface EmailDraft {
    subject: string;
    body: string;
}

interface EmailPreviewModalProps {
    draft: EmailDraft;
    donorName: string;
    donorEmail: string | null;
    outcome: string;
    onDraftChange: (draft: EmailDraft) => void;
    onSendAndConfirm: () => void;
    onConfirmWithoutSending: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

export function EmailPreviewModal({
    draft,
    donorName,
    donorEmail,
    outcome,
    onDraftChange,
    onSendAndConfirm,
    onConfirmWithoutSending,
    onCancel,
    isSaving,
}: EmailPreviewModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
        function handleKey(e: KeyboardEvent) {
                if (e.key === "Escape") onCancel();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent) {
        if (e.target === overlayRef.current) onCancel();
  }

  const outcomeLabel =
        outcome === "pledged"
        ? "Pledge confirmation"
          : outcome === "declined"
        ? "Gracious follow-up"
          : outcome === "unsure"
        ? "Follow-up"
          : null;

  return (
        <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: "rgba(15,17,23,0.45)", backdropFilter: "blur(2px)" }}
              >
              <div
                        className="relative flex flex-col"
                        style={{
                                    background: "var(--paper-card)",
                                    border: "1px solid var(--hairline)",
                                    borderRadius: "var(--radius)",
                                    boxShadow: "var(--shadow-lg)",
                                    width: "min(680px, 95vw)",
                                    maxHeight: "90vh",
                                    overflow: "hidden",
                        }}
                      >
                {/* Modal header */}
                      <div
                                  style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                justifyContent: "space-between",
                                                padding: "1.25rem 1.5rem 1rem",
                                                borderBottom: "1px solid var(--hairline)",
                                  }}
                                >
                                <div>
                                            <p className="label-cap mb-1">Draft email</p>p>
                                            <h2
                                                            style={{
                                                                              fontFamily: "var(--font-display)",
                                                                              fontSize: "1.25rem",
                                                                              fontWeight: 400,
                                                                              color: "var(--ink)",
                                                                              margin: 0,
                                                            }}
                                                          >
                                              {outcomeLabel ?? "Follow-up"} to {donorName}
                                            </h2>h2>
                                  {donorEmail && (
                                                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--slate)", marginTop: "0.25rem" }}>
                                                                To: {donorEmail}
                                                </p>p>
                                            )}
                                  {!donorEmail && (
                                                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--brick)", marginTop: "0.25rem" }}>
                                                                ⚠ No email on file — review and copy to send manually.
                                                </p>p>
                                            )}
                                </div>div>
                                <button
                                              onClick={onCancel}
                                              style={{
                                                              background: "none",
                                                              border: "none",
                                                              cursor: "pointer",
                                                              color: "var(--slate)",
                                                              fontSize: "1.25rem",
                                                              lineHeight: 1,
                                                              padding: "0.25rem",
                                                              marginLeft: "1rem",
                                              }}
                                              aria-label="Close"
                                            >
                                            ✕
                                </button>button>
                      </div>div>
              
                {/* Scrollable body */}
                      <div style={{ overflowY: "auto", padding: "1.25rem 1.5rem", flex: 1 }}>
                        {/* Subject */}
                                <div style={{ marginBottom: "1rem" }}>
                                            <label className="label-cap" style={{ display: "block", marginBottom: "0.4rem" }}>
                                                          Subject
                                            </label>label>
                                            <input
                                                            type="text"
                                                            value={draft.subject}
                                                            onChange={(e) => onDraftChange({ ...draft, subject: e.target.value })}
                                                            style={{ width: "100%" }}
                                                          />
                                </div>div>
                      
                        {/* Body */}
                                <div>
                                            <label className="label-cap" style={{ display: "block", marginBottom: "0.4rem" }}>
                                                          Message
                                            </label>label>
                                            <textarea
                                                            value={draft.body}
                                                            onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
                                                            rows={14}
                                                            style={{ width: "100%", resize: "vertical", fontFamily: "var(--font-body)", fontSize: "0.9rem", lineHeight: 1.6 }}
                                                          />
                                </div>div>
                      </div>div>
              
                {/* Footer actions */}
                      <div
                                  style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: "0.75rem",
                                                padding: "1rem 1.5rem",
                                                borderTop: "1px solid var(--hairline)",
                                                background: "var(--paper-dim)",
                                  }}
                                >
                                <button onClick={onCancel} className="btn-secondary" disabled={isSaving}>
                                            Back
                                </button>button>
                                <div style={{ display: "flex", gap: "0.75rem" }}>
                                            <button
                                                            onClick={onConfirmWithoutSending}
                                                            className="btn-secondary"
                                                            disabled={isSaving}
                                                          >
                                                          Confirm without sending
                                            </button>button>
                                            <button
                                                            onClick={onSendAndConfirm}
                                                            className="btn-primary"
                                                            disabled={isSaving || !donorEmail}
                                                            title={!donorEmail ? "No email address on file" : undefined}
                                                          >
                                              {isSaving ? "Saving…" : "Send & confirm"}
                                            </button>button>
                                </div>div>
                      </div>div>
              </div>div>
        </div>div>
      );
}</div>
