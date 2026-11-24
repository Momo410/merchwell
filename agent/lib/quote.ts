// Turns the session's Shopify cart into a versioned merch quote: web page, email, PDF and share card.
// Every amount comes from Shopify (price-break metafields, else the cart price); the model never supplies one.
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { shopConfig } from "../../lib/config";
import type { getCart } from "./cart";
import { type PricedQuote, priceQuote, type ProductLine } from "./pricing";
import type { QuoteMeta } from "./quote-design";
import { renderQuoteFiles } from "./render-quote";
import {
  adminQuery,
  fetchMerchPricing,
  fetchVariantStock,
  getAdminToken,
  stockShortfall,
} from "./shopify-admin";

type Cart = NonNullable<Awaited<ReturnType<typeof getCart>>>;

const PRICE_LOCK_DAYS = 14;
const DAY = 86_400_000;
// Version history stays server-side, keyed by a hash of the cart id so the id itself is never stored.
const HISTORY_DIR = join(process.cwd(), ".data", "quotes");

interface StoredVersion {
  id: string;
  meta: QuoteMeta;
  quote: PricedQuote;
  signature: string;
}

interface History {
  base: string;
  versions: StoredVersion[];
}

const cents = (amount: string) => Math.round(Number(amount) * 100);
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(value / 100);
const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
const linksFor = (id: string) => ({
  card: `/quotes/${id}/card.png`,
  email: `/quotes/${id}/email.html`,
  page: `/quotes/${id}/quote.html`,
  pdf: `/quotes/${id}/quote.pdf`,
});

function historyPath(cartId: string) {
  return join(
    HISTORY_DIR,
    `${createHash("sha256").update(cartId).digest("hex").slice(0, 24)}.json`,
  );
}

function readHistory(cartId: string): History | null {
  const path = historyPath(cartId);
  if (!existsSync(path)) return null;
  const history = JSON.parse(readFileSync(path, "utf8")) as History;
  for (const v of history.versions) {
    v.meta.issued = new Date(v.meta.issued);
    v.meta.validUntil = new Date(v.meta.validUntil);
    v.quote.inHands = new Date(v.quote.inHands);
  }
  return history;
}

async function fetchShop() {
  const fallback = {
    email: `orders@${new URL(shopConfig.site.url).hostname}`,
    name: shopConfig.site.name,
  };
  try {
    const token = await getAdminToken();
    if (!token) return fallback;
    const { shop } = await adminQuery<{ shop: { contactEmail: string | null; name: string } }>(
      token,
      "query QuoteShop { shop { contactEmail name } }",
      {},
    );
    // The storefront brand names the quote; a dev store keeps its placeholder shop name in Shopify.
    return { email: shop.contactEmail || fallback.email, name: fallback.name || shop.name };
  } catch {
    return fallback;
  }
}

// One ProductLine per product: every size and color of it counts toward the same price break.
async function cartToLines(cart: Cart) {
  const nodes = cart.lines.nodes;
  const [pricing, stock] = await Promise.all([
    fetchMerchPricing(nodes.map((line) => line.merchandise.product.id)).catch(() => new Map()),
    fetchVariantStock(nodes.map((line) => line.merchandise.id)).catch(() => null),
  ]);
  const lines = new Map<string, ProductLine>();
  let shippingAtCheckout = false;
  for (const node of nodes) {
    const { product } = node.merchandise;
    const merch = pricing.get(product.id);
    if (!merch?.decoration) shippingAtCheckout = true;
    const line: ProductLine = lines.get(product.id) ?? {
      breaks: merch?.breaks ?? [{ min: 1, unitCents: cents(node.cost.amountPerQuantity.amount) }],
      decoration: merch?.decoration ?? {
        method: "Decoration confirmed on your proof",
        setupCents: 0,
        shipCentsPerUnit: 0,
      },
      handle: product.handle,
      image: node.merchandise.image
        ? {
            height: node.merchandise.image.height ?? 600,
            url: node.merchandise.image.url,
            width: node.merchandise.image.width ?? 600,
          }
        : null,
      title: product.title,
      variants: [],
    };
    const label = node.merchandise.selectedOptions
      .filter((o) => o.value !== "Default Title")
      .map((o) => o.value)
      .join(" / ");
    line.variants.push({
      label: label || "Standard",
      qty: node.quantity,
      shortBy: stock ? stockShortfall(stock.get(node.merchandise.id), node.quantity) : 0,
    });
    lines.set(product.id, line);
  }
  return { lines: [...lines.values()], shippingAtCheckout, stockChecked: Boolean(stock) };
}

export interface QuoteRequest {
  cart: Cart;
  cartId: string;
  preparedFor?: string;
  project?: string;
  requests: string[];
  rush: boolean;
}

