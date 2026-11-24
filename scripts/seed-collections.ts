// Creates the merch smart collections (by product type) and publishes them to every sales channel.
import { adminQuery, getAdminToken } from "../agent/lib/shopify-admin";

const COLLECTIONS = [
  {
    handle: "merch",
    rules: [{ column: "TAG", condition: "merch", relation: "EQUALS" }],
    title: "All merch",
  },
  {
    handle: "apparel",
    rules: ["Hoodie", "T-shirt", "Sweatshirt"].map((type) => ({
      column: "TYPE",
      condition: type,
      relation: "EQUALS",
    })),
    title: "Apparel",
  },
  {
    handle: "headwear",
    rules: ["Cap", "Beanie"].map((type) => ({
      column: "TYPE",
      condition: type,
      relation: "EQUALS",
    })),
    title: "Headwear",
  },
  {
    handle: "drinkware-carry",
    rules: ["Mug", "Bottle", "Bag"].map((type) => ({
      column: "TYPE",
      condition: type,
      relation: "EQUALS",
    })),
    title: "Drinkware & carry",
  },
];

const token = await getAdminToken();
if (!token) throw new Error("Set the Admin client id and secret in .env.local.");
const { publications } = await adminQuery<{ publications: { nodes: { id: string }[] } }>(
  token,
  "query { publications(first: 20) { nodes { id } } }",
  {},
);
for (const c of COLLECTIONS) {
  const existing = await adminQuery<{ collectionByIdentifier: { id: string } | null }>(
    token,
    "query C($handle: String!) { collectionByIdentifier(identifier: { handle: $handle }) { id } }",
    { handle: c.handle },
  );
  let id = existing.collectionByIdentifier?.id;
  if (!id) {
    const created = await adminQuery<{
      collectionCreate: { collection: { id: string } | null; userErrors: { message: string }[] };
    }>(
      token,
      "mutation C($input: CollectionInput!) { collectionCreate(input: $input) { collection { id } userErrors { message } } }",
      {
        input: {
          handle: c.handle,
          ruleSet: { appliedDisjunctively: c.rules.length > 1, rules: c.rules },
          sortOrder: "MANUAL",
          title: c.title,
        },
      },
    );
    if (!created.collectionCreate.collection)
      throw new Error(JSON.stringify(created.collectionCreate.userErrors));
    id = created.collectionCreate.collection.id;
  }
  const pub = await adminQuery<{ publishablePublish: { userErrors: { message: string }[] } }>(
    token,
    "mutation P($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { message } } }",
    { id, input: publications.nodes.map((p) => ({ publicationId: p.id })) },
  );
  console.log(c.handle, id, JSON.stringify(pub.publishablePublish.userErrors));
}
