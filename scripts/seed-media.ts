// Sets each product's media to: one packshot per color (linked to that color's variants), then the
// studio hero in every color ("On model: ..."), detail close-ups per color ("Close-up, <detail>: ..."),
// then lifestyle photos, from design/products/renders-v3, -v4 (color heroes) and -v5 (close-ups). Also writes custom.highlights,
// opens custom.price_breaks and custom.highlights to the Storefront API, and gives each collection
// an image and a description. Safe to re-run: products whose media already match are skipped.
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/seed-media.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { adminQuery, getAdminToken } from "../agent/lib/shopify-admin";

const RENDER_DIRS = ["renders-v3", "renders-v4", "renders-v5"].map((dir) =>
  join(process.cwd(), "design", "products", dir),
);
const renderPath = (file: string) =>
  RENDER_DIRS.map((dir) => join(dir, `${file}.png`)).find((path) => existsSync(path));
const slug = (value: string) => value.toLowerCase().replaceAll(" ", "-");

interface Highlights {
  specs: string[];
  tiles: { caption: string; detail: string }[];
}

interface MediaSeed {
  base: string;
  // Close-ups rendered per color, in the order of highlights.tiles.
  details?: [key: string, label: string][];
  highlights: Highlights;
  // The color the original `<base>-hero` render wears; other colors use `<base>-hero-<color>`.
  heroColor: string;
  // Hero first, then lifestyle shots; alt text describes what a shopper sees.
  scenes: [file: string, alt: string][];
}

