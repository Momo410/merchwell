// Quote leads: the Shopify customer record, the quote email through Resend, and the per-cart send log.
import { createHash } from "node:crypto";

import { adminQuery, getAdminToken } from "./shopify-admin";
import { readJson, saveJson } from "./storage";

export const LEAD_TAG = "quote-lead";
export const LEAD_CODE = { code: "MERCHWELL10", minPieces: 24, percent: 10 } as const;
// One cart can send the quote to a few addresses (a buyer and their manager), not an unlimited list.
const MAX_SENDS_PER_CART = 3;

export interface Lead {
  email: string;
  name: string;
  phone?: string;
}

interface SendLog {
  sends: { at: string; email: string; quote: string }[];
}

const logKey = (cartId: string) =>
  `data/leads/${createHash("sha256").update(cartId).digest("hex").slice(0, 24)}.json`;

async function readLog(cartId: string): Promise<SendLog> {
  return (await readJson<SendLog>(logKey(cartId))) ?? { sends: [] };
}

export async function checkSendLimit(cartId: string, email: string, quote: string) {
  const { sends } = await readLog(cartId);
  if (sends.some((s) => s.quote === quote && s.email === email.toLowerCase()))
    return "This quote was already sent to that address.";
  if (sends.length >= MAX_SENDS_PER_CART)
    return "This cart already sent its quote to the most addresses allowed.";
  return null;
}

export async function logSend(cartId: string, email: string, quote: string) {
  const log = await readLog(cartId);
  log.sends.push({ at: new Date().toISOString(), email: email.toLowerCase(), quote });
  await saveJson(logKey(cartId), log);
}

const CUSTOMER_LOOKUP = `#graphql
  query LeadCustomer($email: String!) {
    customerByIdentifier(identifier: { emailAddress: $email }) { id }
  }`;

const CUSTOMER_CREATE = `#graphql
  mutation LeadCustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }`;

const TAGS_ADD = `#graphql
  mutation LeadCustomerTag($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) { userErrors { message } }
  }`;

type UserErrors = { field: string[] | null; message: string }[];

// New leads become Shopify customers tagged quote-lead; a returning email only gains the tag.
export async function saveLeadCustomer(lead: Lead, note: string) {
  const token = await getAdminToken();
  if (!token) return { ok: false as const, reason: "Shopify Admin is not configured." };
  const { customerByIdentifier } = await adminQuery<{
    customerByIdentifier: { id: string } | null;
  }>(token, CUSTOMER_LOOKUP, { email: lead.email });
  if (customerByIdentifier) {
    const { tagsAdd } = await adminQuery<{ tagsAdd: { userErrors: { message: string }[] } }>(
      token,
      TAGS_ADD,
      { id: customerByIdentifier.id, tags: [LEAD_TAG] },
    );
    if (tagsAdd.userErrors.length)
      return { ok: false as const, reason: tagsAdd.userErrors[0].message };
    return { ok: true as const, status: "existing" as const };
  }
  const [firstName, ...rest] = lead.name.trim().split(/\s+/);
  const create = (phone?: string, extraNote = "") =>
    adminQuery<{ customerCreate: { customer: { id: string } | null; userErrors: UserErrors } }>(
      token,
      CUSTOMER_CREATE,
      {
        input: {
          email: lead.email,
          firstName,
          lastName: rest.join(" ") || undefined,
          note: note + extraNote,
          phone,
          tags: [LEAD_TAG],
        },
      },
    );
  let { customerCreate } = await create(lead.phone);
  // Shopify rejects phones that aren't valid E.164 or already belong to someone; keep the number in the note.
  if (lead.phone && customerCreate.userErrors.some((e) => e.field?.includes("phone")))
    ({ customerCreate } = await create(undefined, `\nPhone: ${lead.phone}`));
  if (!customerCreate.customer)
    return {
      ok: false as const,
      reason: customerCreate.userErrors.map((e) => e.message).join("; "),
    };
  return { ok: true as const, status: "created" as const };
}

export interface QuoteEmail {
  html: string;
  pdf: Buffer | null;
  pdfName: string;
  replyTo: string;
  subject: string;
  text: string;
  to: string;
}

// Resend's REST API; without RESEND_API_KEY the email is skipped and the lead still reaches the owner.
export async function sendQuoteEmail(email: QuoteEmail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[leads] RESEND_API_KEY is not set, so the quote email was skipped.");
    return { ok: false as const, reason: "Email is not set up yet.", skipped: true };
  }
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      attachments: email.pdf
        ? [{ content: email.pdf.toString("base64"), filename: email.pdfName }]
        : [],
      from: process.env.QUOTE_EMAIL_FROM || "Merchwell <quotes@send.dripnex.com>",
      html: email.html,
      reply_to: email.replyTo,
      subject: email.subject,
      text: email.text,
      to: [email.to],
    }),
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      // Resend drops a repeat with the same key for 24 hours, so a retried turn can't email twice.
      "idempotency-key": `${email.pdfName}-${createHash("sha256").update(email.to).digest("hex").slice(0, 16)}`,
    },
    method: "POST",
  });
  if (response.ok) return { ok: true as const, skipped: false };
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  console.error(`[leads] Resend refused the quote email: ${body.message ?? response.status}`);
  return { ok: false as const, reason: body.message ?? `HTTP ${response.status}`, skipped: false };
}
