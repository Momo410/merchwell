"use client";

import type { EveMessage } from "eve/react";
import { ExternalLink, FileDown, Mail } from "@/components/ui/pixel-icons";
import type { ReactNode } from "react";

import { completedOutput } from "@/lib/agent/messages";
import { AGENT_TOOL } from "@/lib/agent/tools";

interface ElementsDocument {
  breakdown: { label: string; value: string }[];
  chips: { label: string; tone: "dark" | "plain" | "red" }[];
  detail: string;
  email: string | null;
  label: string;
  page: string;
  pdf: string | null;
  value: string;
}

// Links come from the make-quote and sales-report tools, so only same-site paths render.
const isLocalPath = (value: unknown, root: string): value is string =>
  typeof value === "string" && value.startsWith(root) && !value.startsWith("//");

const emailPreview = (value: unknown, root: string) =>
  isLocalPath(value, root) ? `/email-preview.html?src=${encodeURIComponent(value)}` : null;

function quoteChips(output: Record<string, unknown>): ElementsDocument["chips"] {
  const short = Array.isArray(output.shortInStock) ? output.shortInStock.length : 0;
  return [
    {
      label: `● Price locked until ${String(output.priceLockedUntil ?? "").replace(/, \d{4}$/, "")}`,
      tone: "dark" as const,
    },
    {
      label: `v${String(output.version ?? 1)}`,
      tone: "plain" as const,
    },
    ...(output.needsReview ? [{ label: "● Needs review", tone: "red" as const }] : []),
    ...(short
      ? [{ label: `● ${short} size${short === 1 ? "" : "s"} short`, tone: "red" as const }]
      : []),
  ];
}

// Quotes made before the breakdown existed have none; the card then shows the total alone.
function readBreakdown(value: unknown): ElementsDocument["breakdown"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) =>
    row && typeof row.label === "string" && typeof row.value === "string"
      ? [{ label: row.label, value: row.value }]
      : [],
  );
}

function readDocument(name: string, value: object): ElementsDocument | null {
  const output = value as Record<string, unknown>;
  if (output.ok !== true) return null;
  if (name === AGENT_TOOL.makeQuote && isLocalPath(output.page, "/quotes/"))
    return {
      breakdown: readBreakdown(output.breakdown),
      chips: quoteChips(output),
      detail: `${String(output.pieces ?? "")} pieces`,
      email: emailPreview(output.email, "/quotes/"),
      label: `Quote ${String(output.quoteNumber ?? "")}`,
      page: output.page,
      pdf: isLocalPath(output.pdf, "/quotes/") ? output.pdf : null,
      value: String(output.total ?? ""),
    };
  if (name === AGENT_TOOL.salesReport && isLocalPath(output.page, "/reports/"))
    return {
      breakdown: [],
      chips: [
        { label: `Gross ${String(output.gross ?? "")}`, tone: "plain" },
        { label: `Refunds ${String(output.refunds ?? "").split(" ")[0]}`, tone: "plain" },
        { label: "● Net", tone: "dark" },
      ],
      detail: `${String(output.orders ?? 0)} orders · ${String(output.period ?? "")}`,
      email: emailPreview(output.email, "/reports/"),
      label: `Sales report ${String(output.reportNumber ?? "")}`,
      page: output.page,
      pdf: isLocalPath(output.pdf, "/reports/") ? output.pdf : null,
      value: String(output.net ?? ""),
    };
  return null;
}

export function DocumentCards({ message }: { message: EveMessage }) {
  // A reply that re-quotes shows only its latest version, so the shopper sees one quote to act on.
  const documents = new Map<string, ElementsDocument>();
  for (const part of message.parts) {
    if (part.type !== "tool") continue;
    const output = completedOutput(part);
    const document = output ? readDocument(part.name, output) : null;
    if (document) {
      documents.delete(part.name);
      documents.set(part.name, document);
    }
  }
  return [...documents.values()].map((document) => (
    <DocumentCard key={document.page} document={document} />
  ));
}

const CHIP_TONES = {
  dark: "border-foreground bg-foreground text-background",
  plain: "border-border bg-card text-foreground",
  red: "border-[#f3b8ba] bg-[#fdeaea] text-[var(--signal-red)]",
};

function DocumentCard({ document }: { document: ElementsDocument }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-3 p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div className="grid gap-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
            <span>{document.label}</span>
            <span>{document.detail}</span>
          </div>
          <span className="font-pixel text-2xl leading-none">{document.value}</span>
        </div>
        {document.breakdown.length > 0 && (
          <dl className="grid gap-1 border-t border-border pt-2.5 text-xs">
            {document.breakdown.map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="tabular-nums">{row.value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-medium">
              <dt>Quote total</dt>
              <dd className="tabular-nums">{document.value}</dd>
            </div>
          </dl>
        )}
        <div className="flex flex-wrap gap-1.5">
          {document.chips.map((chip) => (
            <span
              key={chip.label}
              className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${CHIP_TONES[chip.tone]}`}
            >
              {chip.label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <DocumentLink
            href={document.page}
            icon={<ExternalLink className="size-3.5" />}
            label="Page"
          />
          {document.email && (
            <DocumentLink
              href={document.email}
              icon={<Mail className="size-3.5" />}
              label="Email"
            />
          )}
          {document.pdf && (
            <DocumentLink
              href={document.pdf}
              icon={<FileDown className="size-3.5" />}
              label="PDF"
            />
          )}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
          One React tree, every output · Hyper Elements
        </p>
      </div>
    </article>
  );
}

function DocumentLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-card font-mono text-[11px] uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground"
    >
      {icon}
      {label} ›
    </a>
  );
}
