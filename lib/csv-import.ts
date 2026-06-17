import Papa from "papaparse";
import { v4 as uuid } from "uuid";
import { Donor } from "@/types";

/**
 * Accepts loose, real-world CSV headers (call time managers export from
 * NGP VAN, Numero, or a plain spreadsheet, and the column names are never
 * consistent) and normalizes them into Donor records.
 *
 * Recognized header aliases — add more here as you see real exports:
 */
const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ["first name", "firstname", "first"],
  lastName: ["last name", "lastname", "last"],
  phone: ["phone", "phone number", "cell", "mobile"],
  email: ["email", "email address"],
  askAmount: ["ask amount", "ask", "suggested ask", "target amount"],
  givingHistory: ["giving history", "donation history", "history", "past gifts"],
  notes: ["notes", "talking points", "relationship notes", "comments"],
};

function normalizeHeader(header: string): string | null {
  const cleaned = header.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(cleaned)) return field;
  }
  return null;
}

export interface ParsedImportResult {
  donors: Donor[];
  skippedRows: number;
  warnings: string[];
}

export function parseDonorCsv(csvText: string): ParsedImportResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const warnings: string[] = [];
  if (result.errors.length > 0) {
    warnings.push(
      `${result.errors.length} row(s) had formatting issues and may be incomplete.`
    );
  }

  // Map whatever headers came in to our normalized field names.
  const rawHeaders = result.meta.fields ?? [];
  const headerMap = new Map<string, string>();
  for (const raw of rawHeaders) {
    const normalized = normalizeHeader(raw);
    if (normalized) headerMap.set(raw, normalized);
  }

  if (!Array.from(headerMap.values()).includes("phone")) {
    warnings.push(
      "No phone number column detected — donors without a recognizable phone column can't be called."
    );
  }

  let skippedRows = 0;
  const donors: Donor[] = [];

  for (const row of result.data) {
    const normalizedRow: Record<string, string> = {};
    for (const [raw, value] of Object.entries(row)) {
      const normalized = headerMap.get(raw);
      if (normalized) normalizedRow[normalized] = (value ?? "").trim();
    }

    const phone = normalizedRow.phone;
    const firstName = normalizedRow.firstName || "";
    const lastName = normalizedRow.lastName || "";

    // A row with no phone and no name is almost certainly a blank trailing row — skip it quietly.
    if (!phone && !firstName && !lastName) {
      continue;
    }
    if (!phone) {
      skippedRows += 1;
      continue;
    }

    const askAmountRaw = normalizedRow.askAmount?.replace(/[^0-9.]/g, "") ?? "";
    const askAmount = askAmountRaw ? Number.parseFloat(askAmountRaw) : 0;

    donors.push({
      id: uuid(),
      firstName: firstName || "Friend",
      lastName: lastName || "",
      phone,
      email: normalizedRow.email || "",
      askAmount: Number.isFinite(askAmount) ? askAmount : 0,
      givingHistory: normalizedRow.givingHistory || "",
      notes: normalizedRow.notes || "",
      status: "queued",
      outcome: null,
      pledgedAmount: null,
      transcript: null,
      aiSuggestedOutcome: null,
      aiSuggestedAmount: null,
      aiConfidence: null,
      aiReasoning: null,
      outcomeSource: null,
      emailSent: false,
      emailSentAt: null,
    });
  }

  return { donors, skippedRows, warnings };
}
