// Gives every color its own photo: uploads design/products/square/<product>-<color>.png and
// attaches it to that color's variants, so picking a color on the product page shows it.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { adminQuery, getAdminToken } from "../agent/lib/shopify-admin";

const PRODUCTS: Record<string, string> = {
  "boxy-tee": "tee",
  "canvas-tote": "tote",
  "heavyweight-hoodie": "hoodie",
  "insulated-bottle": "bottle",
  "loopback-crewneck": "crewneck",
  "ribbed-beanie": "beanie",
  "six-panel-cap": "cap",
  "studio-mug": "mug",
};
const PHOTOS = join(process.cwd(), "design", "products", "square");
const slug = (value: string) => value.toLowerCase().replaceAll(" ", "-");

type Product = {
  id: string;
  media: { nodes: { alt: string | null; id: string; status: string }[] };
  options: { name: string; values: string[] }[];
  variants: {
    nodes: {
      id: string;
      media: { nodes: { id: string }[] };
      selectedOptions: { name: string; value: string }[];
    }[];
  };
};

async function upload(token: string, file: string) {
  const bytes = readFileSync(join(PHOTOS, file));
  const { stagedUploadsCreate } = await adminQuery<{
    stagedUploadsCreate: {
      stagedTargets: {
        parameters: { name: string; value: string }[];
        resourceUrl: string;
        url: string;
      }[];
    };
  }>(
    token,
    `mutation Stage($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } } }`,
    {
      input: [
        {
          fileSize: String(bytes.length),
          filename: `merchwell-${file}`,
          httpMethod: "POST",
          mimeType: "image/png",
          resource: "IMAGE",
        },
      ],
    },
  );
  const target = stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([bytes], { type: "image/png" }), `merchwell-${file}`);
  const response = await fetch(target.url, { body: form, method: "POST" });
  if (!response.ok) throw new Error(`Upload failed for ${file} (HTTP ${response.status})`);
  return target.resourceUrl;
}

const PRODUCT_QUERY = `query P($handle: String!) { productByIdentifier(identifier: { handle: $handle }) {
  id options { name values } media(first: 20) { nodes { id alt status } }
  variants(first: 100) { nodes { id selectedOptions { name value } media(first: 1) { nodes { id } } } } } }`;

const token = await getAdminToken();
if (!token) throw new Error("Set the Admin client id and secret in .env.local.");
for (const [handle, base] of Object.entries(PRODUCTS)) {
  let product = (
    await adminQuery<{ productByIdentifier: Product }>(token, PRODUCT_QUERY, { handle })
  ).productByIdentifier;
  const colors = product.options.find((o) => o.name === "Color")?.values ?? [];
  const mediaFor = new Map<string, string>();
  mediaFor.set(colors[0], product.media.nodes[0].id);
  for (const color of colors.slice(1)) {
    const alt = `${base} ${color}`;
    const existing = product.media.nodes.find((m) => m.alt === alt);
    if (existing) {
      mediaFor.set(color, existing.id);
      continue;
    }
    const source = await upload(token, `${base}-${slug(color)}.png`);
    const { productCreateMedia } = await adminQuery<{
      productCreateMedia: { media: { id: string }[]; mediaUserErrors: { message: string }[] };
    }>(
      token,
      `mutation M($productId: ID!, $media: [CreateMediaInput!]!) { productCreateMedia(productId: $productId, media: $media) { media { id } mediaUserErrors { message } } }`,
      {
        media: [{ alt, mediaContentType: "IMAGE", originalSource: source }],
        productId: product.id,
      },
    );
    if (productCreateMedia.mediaUserErrors.length)
      throw new Error(JSON.stringify(productCreateMedia.mediaUserErrors));
    mediaFor.set(color, productCreateMedia.media[0].id);
  }
  // Media must finish processing before a variant can point at it.
  for (let i = 0; i < 30; i++) {
    product = (await adminQuery<{ productByIdentifier: Product }>(token, PRODUCT_QUERY, { handle }))
      .productByIdentifier;
    if (product.media.nodes.every((m) => m.status === "READY")) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  const variantMedia = product.variants.nodes
    .filter((v) => !v.media.nodes.length)
    .map((v) => ({
      mediaIds: [mediaFor.get(v.selectedOptions.find((o) => o.name === "Color")!.value)!],
      variantId: v.id,
    }));
  if (variantMedia.length) {
    const { productVariantAppendMedia } = await adminQuery<{
      productVariantAppendMedia: { userErrors: { message: string }[] };
    }>(
      token,
      `mutation A($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) { productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) { userErrors { message } } }`,
      { productId: product.id, variantMedia },
    );
    if (productVariantAppendMedia.userErrors.length)
      throw new Error(JSON.stringify(productVariantAppendMedia.userErrors));
  }
  console.log(handle, `${colors.length} colors`, `${variantMedia.length} variants linked`);
}
