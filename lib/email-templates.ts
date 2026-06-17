import { Donor } from "@/types";

export interface EmailContext {
  donor: Donor;
  candidateName: string;
  committeeName: string;
  officeSought: string;
  donationLink: string;
}

export interface RenderedEmail {
  subject: string;
  body: string;
}

/**
 * Pledge confirmation — sent when the candidate confirms a "pledged" outcome.
 */
function renderPledgeEmail(ctx: EmailContext): RenderedEmail {
  const amount = ctx.donor.pledgedAmount ?? ctx.donor.askAmount;
  const formattedAmount = amount
    ? `$${amount.toLocaleString()}`
    : "your gift";

  return {
    subject: `Thank you, ${ctx.donor.firstName}! Completing your gift to ${ctx.candidateName}`,
    body: `Hi ${ctx.donor.firstName},

Thank you so much for taking the time to speak with ${ctx.candidateName} today — it means a great deal to have your support.

As discussed, here's the link to complete your gift of ${formattedAmount}:

${ctx.donationLink}

Your support helps ${ctx.candidateName} continue the campaign for ${ctx.officeSought}, and we're grateful to have you on the team.

If you have any questions or run into any trouble with the link, just reply to this email and we'll take care of it right away.

Thank you again,
${ctx.candidateName} for ${ctx.officeSought}

Paid for by ${ctx.committeeName}`,
  };
}

/**
 * Gracious follow-up — sent for "declined" or "unsure" outcomes. Keeps the
 * door open without being pushy.
 */
function renderGraciousEmail(ctx: EmailContext): RenderedEmail {
  return {
    subject: `Great speaking with you, ${ctx.donor.firstName}`,
    body: `Hi ${ctx.donor.firstName},

It was great to connect with you today — thank you for taking the time to chat with ${ctx.candidateName}.

We know now isn't the right moment for everyone, and we completely understand. If anything changes, or if you'd like to support the campaign down the road, here's a link where you can always make a gift:

${ctx.donationLink}

Either way, we're grateful for your time and your support of ${ctx.candidateName}'s campaign in other ways — every conversation matters.

Warmly,
${ctx.candidateName} for ${ctx.officeSought}

Paid for by ${ctx.committeeName}`,
  };
}

export function renderEmailForOutcome(ctx: EmailContext): RenderedEmail | null {
  if (ctx.donor.outcome === "pledged") return renderPledgeEmail(ctx);
  if (ctx.donor.outcome === "declined" || ctx.donor.outcome === "unsure") {
    return renderGraciousEmail(ctx);
  }
  // no_answer / null: no email auto-fires. The call time manager decides next steps.
  return null;
}

// ---------------------------------------------------------------------------
// PLUG IN YOUR KEY: set RESEND_API_KEY in your environment to actually send
// email. Get one at https://resend.com — they have a generous free tier and
// the simplest API of the transactional email providers for a prototype.
// Swap this function out for SendGrid/Postmark/etc. if your campaign already
// has a relationship with one of those instead.
// ---------------------------------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "campaign@example.com";

export async function sendEmail(to: string, email: RenderedEmail) {
  if (!RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment to enable sending real emails."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: email.subject,
      text: email.body,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errText}`);
  }

  return response.json();
}
