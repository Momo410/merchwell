// Seeds the merch catalog into your Shopify store: 8 products with variants, stock, photos,
// price-break and decoration metafields, published to every sales channel. Safe to re-run (matches by handle).
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/seed-merch.ts
// Needs an Admin app with write_products, write_inventory, write_publications and write_files.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { adminQuery, getAdminToken } from "../agent/lib/shopify-admin";

type Ladder = [number, number, number, number];

interface Seed {
  colors: string[];
  decoration: { method: string; setupCents: number; shipCentsPerUnit: number };
  description: string;
  handle: string;
  // Unit price in cents at 24, 50, 100 and 250 pieces.
  ladder: Ladder;
  photo: string;
  sizes: string[] | null;
  // Stock per variant, with a few low sizes so the agent has real shortfalls to report.
  stock: (color: string, size: string | null) => number;
  title: string;
  type: string;
}

const MINS = [24, 50, 100, 250];
const APPAREL = ["S", "M", "L", "XL", "XXL"];

const SEEDS: Seed[] = [
  {
    colors: ["Off White", "Black", "Heather Grey"],
    decoration: { method: "Screen print, front and back", setupCents: 90_00, shipCentsPerUnit: 1_10 },
    description: "450 gsm brushed-back fleece, dropped shoulders, double-lined hood. Built to be the one piece your team actually keeps wearing.",
    handle: "heavyweight-hoodie",
    ladder: [68_00, 62_00, 58_00, 52_00],
    photo: "hoodie",
    sizes: APPAREL,
    stock: (c, s) => (c === "Off White" && s === "XXL" ? 8 : s === "S" ? 60 : 180),
    title: "Heavyweight Hoodie",
    type: "Hoodie",
  },
  {
    colors: ["Black", "Off White", "Heather Grey"],
    decoration: { method: "Screen print, left chest and back", setupCents: 60_00, shipCentsPerUnit: 45 },
    description: "260 gsm combed cotton in a boxy cut with a dense ribbed collar. Holds its shape wash after wash.",
    handle: "boxy-tee",
    ladder: [34_00, 31_00, 28_00, 25_00],
    photo: "tee",
    sizes: ["XS", ...APPAREL],
    stock: (_c, s) => (s === "XS" ? 40 : 300),
    title: "Boxy Tee",
    type: "T-shirt",
  },
  {
    colors: ["Heather Grey", "Black"],
    decoration: { method: "Screen print, front", setupCents: 90_00, shipCentsPerUnit: 1_00 },
    description: "Loopback French terry crewneck with raglan sleeves and a clean, structured fit.",
    handle: "loopback-crewneck",
    ladder: [62_00, 56_00, 52_00, 47_00],
    photo: "crewneck",
    sizes: APPAREL,
    stock: (c, s) => (c === "Black" && s === "XL" ? 12 : 150),
    title: "Loopback Crewneck",
    type: "Sweatshirt",
  },
  {
    colors: ["Black", "Off White", "Navy"],
    decoration: { method: "Embroidered front", setupCents: 60_00, shipCentsPerUnit: 45 },
    description: "Structured six-panel cap in brushed cotton twill, with a metal slide closure.",
    handle: "six-panel-cap",
    ladder: [38_00, 35_00, 32_00, 29_00],
    photo: "cap",
    sizes: null,
    stock: () => 400,
    title: "Six-Panel Cap",
    type: "Cap",
  },
  {
    colors: ["Off White", "Black", "Signal Red"],
    decoration: { method: "Woven label on the cuff", setupCents: 60_00, shipCentsPerUnit: 30 },
    description: "Chunky rib-knit beanie in soft merino blend, with a deep fold-over cuff.",
    handle: "ribbed-beanie",
    ladder: [29_00, 26_00, 24_00, 21_00],
    photo: "beanie",
    sizes: null,
    stock: (c) => (c === "Signal Red" ? 30 : 350),
    title: "Ribbed Beanie",
    type: "Beanie",
  },
  {
    colors: ["Natural", "Black"],
    decoration: { method: "Screen print, one side", setupCents: 45_00, shipCentsPerUnit: 40 },
    description: "16 oz heavy canvas tote with long handles and an inside pocket. Fits a 16 inch laptop.",
    handle: "canvas-tote",
    ladder: [26_00, 24_00, 22_00, 19_00],
    photo: "tote",
    sizes: null,
    stock: () => 500,
    title: "Canvas Tote",
    type: "Bag",
  },
  {
    colors: ["Off White", "Black"],
    decoration: { method: "Full-wrap print, dishwasher safe", setupCents: 40_00, shipCentsPerUnit: 80 },
    description: "12 oz matte stoneware mug with a contrast handle. Heavy in the hand, made for the desk.",
    handle: "studio-mug",
    ladder: [22_00, 20_00, 18_00, 16_00],
    photo: "mug",
    sizes: null,
    stock: () => 400,
    title: "Studio Mug",
    type: "Mug",
  },
  {
    colors: ["Clear", "Black"],
    decoration: { method: "Laser engraved", setupCents: 50_00, shipCentsPerUnit: 70 },
    description: "750 ml double-wall insulated bottle. Cold for 24 hours, hot for 12, and nothing leaks.",
    handle: "insulated-bottle",
    ladder: [40_00, 37_00, 34_00, 30_00],
    photo: "bottle",
    sizes: null,
    stock: () => 300,
    title: "Insulated Bottle",
    type: "Bottle",
  },
];

