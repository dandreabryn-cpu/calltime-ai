import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { parseDonorCsv } from "@/lib/csv-import";
import { db } from "@/lib/store";
import { CallSession } from "@/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { csvText, candidateName, committeeName, officeSought } = body as {
    csvText: string;
    candidateName: string;
    committeeName: string;
    officeSought: string;
  };

  if (!csvText || typeof csvText !== "string") {
    return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
  }

  const { donors, skippedRows, warnings } = parseDonorCsv(csvText);

  if (donors.length === 0) {
    return NextResponse.json(
      {
        error:
          "No usable donor rows found. Make sure your CSV has at least a phone number column.",
        warnings,
      },
      { status: 400 }
    );
  }

  donors.forEach((donor) => db.createDonor(donor));

  const session: CallSession = {
    id: uuid(),
    candidateName: candidateName || "Candidate",
    committeeName: committeeName || "the campaign",
    officeSought: officeSought || "office",
    createdAt: new Date().toISOString(),
    donorIds: donors.map((d) => d.id),
  };
  db.createSession(session);

  return NextResponse.json({
    sessionId: session.id,
    donorCount: donors.length,
    skippedRows,
    warnings,
  });
}