const PRODUCTS: Record<string, MediaSeed> = {
  "boxy-tee": {
    base: "tee",
    heroColor: "Black",
    highlights: {
      specs: ["260 gsm combed cotton", "Dense ribbed collar", "Boxy, cropped cut"],
      tiles: [
        { caption: "Heavy cotton", detail: "260 gsm, combed" },
        { caption: "Printed chest", detail: "Dot-matrix screen print" },
        { caption: "Boxy fit", detail: "Dropped shoulder, cropped" },
        { caption: "Holds its shape", detail: "Wash cold, tumble low" },
      ],
    },
    scenes: [
      ["tee-hero", "Man in the black Boxy Tee in a white studio"],
      ["tee-life-1", "Woman in the off-white Boxy Tee leaning on an office kitchen wall"],
      ["tee-life-2", "Man in the black Boxy Tee walking with a coffee"],
      ["tee-life-3", "Close-up of the heather grey Boxy Tee print and collar"],
    ],
  },
  "canvas-tote": {
    base: "tote",
    heroColor: "Natural",
    highlights: {
      specs: ["16 oz heavy canvas", "Fits a 16 inch laptop", "Inside pocket"],
      tiles: [
        { caption: "Heavy canvas", detail: "16 oz, unbleached" },
        { caption: "Printed one side", detail: "Dot-matrix screen print" },
        { caption: "Carries a laptop", detail: "Long handles, inside pocket" },
        { caption: "Spot clean", detail: "Gets better with wear" },
      ],
    },
    scenes: [
      ["tote-hero", "Man carrying the natural Canvas Tote in a white studio"],
      ["tote-life-1", "Woman walking out of an office lobby with the natural Canvas Tote"],
      ["tote-life-2", "Hand holding the black Canvas Tote by its handles"],
    ],
  },
  "heavyweight-hoodie": {
    base: "hoodie",
    heroColor: "Off White",
    details: [
      ["print", "print"],
      ["inside", "brushed inside"],
      ["hood", "hood"],
      ["cuff", "cuff"],
    ],
    highlights: {
      specs: ["450 gsm brushed-back fleece", "Double-lined hood", "Dropped shoulder fit"],
      tiles: [
        { caption: "Printed to last", detail: "Dot-matrix screen print" },
        { caption: "Built heavy", detail: "450 gsm, brushed inside" },
        { caption: "Double-lined hood", detail: "Flat cords, metal tips" },
        { caption: "Ribbed cuffs", detail: "2x2 rib, keeps its shape" },
      ],
    },
    scenes: [
      ["hoodie-hero", "Woman in the off-white Heavyweight Hoodie in a white studio"],
      ["hoodie-life-1", "Man in the off-white Heavyweight Hoodie in an office stairwell"],
      ["hoodie-life-2", "Woman in the black Heavyweight Hoodie at her desk"],
      ["hoodie-life-3", "Close-up of the heather grey Heavyweight Hoodie print and drawcord"],
    ],
  },
  "insulated-bottle": {
    base: "bottle",
    heroColor: "Black",
    highlights: {
      specs: ["750 ml double wall", "Cold 24 h, hot 12 h", "Leakproof cap"],
      tiles: [
        { caption: "Keeps cold", detail: "24 hours cold, 12 hot" },
        { caption: "Laser engraved", detail: "Never peels or fades" },
        { caption: "Fits a cup holder", detail: "750 ml, 7.3 cm base" },
        { caption: "Hand wash", detail: "Lid is dishwasher safe" },
      ],
    },
    scenes: [
      ["bottle-hero", "Man holding the black Insulated Bottle in a white studio"],
      ["bottle-life-1", "Woman holding the black Insulated Bottle in an office gym"],
      ["bottle-life-2", "Hand on the clear Insulated Bottle at a desk"],
    ],
  },
  "loopback-crewneck": {
    base: "crewneck",
    heroColor: "Heather Grey",
    highlights: {
      specs: ["Loopback French terry", "Raglan sleeves", "Clean, structured fit"],
      tiles: [
        { caption: "Loopback terry", detail: "Soft inside, crisp outside" },
        { caption: "Printed front", detail: "Dot-matrix screen print" },
        { caption: "Structured fit", detail: "Raglan sleeve, rib hem" },
        { caption: "Easy care", detail: "Wash cold, hang dry" },
      ],
    },
    scenes: [
      ["crewneck-hero", "Woman in the heather grey Loopback Crewneck in a white studio"],
      ["crewneck-life-1", "Woman in the heather grey Loopback Crewneck at a whiteboard"],
      ["crewneck-life-2", "Man in the black Loopback Crewneck on office steps"],
      ["crewneck-life-3", "Close-up of the Loopback Crewneck cuff and print"],
    ],
  },
  "ribbed-beanie": {
    base: "beanie",
    heroColor: "Signal Red",
    highlights: {
      specs: ["Soft merino blend", "Deep fold-over cuff", "One size"],
      tiles: [
        { caption: "Merino blend", detail: "Warm, never itchy" },
        { caption: "Woven label", detail: "Dot-matrix logo on the cuff" },
        { caption: "One size", detail: "Deep cuff, stretch rib" },
        { caption: "Hand wash", detail: "Dry flat" },
      ],
    },
    scenes: [
      ["beanie-hero", "Woman in the signal red Ribbed Beanie in a white studio"],
      ["beanie-life-1", "Man in the signal red Ribbed Beanie on a winter street"],
      ["beanie-life-2", "Woman in the off-white Ribbed Beanie"],
    ],
  },
  "six-panel-cap": {
    base: "cap",
    heroColor: "Black",
    highlights: {
      specs: ["Brushed cotton twill", "Embroidered front", "Metal slide closure"],
      tiles: [
        { caption: "Cotton twill", detail: "Brushed, structured crown" },
        { caption: "Embroidered", detail: "Dot-matrix stitch" },
        { caption: "Adjustable", detail: "Metal slide closure" },
        { caption: "Spot clean", detail: "Keeps its shape" },
      ],
    },
    scenes: [
      ["cap-hero", "Man in the black Six-Panel Cap in a white studio"],
      ["cap-life-1", "Man in the black Six-Panel Cap on a city rooftop"],
      ["cap-life-2", "Woman in the navy Six-Panel Cap"],
    ],
  },
  "studio-mug": {
    base: "mug",
    heroColor: "Off White",
    highlights: {
      specs: ["12 oz matte stoneware", "Contrast handle", "Dishwasher safe"],
      tiles: [
        { caption: "Stoneware", detail: "12 oz, matte glaze" },
        { caption: "Full-wrap print", detail: "Dishwasher safe" },
        { caption: "Heavy in the hand", detail: "Made for the desk" },
        { caption: "Microwave safe", detail: "No metal trim" },
      ],
    },
    scenes: [
      ["mug-hero", "Woman holding the off-white Studio Mug in a white studio"],
      ["mug-life-1", "Hands holding the off-white Studio Mug at a desk"],
      ["mug-life-2", "Man drinking from the black Studio Mug by a window"],
    ],
  },
};

