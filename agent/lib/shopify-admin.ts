// Server-only Shopify Admin API access for the agent: live stock, merch price breaks and orders.
import { decorationSchema, type Decoration, type PriceBreak, priceBreaksSchema } from "./pricing";

const API_VERSION = "2026-10";

let cachedToken: { expiresAt: number; value: string } | undefined;

export const storeDomain = () => process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? "";

// Dev Dashboard apps installed on your own store get Admin tokens through the client credentials grant.
export async function getAdminToken() {
  if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return undefined;
  const response = await fetch(`https://${storeDomain()}/admin/oauth/access_token`, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    method: "POST",
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token)
    throw new Error(`Shopify did not issue an Admin token (HTTP ${response.status}).`);
  cachedToken = {
    expiresAt: Date.now() + ((json.expires_in ?? 3600) - 300) * 1000,
    value: json.access_token,
  };
  return cachedToken.value;
}

export async function adminQuery<T>(token: string, query: string, variables: object): Promise<T> {
  const response = await fetch(`https://${storeDomain()}/admin/api/${API_VERSION}/graphql.json`, {
    body: JSON.stringify({ query, variables }),
    headers: { "content-type": "application/json", "X-Shopify-Access-Token": token },
    method: "POST",
  });
  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length || !json.data)
    throw new Error(json.errors?.map((e) => e.message).join("; ") ?? `HTTP ${response.status}`);
  return json.data;
}

export interface VariantStock {
  // null when Shopify doesn't track inventory for the variant, so any quantity can be ordered.
  available: number | null;
  sellsWhenOut: boolean;
}

const STOCK_QUERY = `#graphql
  query AgentVariantStock($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant { id inventoryPolicy inventoryQuantity inventoryItem { tracked } }
    }
  }`;

type StockNode = {
  id: string;
  inventoryItem: { tracked: boolean };
  inventoryPolicy: "CONTINUE" | "DENY";
  inventoryQuantity: number | null;
} | null;

// Live stock straight from Shopify (read_inventory). Returns null when the Admin app isn't configured.
export async function fetchVariantStock(variantIds: string[]) {
  const token = await getAdminToken();
  if (!token || !variantIds.length) return null;
  const data = await adminQuery<{ nodes: StockNode[] }>(token, STOCK_QUERY, {
    ids: [...new Set(variantIds)],
  });
  const stock = new Map<string, VariantStock>();
  for (const node of data.nodes) {
    if (!node) continue;
    stock.set(node.id, {
      available: node.inventoryItem.tracked ? Math.max(0, node.inventoryQuantity ?? 0) : null,
      sellsWhenOut: node.inventoryPolicy === "CONTINUE",
    });
  }
  return stock;
}

export function stockShortfall(stock: VariantStock | undefined, qty: number) {
  if (!stock || stock.available === null || stock.sellsWhenOut) return 0;
  return Math.max(0, qty - stock.available);
}

const PRICING_QUERY = `#graphql
  query AgentMerchPricing($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        breaks: metafield(namespace: "custom", key: "price_breaks") { value }
        decoration: metafield(namespace: "custom", key: "decoration") { value }
      }
    }
  }`;

type PricingNode = {
  breaks: { value: string } | null;
  decoration: { value: string } | null;
  id: string;
} | null;

const parse = <T>(
  schema: { safeParse: (v: unknown) => { data?: T; success: boolean } },
  raw: string | undefined,
) => {
  if (!raw) return undefined;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
};

// Merch price breaks and decoration live in product metafields custom.price_breaks and custom.decoration.
export async function fetchMerchPricing(productIds: string[]) {
  const pricing = new Map<string, { breaks?: PriceBreak[]; decoration?: Decoration }>();
  const token = await getAdminToken();
  if (!token || !productIds.length) return pricing;
  const data = await adminQuery<{ nodes: PricingNode[] }>(token, PRICING_QUERY, {
    ids: [...new Set(productIds)],
  });
  for (const node of data.nodes) {
    if (!node) continue;
    pricing.set(node.id, {
      breaks: parse<PriceBreak[]>(priceBreaksSchema, node.breaks?.value),
      decoration: parse<Decoration>(decorationSchema, node.decoration?.value),
    });
  }
  return pricing;
}
