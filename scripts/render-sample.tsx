// Renders a sample quote with no Shopify store, to work on the design: pnpm sample

import { priceQuote, type ProductLine } from "../agent/lib/pricing";
import { renderQuoteFiles } from "../agent/lib/render-quote";

const photo = (text: string) => ({
  height: 600,
  url: `https://placehold.co/600x600/png?text=${encodeURIComponent(text)}`,
  width: 600,
});

const lines: ProductLine[] = [
  {
    breaks: [
      { min: 24, unitCents: 68_00 },
      { min: 50, unitCents: 62_00 },
      { min: 100, unitCents: 58_00 },
      { min: 250, unitCents: 52_00 },
    ],
    decoration: {
      method: "Screen print, front and back",
      setupCents: 90_00,
      shipCentsPerUnit: 1_10,
    },
    handle: "heavyweight-hoodie",
    image: photo("Hoodie"),
    title: "Heavyweight Hoodie",
    variants: [
      { label: "Black / S", qty: 18 },
      { label: "Black / M", qty: 40 },
      { label: "Black / L", qty: 38 },
      { label: "Black / XL", qty: 24, shortBy: 6 },
      { label: "Heather Grey / M", qty: 12 },
      { label: "Heather Grey / L", qty: 8 },
    ],
  },
  {
    breaks: [
      { min: 100, unitCents: 2_00 },
      { min: 250, unitCents: 1_60 },
      { min: 500, unitCents: 1_20 },
      { min: 1000, unitCents: 90 },
    ],
    decoration: { method: "Die-cut vinyl, full color", setupCents: 0, shipCentsPerUnit: 2 },
    handle: "die-cut-sticker",
    image: photo("Sticker"),
    title: "Die-cut Sticker",
    variants: [{ label: "3 in", qty: 200 }],
  },
  {
    breaks: [
      { min: 24, unitCents: 38_00 },
      { min: 50, unitCents: 35_00 },
      { min: 100, unitCents: 32_00 },
    ],
    decoration: { method: "Embroidered front", setupCents: 60_00, shipCentsPerUnit: 45 },
    handle: "dad-cap",
    image: photo("Cap"),
    title: "Structured Cap",
    variants: [{ label: "Bone", qty: 60 }],
  },
];

async function main() {
  const issued = new Date();
  const quote = priceQuote(lines, { issued, rush: false });
  const result = await renderQuoteFiles("sample", quote, {
    approveUrl: "https://example.com/approve",
    currency: "USD",
    issued,
    number: "Q-SAMPLE-v2",
    pageUrl: "http://localhost:3000/quotes/sample/quote.html",
    preparedFor: "Acme Robotics",
    project: "Team offsite in San Francisco",
    replaces: "Q-SAMPLE-v1",
    review: ["Asked for 10% off the hoodies if they order 300"],
    shippingAtCheckout: false,
    shopEmail: "orders@merchwell.example",
    shopName: "Merchwell",
    supersededBy: null,
    validUntil: new Date(issued.getTime() + 14 * 86_400_000),
    version: 2,
  });
  console.log(`Total ${quote.total / 100} USD · ${quote.pieces} pieces → public/quotes/sample`);
  if (result.warnings) console.log(result.warnings);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