const COLLECTIONS: Record<string, { alt: string; description: string; file: string }> = {
  apparel: {
    alt: "Three people in the Heavyweight Hoodie, Boxy Tee and Loopback Crewneck",
    description:
      "Hoodies, tees and crewnecks in heavy cotton, printed with your logo. Mix sizes and colors: every piece counts toward the same price break.",
    file: "collection-apparel",
  },
  "drinkware-carry": {
    alt: "Studio Mug, Insulated Bottle and Canvas Tote on an office desk",
    description:
      "The things that live on a desk and travel to the office: stoneware mugs, insulated bottles and heavy canvas totes.",
    file: "collection-drinkware-carry",
  },
  headwear: {
    alt: "Two friends in the Six-Panel Cap and the Ribbed Beanie",
    description:
      "Embroidered six-panel caps and merino beanies with a woven label. One size, made to be worn every day.",
    file: "collection-headwear",
  },
  merch: {
    alt: "Five coworkers wearing Merchwell hoodies, tees, crewnecks and caps",
    description:
      "Every piece in the catalog, ready for your logo. Price breaks at 24, 50, 100 and 250 pieces, and a quote in 30 seconds.",
    file: "collection-merch",
  },
};

type Token = string;

async function upload(token: Token, file: string) {
  const bytes = readFileSync(renderPath(file)!);
  const { stagedUploadsCreate } = await adminQuery<{
    stagedUploadsCreate: {
      stagedTargets: {
        parameters: { name: string; value: string }[];
        resourceUrl: string;
        url: string;
      }[];
      userErrors: { message: string }[];
    };
  }>(
    token,
    `mutation Stage($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } } }`,
    {
      input: [
        {
          fileSize: String(bytes.length),
          filename: `merchwell-${file}.png`,
          httpMethod: "POST",
          mimeType: "image/png",
          resource: "IMAGE",
        },
      ],
    },
  );
  if (stagedUploadsCreate.userErrors.length)
    throw new Error(stagedUploadsCreate.userErrors.map((e) => e.message).join("; "));
  const target = stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([bytes], { type: "image/png" }), `merchwell-${file}.png`);
  const response = await fetch(target.url, { body: form, method: "POST" });
  if (!response.ok) throw new Error(`Upload failed for ${file} (HTTP ${response.status})`);
  return target.resourceUrl;
}

