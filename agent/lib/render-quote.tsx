// Renders one priced quote to all four outputs from the same Hyper Elements design.
import { ElementsError, formatDiagnostics, render } from "@hyper-elements/react";
import { renderImage } from "@hyper-elements/react/image";
import { renderPdf, templateAssets } from "@hyper-elements/react/pdf";

import geistBold from "../fonts/Geist-Bold.ttf";
import geistMedium from "../fonts/Geist-Medium.ttf";
import geistRegular from "../fonts/Geist-Regular.ttf";
import geistSemiBold from "../fonts/Geist-SemiBold.ttf";
import geistMonoMedium from "../fonts/GeistMono-Medium.ttf";
import geistMonoRegular from "../fonts/GeistMono-Regular.ttf";
import geistPixelCircle from "../fonts/GeistPixel-Circle.ttf";
import type { PricedQuote } from "./pricing";
import { QuoteCard, QuoteDocument, QuoteEmail, type QuoteMeta, QuotePage } from "./quote-design";
import { saveFile } from "./storage";

// Imported as assets so the agent's deployed bundle carries them; the PDF and image renderers read TTF, not WOFF2 (OFL, agent/fonts).
const FONT_FILES = [
  ["Geist", geistRegular, 400],
  ["Geist", geistMedium, 500],
  ["Geist", geistSemiBold, 600],
  ["Geist", geistBold, 700],
  ["Geist Mono", geistMonoRegular, 400],
  ["Geist Mono", geistMonoMedium, 500],
  ["Geist Pixel Circle", geistPixelCircle, 400],
] as const;

export async function signalFonts() {
  return FONT_FILES.map(([family, dataUrl, weight]) => ({
    family,
    src: Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"),
    weight,
  }));
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

export async function renderQuoteFiles(id: string, quote: PricedQuote, meta: QuoteMeta) {
  const dir = `quotes/${id}`;
  try {
    const page = await render(<QuotePage meta={meta} quote={quote} />);
    const email = await render(<QuoteEmail meta={meta} quote={quote} />);
    await saveFile(`${dir}/quote.html`, page.html, "text/html; charset=utf-8");
    await saveFile(`${dir}/email.html`, email.html, "text/html; charset=utf-8");
    await saveFile(`${dir}/email.txt`, email.text, "text/plain; charset=utf-8");

    const fonts = await signalFonts();
    const doc = <QuoteDocument meta={meta} quote={quote} />;
    const { pdf } = await renderPdf(doc, {
      date: meta.issued,
      fonts,
      images: await imageBytes(templateAssets(doc).images),
    });
    await saveFile(`${dir}/quote.pdf`, pdf, "application/pdf");

    const { image } = await renderImage(<QuoteCard meta={meta} quote={quote} />, { fonts });
    await saveFile(`${dir}/card.png`, image, "image/png");

    const warnings = [...page.diagnostics, ...email.diagnostics];
    return { warnings: warnings.length ? formatDiagnostics(warnings) : null };
  } catch (error) {
    if (error instanceof ElementsError)
      throw new Error(formatDiagnostics(error.diagnostics), { cause: error });
    throw error;
  }
}
