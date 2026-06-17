"use client";

import { Donor } from "@/types";

interface QueueRailProps {
  donors: Donor[];
  activeDonorId: string | null;
  onSelect: (donorId: string) => void;
}

function outcomeMark(donor: Donor): { label: string; className: string } {
  if (donor.status !== "completed") {
    return { label: "", className: "" };
  }
  switch (donor.outcome) {
    case "pledged":
      return { label: "PLEDGED", className: "text-[var(--pine)]" };
    case "declined":
      return { label: "DECLINED", className: "text-[var(--brick)]" };
    case "unsure":
      return { label: "FOLLOW UP", className: "text-[var(--brass-dim)]" };
    case "no_answer":
      return { label: "NO ANSWER", className: "text-[var(--slate)]" };
    default:
      return { label: "DONE", className: "text-[var(--slate)]" };
  }
}

export function QueueRail({ donors, activeDonorId, onSelect }: QueueRailProps) {
  const completedCount = donors.filter((d) => d.status === "completed").length;

  return (
    <aside className="flex h-full w-full flex-col border-r border-[var(--hairline)] bg-[var(--paper)]">
      <div className="border-b border-[var(--hairline)] px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--slate)]">
          Tonight&rsquo;s queue
        </p>
        <p className="mt-1 font-display text-2xl text-[var(--ink)]">
          {completedCount} of {donors.length} called
        </p>
      </div>

      <ol className="flex-1 overflow-y-auto">
        {donors.map((donor, idx) => {
          const isActive = donor.id === activeDonorId;
          const mark = outcomeMark(donor);
          return (
            <li key={donor.id}>
              <button
                onClick={() => onSelect(donor.id)}
                className={`group flex w-full items-baseline justify-between gap-3 border-b border-[var(--hairline)] px-5 py-3 text-left transition-colors ${
                  isActive ? "bg-[var(--paper-dim)]" : "hover:bg-[var(--paper-dim)]/60"
                }`}
              >
                <span className="flex items-baseline gap-3 overflow-hidden">
                  <span className="font-mono text-xs text-[var(--slate)] tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate font-display text-base text-[var(--ink)]">
                    {donor.firstName} {donor.lastName}
                  </span>
                </span>
                {mark.label ? (
                  <span className={`shrink-0 font-mono text-[10px] tracking-[0.08em] ${mark.className}`}>
                    {mark.label}
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[10px] text-[var(--slate)]">
                    ${donor.askAmount.toLocaleString()}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
