"use client";

import { useState, useRef } from "react";

interface ImportScreenProps {
  onImported: (sessionId: string) => void;
}

const SAMPLE_CSV = `First Name,Last Name,Phone,Email,Ask Amount,Giving History,Notes
Margaret,Chen,+15551234567,margaret.chen@example.com,1000,"Gave $500 in 2022 cycle, hosted a house party in 2023",Asked about education policy last cycle. Mention the new curriculum proposal.
David,Okafor,+15559876543,david.okafor@example.com,2500,"Max donor federally for two cycles, gave $1000 to state party",Long relationship with the campaign chair. Warm, easy ask.
Linda,Park,+15554567890,linda.park@example.com,500,"First-time prospect, no recorded giving",Met at a community event in March. Interested in small business issues.`;

export function ImportScreen({ onImported }: ImportScreenProps) {
  const [candidateName, setCandidateName] = useState("");
  const [officeSought, setOfficeSought] = useState("");
  const [committeeName, setCommitteeName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
  }

  async function handleSubmit() {
    setError(null);
    if (!csvText.trim()) {
      setError("Upload or paste a donor list first.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, candidateName, committeeName, officeSought }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed.");
        setIsSubmitting(false);
        return;
      }
      onImported(data.sessionId);
    } catch {
      setError("Something went wrong reaching the server.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-6">
      <div className="w-full max-w-xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--slate)]">
          Call Time
        </p>
        <h1 className="mt-1 font-display text-4xl text-[var(--ink)]">
          Set up tonight&rsquo;s session
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--slate)]">
          Upload the donor list for this call block. Each row becomes a stop in the
          queue, with giving history and notes shown right before the candidate dials.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--slate)]">
              Candidate name
            </label>
            <input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Jordan Reyes"
              className="mt-1 w-full rounded-sm border border-[var(--hairline)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brass)]"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--slate)]">
              Office sought
            </label>
            <input
              value={officeSought}
              onChange={(e) => setOfficeSought(e.target.value)}
              placeholder="State Senate, District 12"
              className="mt-1 w-full rounded-sm border border-[var(--hairline)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brass)]"
            />
          </div>
          <div className="col-span-2">
            <label className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--slate)]">
              Committee name (for disclaimer line)
            </label>
            <input
              value={committeeName}
              onChange={(e) => setCommitteeName(e.target.value)}
              placeholder="Friends of Jordan Reyes"
              className="mt-1 w-full rounded-sm border border-[var(--hairline)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brass)]"
            />
          </div>
        </div>

        <div className="mt-6 border-t border-[var(--hairline)] pt-6">
          <label className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--slate)]">
            Donor list (CSV)
          </label>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-sm border border-[var(--ink)] px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]"
            >
              Choose file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-sm text-[var(--slate)]">
              {fileName ?? "No file chosen"}
            </span>
          </div>
          <button
            onClick={() => {
              setCsvText(SAMPLE_CSV);
              setFileName("sample-donors.csv (demo data)");
            }}
            className="mt-2 font-mono text-xs text-[var(--brass-dim)] underline underline-offset-2"
          >
            Or load sample data to try it out
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-[var(--brick)]">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="mt-8 w-full rounded-sm bg-[var(--ink)] px-5 py-3 font-mono text-sm uppercase tracking-[0.08em] text-[var(--paper)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Building queue…" : "Start the session"}
        </button>
      </div>
    </div>
  );
}
