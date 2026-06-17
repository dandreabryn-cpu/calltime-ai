// ---------------------------------------------------------------------------
// PROTOTYPE DATA STORE
// ---------------------------------------------------------------------------
// This is an in-memory store so the prototype runs with zero setup. It resets
// every time the server restarts. Before real campaign use, swap this module
// for a real database (Postgres via Prisma/Drizzle is the natural choice on
// Vercel) — every function below is written so a developer can re-implement
// the same signatures against a real DB without touching any calling code.
// ---------------------------------------------------------------------------

import { Donor, CallSession } from "@/types";

const donors = new Map<string, Donor>();
const sessions = new Map<string, CallSession>();

export const db = {
  // --- Donors -------------------------------------------------------------
  createDonor(donor: Donor) {
    donors.set(donor.id, donor);
    return donor;
  },
  getDonor(id: string) {
    return donors.get(id) ?? null;
  },
  updateDonor(id: string, patch: Partial<Donor>) {
    const existing = donors.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    donors.set(id, updated);
    return updated;
  },
  listDonors(ids: string[]) {
    return ids.map((id) => donors.get(id)).filter((d): d is Donor => Boolean(d));
  },

  // --- Sessions -------------------------------------------------------------
  createSession(session: CallSession) {
    sessions.set(session.id, session);
    return session;
  },
  getSession(id: string) {
    return sessions.get(id) ?? null;
  },
  updateSession(id: string, patch: Partial<CallSession>) {
    const existing = sessions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    sessions.set(id, updated);
    return updated;
  },
  listSessions() {
    return Array.from(sessions.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  },
};