// Collection images need a public CDN URL, so the render goes through Files first.
async function uploadFile(token: Token, file: string, alt: string) {
  const { fileCreate } = await adminQuery<{
    fileCreate: { files: { id: string }[]; userErrors: { message: string }[] };
  }>(
    token,
    `mutation F($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id } userErrors { message } } }`,
    { files: [{ alt, contentType: "IMAGE", originalSource: await upload(token, file) }] },
  );
  if (fileCreate.userErrors.length) throw new Error(JSON.stringify(fileCreate.userErrors));
  for (let i = 0; i < 60; i++) {
    const { node } = await adminQuery<{
      node: { fileStatus: string; image: { url: string } | null };
    }>(
      token,
      `query N($id: ID!) { node(id: $id) { ... on MediaImage { fileStatus image { url } } } }`,
      { id: fileCreate.files[0].id },
    );
    if (node.fileStatus === "READY" && node.image) return node.image.url;
    if (node.fileStatus === "FAILED") throw new Error(`File processing failed for ${file}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`File ${file} did not finish processing`);
}

async function ensureStorefrontDefinitions(token: Token) {
  const { metafieldDefinitions } = await adminQuery<{
    metafieldDefinitions: {
      nodes: { access: { storefront: string | null }; id: string; key: string }[];
    };
  }>(
    token,
    `{ metafieldDefinitions(ownerType: PRODUCT, namespace: "custom", first: 50) { nodes { id key access { storefront } } } }`,
    {},
  );
  for (const [key, name] of [
    ["highlights", "Highlights"],
    ["price_breaks", "Price breaks"],
  ] as const) {
    const existing = metafieldDefinitions.nodes.find((d) => d.key === key);
    if (existing?.access.storefront === "PUBLIC_READ") continue;
    const result = existing
      ? await adminQuery<{ metafieldDefinitionUpdate: { userErrors: { message: string }[] } }>(
          token,
          `mutation U($definition: MetafieldDefinitionUpdateInput!) { metafieldDefinitionUpdate(definition: $definition) { userErrors { message } } }`,
          {
            definition: {
              access: { storefront: "PUBLIC_READ" },
              key,
              namespace: "custom",
              ownerType: "PRODUCT",
            },
          },
        ).then((r) => r.metafieldDefinitionUpdate)
      : await adminQuery<{ metafieldDefinitionCreate: { userErrors: { message: string }[] } }>(
          token,
          `mutation C($definition: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $definition) { userErrors { message } } }`,
          {
            definition: {
              access: { storefront: "PUBLIC_READ" },
              key,
              name,
              namespace: "custom",
              ownerType: "PRODUCT",
              type: "json",
            },
          },
        ).then((r) => r.metafieldDefinitionCreate);
    if (result.userErrors.length) throw new Error(`${key}: ${JSON.stringify(result.userErrors)}`);
    console.log(`custom.${key}: storefront PUBLIC_READ`);
  }
}

type Product = {
  id: string;
  media: { nodes: { alt: string | null; id: string; status: string }[] };
  options: { name: string; values: string[] }[];
  title: string;
  variants: { nodes: { id: string; selectedOptions: { name: string; value: string }[] }[] };
};

const PRODUCT_QUERY = `query P($handle: String!) { productByIdentifier(identifier: { handle: $handle }) {
  id title options { name values } media(first: 30) { nodes { id alt status } }
  variants(first: 100) { nodes { id selectedOptions { name value } } } } }`;

const getProduct = async (token: Token, handle: string) =>
  (await adminQuery<{ productByIdentifier: Product }>(token, PRODUCT_QUERY, { handle }))
    .productByIdentifier;

async function seedProduct(token: Token, handle: string, seed: MediaSeed) {
  let product = await getProduct(token, handle);
  const colors = product.options.find((o) => o.name === "Color")?.values ?? [];
  const wanted = [
    ...colors.map((color) => ({
      alt: `${product.title} in ${color}`,
      color,
      file: `${seed.base}-${slug(color)}`,
    })),
    ...colors.flatMap((color) => {
      const file =
        color === seed.heroColor ? `${seed.base}-hero` : `${seed.base}-hero-${slug(color)}`;
      return renderPath(file)
        ? [{ alt: `On model: ${product.title} in ${color}`, color: null, file }]
        : [];
    }),
    ...(seed.details ?? []).flatMap(([key, label]) =>
      colors.flatMap((color) => {
        const file = `${seed.base}-${slug(color)}-${key}`;
        return renderPath(file)
          ? [{ alt: `Close-up, ${label}: ${product.title} in ${color}`, color: null, file }]
          : [];
      }),
    ),
    ...seed.scenes.slice(1).map(([file, alt]) => ({ alt, color: null, file })),
  ];

  const { metafieldsSet } = await adminQuery<{
    metafieldsSet: { userErrors: { message: string }[] };
  }>(
    token,
    `mutation S($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { message } } }`,
    {
      metafields: [
        {
          key: "highlights",
          namespace: "custom",
          ownerId: product.id,
          type: "json",
          value: JSON.stringify(seed.highlights),
        },
      ],
    },
  );
  if (metafieldsSet.userErrors.length) throw new Error(JSON.stringify(metafieldsSet.userErrors));

  const current = product.media.nodes.map((m) => m.alt);
  if (current.length === wanted.length && wanted.every((w, i) => current[i] === w.alt)) {
    console.log(`${product.title}: media already current`);
    return;
  }

  const old = product.media.nodes.map((m) => m.id);
  const media = [];
  for (const item of wanted)
    media.push({
      alt: item.alt,
      mediaContentType: "IMAGE",
      originalSource: await upload(token, item.file),
    });
  const { productCreateMedia } = await adminQuery<{
    productCreateMedia: { media: { id: string }[]; mediaUserErrors: { message: string }[] };
  }>(
    token,
    `mutation M($productId: ID!, $media: [CreateMediaInput!]!) { productCreateMedia(productId: $productId, media: $media) { media { id } mediaUserErrors { message } } }`,
    { media, productId: product.id },
  );
  if (productCreateMedia.mediaUserErrors.length)
    throw new Error(JSON.stringify(productCreateMedia.mediaUserErrors));
  const created = productCreateMedia.media.map((m) => m.id);

  // Media must finish processing before a variant can point at it.
  for (let i = 0; i < 60; i++) {
    product = await getProduct(token, handle);
    if (
      product.media.nodes.filter((m) => created.includes(m.id)).every((m) => m.status === "READY")
    )
      break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (old.length) {
    const { productDeleteMedia } = await adminQuery<{
      productDeleteMedia: { mediaUserErrors: { message: string }[] };
    }>(
      token,
      `mutation D($productId: ID!, $mediaIds: [ID!]!) { productDeleteMedia(productId: $productId, mediaIds: $mediaIds) { mediaUserErrors { message } } }`,
      { mediaIds: old, productId: product.id },
    );
    if (productDeleteMedia.mediaUserErrors.length)
      throw new Error(JSON.stringify(productDeleteMedia.mediaUserErrors));
  }

  const mediaFor = new Map(colors.map((color, index) => [color, created[index]]));
  const variantMedia = product.variants.nodes.map((v) => ({
    mediaIds: [mediaFor.get(v.selectedOptions.find((o) => o.name === "Color")!.value)!],
    variantId: v.id,
  }));
  const { productVariantAppendMedia } = await adminQuery<{
    productVariantAppendMedia: { userErrors: { message: string }[] };
  }>(
    token,
    `mutation V($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) { productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) { userErrors { message } } }`,
    { productId: product.id, variantMedia },
  );
  if (productVariantAppendMedia.userErrors.length)
    throw new Error(JSON.stringify(productVariantAppendMedia.userErrors));
  console.log(`${product.title}: ${created.length} media, ${variantMedia.length} variants linked`);
}

async function seedCollection(token: Token, handle: string, seed: (typeof COLLECTIONS)[string]) {
  const { collectionByIdentifier } = await adminQuery<{
    collectionByIdentifier: { id: string; image: { altText: string | null } | null } | null;
  }>(
    token,
    `query C($handle: String!) { collectionByIdentifier(identifier: { handle: $handle }) { id image { altText } } }`,
    { handle },
  );
  if (!collectionByIdentifier) throw new Error(`No collection ${handle}`);
  const input: Record<string, unknown> = {
    descriptionHtml: `<p>${seed.description}</p>`,
    id: collectionByIdentifier.id,
  };
  if (collectionByIdentifier.image?.altText !== seed.alt)
    input.image = { altText: seed.alt, src: await uploadFile(token, seed.file, seed.alt) };
  const { collectionUpdate } = await adminQuery<{
    collectionUpdate: { userErrors: { message: string }[] };
  }>(
    token,
    `mutation U($input: CollectionInput!) { collectionUpdate(input: $input) { userErrors { message } } }`,
    { input },
  );
  if (collectionUpdate.userErrors.length)
    throw new Error(JSON.stringify(collectionUpdate.userErrors));
  console.log(`collection ${handle}: ${input.image ? "image + " : ""}description`);
}

const token = await getAdminToken();
if (!token) throw new Error("Set the Admin client id and secret in .env.local.");
const only = process.argv[2];
await ensureStorefrontDefinitions(token);
for (const [handle, seed] of Object.entries(PRODUCTS))
  if (!only || handle.includes(only)) await seedProduct(token, handle, seed);
for (const [handle, seed] of Object.entries(COLLECTIONS))
  if (!only || only === "collections") await seedCollection(token, handle, seed);
