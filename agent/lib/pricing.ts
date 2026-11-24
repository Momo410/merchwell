// Merch quote math. Pure functions over cents, no I/O, so every number on a quote can be tested.
// Price breaks and decoration setup come from Shopify product metafields; the model never supplies amounts.
import { z } from "zod";

export const priceBreaksSchema = z
  .array(
    z.strictObject({ min: z.number().int().positive(), unitCents: z.number().int().positive() }),
  )
  .min(1);
export const decorationSchema = z.strictObject({
  method: z.string().min(1),
  setupCents: z.number().int().min(0),
  shipCentsPerUnit: z.number().int().min(0),
});

export type PriceBreak = z.infer<typeof priceBreaksSchema>[number];
export type Decoration = z.infer<typeof decorationSchema>;

export interface ProductLine {
  breaks: PriceBreak[];
  decoration: Decoration;
  handle: string;
  image: { height: number; url: string; width: number } | null;
  title: string;
  // shortBy: pieces Shopify can't cover right now (0 when in stock or untracked).
  variants: { label: string; qty: number; shortBy?: number }[];
}

export const STANDARD_DAYS = 10;
export const RUSH_DAYS = 5;
export const RUSH_RATE = 0.2;
export const SHIPPING_DAYS = 3;
export const FREE_SHIPPING_CENTS = 2_500_00;

// Quantities of every size and color of one product count toward its price break, as merch printers price them.
export function priceProduct(line: ProductLine) {
  const breaks = [...line.breaks].sort((a, b) => a.min - b.min);
  const qty = line.variants.reduce((sum, v) => sum + v.qty, 0);
  const tierIndex = breaks.findLastIndex((b) => qty >= b.min);
  const tier = breaks[Math.max(tierIndex, 0)];
  const next = breaks[Math.max(tierIndex, 0) + 1];
  const amount = tier.unitCents * qty;
  return {
    amount,
    belowMinimum: tierIndex < 0 ? breaks[0].min : null,
    decoration: line.decoration.method,
    handle: line.handle,
    image: line.image,
    // What one more step on the ladder would cost, and what it saves per piece.
    nextBreak: next
      ? {
          addQty: next.min - qty,
          min: next.min,
          savesPerUnit: tier.unitCents - next.unitCents,
          unitCents: next.unitCents,
        }
      : null,
    qty,
    savings: (breaks[0].unitCents - tier.unitCents) * qty,
    // Logo setup is on the house, so a quote never adds a fee the cart and checkout don't show.
    setupCents: 0,
    shippingCents: line.decoration.shipCentsPerUnit * qty,
    tierLabel: next ? `${tier.min}–${next.min - 1}` : `${tier.min}+`,
    title: line.title,
    unitCents: tier.unitCents,
    variants: line.variants.filter((v) => v.qty > 0),
  };
}

export type PricedProduct = ReturnType<typeof priceProduct>;

export function addBusinessDays(from: Date, days: number) {
  const date = new Date(from);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) left -= 1;
  }
  return date;
}

export function priceQuote(lines: ProductLine[], options: { issued: Date; rush: boolean }) {
  const products = lines.map(priceProduct);
  const items = products.reduce((sum, p) => sum + p.amount, 0);
  const setup = products.reduce((sum, p) => sum + p.setupCents, 0);
  const rush = options.rush ? Math.round(items * RUSH_RATE) : 0;
  const shippingEstimate = products.reduce((sum, p) => sum + p.shippingCents, 0);
  const shipping = items >= FREE_SHIPPING_CENTS ? 0 : shippingEstimate;
  const productionDays = options.rush ? RUSH_DAYS : STANDARD_DAYS;
  return {
    freeShippingGap: shipping ? FREE_SHIPPING_CENTS - items : 0,
    inHands: addBusinessDays(options.issued, productionDays + SHIPPING_DAYS),
    pieces: products.reduce((sum, p) => sum + p.qty, 0),
    shortPieces: products.reduce(
      (sum, p) => sum + p.variants.reduce((s, v) => s + (v.shortBy ?? 0), 0),
      0,
    ),
    productionDays,
    products,
    rush,
    savings: products.reduce((sum, p) => sum + p.savings, 0),
    setup,
    shipping,
    shippingEstimate,
    subtotal: items,
    total: items + setup + rush + shipping,
  };
}

export type PricedQuote = ReturnType<typeof priceQuote>;