const PHOTOS = join(process.cwd(), "design", "products", "square");

async function uploadPhoto(token: string, name: string) {
  const bytes = readFileSync(join(PHOTOS, `${name}.png`));
  const { stagedUploadsCreate } = await adminQuery<{
    stagedUploadsCreate: { stagedTargets: { parameters: { name: string; value: string }[]; resourceUrl: string; url: string }[]; userErrors: { message: string }[] };
  }>(
    token,
    `mutation Stage($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } }
    }`,
    { input: [{ fileSize: String(bytes.length), filename: `merchwell-${name}.png`, httpMethod: "POST", mimeType: "image/png", resource: "IMAGE" }] },
  );
  if (stagedUploadsCreate.userErrors.length) throw new Error(stagedUploadsCreate.userErrors.map((e) => e.message).join("; "));
  const target = stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([bytes], { type: "image/png" }), `merchwell-${name}.png`);
  const response = await fetch(target.url, { body: form, method: "POST" });
  if (!response.ok) throw new Error(`Photo upload failed (HTTP ${response.status})`);
  return target.resourceUrl;
}

async function main() {
  const token = await getAdminToken();
  if (!token) throw new Error("Set SHOPIFY_ADMIN_CLIENT_ID and SHOPIFY_ADMIN_CLIENT_SECRET in .env.local.");
  const { locations, publications } = await adminQuery<{
    locations: { nodes: { id: string; shipsInventory: boolean }[] };
    publications: { nodes: { id: string; name: string }[] };
  }>(token, "{ locations(first: 20) { nodes { id shipsInventory } } publications(first: 20) { nodes { id name } } }", {});
  // Stock only sells online from a location that ships; any other location makes every variant unavailable.
  const locationId = (locations.nodes.find((l) => l.shipsInventory) ?? locations.nodes[0]).id;

  for (const seed of SEEDS) {
    const existing = await adminQuery<{ productByIdentifier: { id: string } | null }>(
      token,
      "query Existing($handle: String!) { productByIdentifier(identifier: { handle: $handle }) { id } }",
      { handle: seed.handle },
    );
    const photo = await uploadPhoto(token, seed.photo);
    const sizes = seed.sizes ?? [null];
    const options = [{ name: "Color", values: seed.colors.map((name) => ({ name })) }];
    if (seed.sizes) options.push({ name: "Size", values: seed.sizes.map((name) => ({ name })) });
    const variants = seed.colors.flatMap((color) =>
      sizes.map((size) => ({
        inventoryItem: { sku: `MW-${seed.photo}-${color}${size ? `-${size}` : ""}`.toUpperCase().replaceAll(" ", ""), tracked: true },
        inventoryPolicy: "DENY",
        inventoryQuantities: [{ locationId, name: "available", quantity: seed.stock(color, size) }],
        optionValues: [{ name: color, optionName: "Color" }, ...(size ? [{ name: size, optionName: "Size" }] : [])],
        price: (seed.ladder[0] / 100).toFixed(2),
      })),
    );
    const { productSet } = await adminQuery<{
      productSet: { product: { handle: string; id: string; variantsCount: { count: number } } | null; userErrors: { field: string[]; message: string }[] };
    }>(
      token,
      `mutation Seed($input: ProductSetInput!) {
        productSet(synchronous: true, input: $input) {
          product { id handle variantsCount { count } }
          userErrors { field message }
        }
      }`,
      {
        input: {
          ...(existing.productByIdentifier ? { id: existing.productByIdentifier.id } : {}),
          descriptionHtml: `<p>${seed.description}</p><p>Branded with your logo. Minimum 24 pieces; the price per piece drops at 50, 100 and 250.</p>`,
          files: [{ alt: `${seed.title} with a Merchwell dot-matrix print`, contentType: "IMAGE", originalSource: photo }],
          handle: seed.handle,
          metafields: [
            {
              key: "price_breaks",
              namespace: "custom",
              type: "json",
              value: JSON.stringify(MINS.map((min, i) => ({ min, unitCents: seed.ladder[i] }))),
            },
            { key: "decoration", namespace: "custom", type: "json", value: JSON.stringify(seed.decoration) },
          ],
          productOptions: options,
          productType: seed.type,
          status: "ACTIVE",
          tags: ["merch"],
          title: seed.title,
          variants,
          vendor: "Merchwell",
        },
      },
    );
    if (productSet.userErrors.length || !productSet.product)
      throw new Error(`${seed.title}: ${productSet.userErrors.map((e) => `${e.field?.join(".")} ${e.message}`).join("; ")}`);

    // Stock is set explicitly: productSet only applies inventoryQuantities when it creates a variant.
    const { product } = await adminQuery<{
      product: {
        variants: {
          nodes: {
            inventoryItem: { id: string; inventoryLevels: { nodes: { id: string; location: { id: string } }[] } };
            selectedOptions: { name: string; value: string }[];
          }[];
        };
      };
    }>(
      token,
      `query Levels($id: ID!) {
        product(id: $id) {
          variants(first: 50) {
            nodes { selectedOptions { name value } inventoryItem { id inventoryLevels(first: 10) { nodes { id location { id } } } } }
          }
        }
      }`,
      { id: productSet.product.id },
    );
    const quantities = [];
    for (const variant of product.variants.nodes) {
      const color = variant.selectedOptions.find((o) => o.name === "Color")?.value ?? "";
      const size = variant.selectedOptions.find((o) => o.name === "Size")?.value ?? null;
      const itemId = variant.inventoryItem.id;
      await adminQuery(
        token,
        "mutation On($item: ID!, $loc: ID!, $key: String!) { inventoryActivate(inventoryItemId: $item, locationId: $loc) @idempotent(key: $key) { userErrors { message } } }",
        { item: itemId, key: randomUUID(), loc: locationId },
      );
      quantities.push({ changeFromQuantity: null, inventoryItemId: itemId, locationId, quantity: seed.stock(color, size) });
      for (const level of variant.inventoryItem.inventoryLevels.nodes) {
        if (level.location.id === locationId) continue;
        await adminQuery(token, "mutation Off($id: ID!) { inventoryDeactivate(inventoryLevelId: $id) { userErrors { message } } }", { id: level.id });
      }
    }
    const { inventorySetQuantities } = await adminQuery<{ inventorySetQuantities: { userErrors: { message: string }[] } }>(
      token,
      `mutation Stock($input: InventorySetQuantitiesInput!, $key: String!) {
        inventorySetQuantities(input: $input) @idempotent(key: $key) { userErrors { message } }
      }`,
      { input: { name: "available", quantities, reason: "correction" }, key: randomUUID() },
    );
    if (inventorySetQuantities.userErrors.length)
      throw new Error(`${seed.title} stock: ${inventorySetQuantities.userErrors.map((e) => e.message).join("; ")}`);

    const { publishablePublish } = await adminQuery<{ publishablePublish: { userErrors: { message: string }[] } }>(
      token,
      `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) { userErrors { message } }
      }`,
      { id: productSet.product.id, input: publications.nodes.map((p) => ({ publicationId: p.id })) },
    );
    const publishErrors = publishablePublish.userErrors.map((e) => e.message).join("; ");
    console.log(
      `${seed.title}: ${productSet.product.variantsCount.count} variants, ${existing.productByIdentifier ? "updated" : "created"}${publishErrors ? ` (publish: ${publishErrors})` : ""}`,
    );
  }
  console.log(`Published to: ${publications.nodes.map((p) => p.name).join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
