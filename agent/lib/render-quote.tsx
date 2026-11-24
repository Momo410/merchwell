import { mkdirSync, writeFileSync } from "node:fs";
// Renders one priced quote to all four outputs from the same Hyper Elements design.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ElementsError, formatDiagnostics, render } from "@hyper-elements/react";
import { renderImage } from "@hyper-elements/react/image";
import { renderPdf, templateAssets } from "@hyper-elements/react/pdf";

import type { PricedQuote } from "./pricing";
import { QuoteCard, QuoteDocument, QuoteEmail, type QuoteMeta, QuotePage } from "./quote-design";

const FONT_FILES = [
  ["Geist", "Geist-Regular", 400],
  ["Geist", "Geist-Medium", 500],
  ["Geist", "Geist-SemiBold", 600],
  ["Geist", "Geist-Bold", 700],
  ["Geist Mono", "GeistMono-Regular", 400],
  ["Geist Mono", "GeistMono-Medium", 500],
  ["Geist Pixel Circle", "GeistPixel-Circle", 400],
] as const;

// The PDF and image renderers read TTF files (not WOFF2), kept in agent/fonts under the OFL.
export async function signalFonts() {
  return Promise.all(
    FONT_FILES.map(async ([family, file, weight]) => ({
      family,
      src: await readFile(join(process.cwd(), "agent", "fonts", `${file}.ttf`)),
      weight,
    })),
  );
}

// The PDF and the image draw offline, so every image the design names is fetched once and handed over.
export async function imageBytes(srcs: string[]) {
  const entries = await Promise.all(
    srcs.map(async (src) => {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`Could not fetch ${src} (HTTP ${response.status})`);
      return [src, new Uint8Array(await response.arrayBuffer())] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function renderQuoteEmail(quote: PricedQuote, meta: QuoteMeta) {
  const { html, text } = await render(<QuoteEmail meta={meta} quote={quote} />);
  return { html, text };
}

export async function renderQuoteFiles(dir: string, quote: PricedQuote, meta: QuoteMeta) {
  mkdirSync(dir, { recursive: true });
  try {
    const page = await render(<QuotePage meta={meta} quote={quote} />);
    const email = await render(<QuoteEmail meta={meta} quote={quote} />);
    writeFileSync(join(dir, "quote.html"), page.html);
    writeFileSync(join(dir, "email.html"), email.html);
    writeFileSync(join(dir, "email.txt"), email.text);

    const fonts = await signalFonts();
    const doc = <QuoteDocument meta={meta} quote={quote} />;
    const { pdf } = await renderPdf(doc, {
      date: meta.issued,
      fonts,
      images: await imageBytes(templateAssets(doc).images),
    });
    writeFileSync(join(dir, "quote.pdf"), pdf);

    const { image } = await renderImage(<QuoteCard meta={meta} quote={quote} />, { fonts });
    writeFileSync(join(dir, "card.png"), image);

    const warnings = [...page.diagnostics, ...email.diagnostics];
    return { warnings: warnings.length ? formatDiagnostics(warnings) : null };
  } catch (error) {
    if (error instanceof ElementsError)
      throw new Error(formatDiagnostics(error.diagnostics), { cause: error });
    throw error;
  }
}