export async function writeQuote(input: QuoteRequest) {
  const currency = input.cart.cost.totalAmount.currencyCode;
  const { lines, shippingAtCheckout, stockChecked } = await cartToLines(input.cart);
  const signature = JSON.stringify({
    items: input.cart.lines.nodes.map((n) => [n.merchandise.id, n.quantity]).sort(),
    preparedFor: input.preparedFor ?? null,
    project: input.project ?? null,
    requests: [...input.requests].sort(),
    rush: input.rush,
  });

  const history = readHistory(input.cartId);
  const latest = history?.versions.at(-1);
  const now = new Date();
  // Same cart, same asks, lock still running: the customer keeps the quote (and prices) they already have.
  if (latest && latest.signature === signature && latest.meta.validUntil > now) {
    return summarize(latest, currency, { stockChecked, unchanged: true });
  }

  const shop = await fetchShop();
  const base =
    history?.base ??
    `Q-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const version = (latest?.meta.version ?? 0) + 1;
  const id = `${base}-v${version}`;
  const site = shopConfig.site.url;
  const quote = priceQuote(lines, { issued: now, rush: input.rush });
  const meta: QuoteMeta = {
    approveUrl: `mailto:${shop.email}?subject=${encodeURIComponent(`Approve quote ${id}`)}`,
    currency,
    issued: now,
    number: id,
    pageUrl: new URL(linksFor(id).page, site).href,
    preparedFor: input.preparedFor?.trim() || "Your team",
    project: input.project?.trim() || null,
    replaces: latest?.meta.number ?? null,
    review: input.requests,
    shippingAtCheckout,
    shopEmail: shop.email,
    shopName: shop.name,
    supersededBy: null,
    validUntil: new Date(now.getTime() + PRICE_LOCK_DAYS * DAY),
    version,
  };
  const current: StoredVersion = { id, meta, quote, signature };
  await renderQuoteFiles(join(process.cwd(), "public", "quotes", id), quote, meta);

  // The old link stays live but says it was replaced, so nobody approves stale prices.
  if (latest && !latest.meta.supersededBy) {
    latest.meta.supersededBy = { number: id, url: meta.pageUrl ?? linksFor(id).page };
    await renderQuoteFiles(
      join(process.cwd(), "public", "quotes", latest.id),
      latest.quote,
      latest.meta,
    );
  }

  mkdirSync(HISTORY_DIR, { recursive: true });
  writeFileSync(
    historyPath(input.cartId),
    JSON.stringify({ base, versions: [...(history?.versions ?? []), current] }),
  );
  return summarize(current, currency, { stockChecked, unchanged: false });
}

const itemsOf = (cart: Cart) =>
  JSON.stringify(cart.lines.nodes.map((n) => [n.merchandise.id, n.quantity]).sort());

// The latest quote for this cart, only while it still matches the cart and its price lock runs.
export function currentQuote(cart: Cart, cartId: string) {
  const latest = readHistory(cartId)?.versions.at(-1);
  if (!latest || latest.meta.validUntil <= new Date()) return null;
  const quoted = JSON.stringify((JSON.parse(latest.signature) as { items: unknown }).items);
  if (quoted !== itemsOf(cart)) return null;
  const currency = cart.cost.totalAmount.currencyCode;
  return {
    currency,
    dir: join(process.cwd(), "public", "quotes", latest.id),
    meta: latest.meta,
    order: latest.quote.products.map((p) => `${p.qty} × ${p.title}`).join(", "),
    quote: latest.quote,
    total: money(latest.quote.total, currency),
  };
}

function summarize(
  v: StoredVersion,
  currency: string,
  extra: { stockChecked: boolean; unchanged: boolean },
) {
  const { meta, quote } = v;
  // The lines that add up to the total, so the chat can show why it is more than the cart.
  const breakdown = [
    { label: `${quote.pieces} pieces`, value: money(quote.subtotal, currency) },
    { label: "Logo setup", value: quote.setup ? money(quote.setup, currency) : "Free" },
    ...(quote.rush ? [{ label: "Rush", value: money(quote.rush, currency) }] : []),
    meta.shippingAtCheckout
      ? { label: "Shipping", value: "At checkout" }
      : { label: "Shipping", value: quote.shipping ? money(quote.shipping, currency) : "Free" },
  ];
  return {
    ...linksFor(v.id),
    breakdown,
    needsReview: meta.review.length > 0,
    // What the agent can offer next: one step up each product's price ladder.
    nextBreaks: quote.products
      .filter((p) => p.nextBreak)
      .map(
        (p) =>
          `${p.title}: order ${p.nextBreak!.min} or more (${p.nextBreak!.addQty} more) and each drops to ${money(p.nextBreak!.unitCents, currency)}`,
      ),
    // Products under their first price break; the quote prices them at that break, so the shopper should hear it.
    belowMinimum: quote.products
      .filter((p) => p.belowMinimum)
      .map(
        (p) =>
          `${p.title}: ${p.qty} pieces, minimum ${p.belowMinimum}, priced at the ${p.belowMinimum}-piece price`,
      ),
    // Every quoted line, so the agent can check each size and quantity the shopper asked for made it in.
    lines: quote.products.flatMap((p) => p.variants.map((x) => `${p.title} ${x.label}: ${x.qty}`)),
    pieces: quote.pieces,
    priceLockedUntil: longDate(meta.validUntil),
    quoteNumber: meta.number,
    // Quote history follows the cart, so the chat omits the replaced quote a fresh session never showed.
    shortInStock: quote.products.flatMap((p) =>
      p.variants.filter((x) => x.shortBy).map((x) => `${p.title} ${x.label}: ${x.shortBy} short`),
    ),
    stockChecked: extra.stockChecked,
    total: money(quote.total, currency),
    unchanged: extra.unchanged,
    version: meta.version,
  };
}
