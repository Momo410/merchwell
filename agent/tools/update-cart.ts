import { defineTool } from "eve/tools";
import { z } from "zod";

import { fetchProductVariantBySelectedOptions } from "../../lib/shopify/operations/products/server";
import { getCart, getSessionCartId, mutateCart } from "../lib/cart";
import { productOptionsSchema } from "../lib/catalog";
import { fetchVariantStock, stockShortfall } from "../lib/shopify-admin";

const lineIdSchema = z.string().regex(/^gid:\/\/shopify\/CartLine\/[^\s]+$/);

const discountCodeSchema = z.string().trim().min(1).max(255);

const changeSchema = z.discriminatedUnion("action", [
  z
    .strictObject({
      action: z.literal("add"),
      lines: z
        .array(
          z.strictObject({
            quantity: z.number().int().min(1).max(5000).default(1),
            variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/[0-9]+$/),
          }),
        )
        .min(1)
        .max(20),
    })
    .describe(
      "Add ProductVariant IDs that get-product-details shows as available and matching the requested options. Put every line of one request, such as each size, in this one call.",
    ),
  z
    .strictObject({
      action: z.literal("set-quantity"),
      lineId: lineIdSchema,
      quantity: z.number().int().min(0).max(5000),
    })
    .describe("Set a cart line's quantity; 0 removes the line."),
  z
    .strictObject({
      action: z.literal("change-options"),
      lineId: lineIdSchema,
      options: productOptionsSchema,
    })
    .describe("Change a cart line's options, such as its size or color, keeping its quantity."),
  z
    .strictObject({ action: z.literal("apply-discount"), code: discountCodeSchema })
    .describe(
      "Apply a discount code the shopper typed. Never guess, suggest, or try codes the shopper did not give.",
    ),
  z
    .strictObject({ action: z.literal("remove-discount"), code: discountCodeSchema })
    .describe("Remove a discount code from the cart."),
  z
    .strictObject({ action: z.literal("set-note"), note: z.string().max(1000) })
    .describe("Replace the cart note; keep any existing text the shopper wants to keep."),
]);

type CartChange = z.infer<typeof changeSchema>;

// Live stock before the cart changes; Shopify checks again at checkout, so this only saves a surprise.
async function checkStock(variantId: string, quantity: number) {
  const stock = await fetchVariantStock([variantId]).catch(() => null);
  const variant = stock?.get(variantId);
  const short = stockShortfall(variant, quantity);
  if (!short || !variant || variant.available === null) return null;
  return {
    available: variant.available,
    error: `Only ${variant.available} in stock right now, ${short} short of ${quantity}. Nothing was changed.`,
  };
}

async function changeLineOptions(
  cartId: string,
  { lineId, options }: Extract<CartChange, { action: "change-options" }>,
) {
  const line = (await getCart(cartId))?.lines.nodes.find((node) => node.id === lineId);
  if (!line) return { error: "This line is not in the current cart." };
  if ("parentRelationship" in line && line.parentRelationship)
    return { error: "Change this item through the item it belongs to." };

  const selection = new Map(
    line.merchandise.selectedOptions.map((option) => [option.name.toLowerCase(), option]),
  );
  for (const option of options) selection.set(option.name.toLowerCase(), option);
  const result = await fetchProductVariantBySelectedOptions({
    handle: line.merchandise.product.handle,
    selectedOptions: [...selection.values()].map(({ name, value }) => ({ name, value })),
  });
  if (!result) return { error: "This product is no longer available." };
  const optionNames = new Set(result.options.map((option) => option.name.toLowerCase()));
  if (!options.length || options.some((option) => !optionNames.has(option.name.toLowerCase())))
    return { error: "Name options this product has.", options: result.options };

  const { variant } = result;
  if (!variant) return { error: "No variant has those options.", options: result.options };
  if (variant.id === line.merchandise.id) return { error: "This line already has those options." };
  if (!variant.availableForSale) return { error: "That option is sold out." };

  const sellingPlanId = line.sellingPlanAllocation?.sellingPlan.id;
  if (variant.requiresComponents || (variant.requiresSellingPlan && !sellingPlanId))
    return { error: "Choose that option on the product page." };

  return mutateCart(cartId, {
    lines: [
      {
        id: lineId,
        merchandiseId: variant.id,
        quantity: line.quantity,
        ...(sellingPlanId ? { sellingPlanId } : {}),
      },
    ],
  });
}

async function changeDiscountCodes(cartId: string, apply: boolean, code: string) {
  const cart = await getCart(cartId);
  if (!cart) return { error: "Cart is unavailable. Refresh the storefront." };
  const normalized = code.toUpperCase();
  const codes = cart.discountCodes.map((discount) => discount.code);
  const present = codes.some((existing) => existing.toUpperCase() === normalized);
  if (apply && present) return { error: "That code is already on the cart." };
  if (!apply && !present) return { error: "That code is not on the cart." };
  return mutateCart(cartId, {
    discountCodes: apply
      ? [...codes, normalized]
      : codes.filter((existing) => existing.toUpperCase() !== normalized),
  });
}

export default defineTool({
  description:
    "Change the shopper's cart, one change per call, only when they ask; one add call takes every line the shopper asked for at once. Adding or raising a quantity checks live Shopify stock first and returns the available count when it is short. Read get-cart before changing an existing line, discount code, or the note. Never retry an uncertain change.",
  inputSchema: z.strictObject({ change: changeSchema }),
  execute: async ({ change }, ctx) => {
    const cartId = getSessionCartId(ctx);
    if (!cartId) return { error: "Open the storefront to change your cart." };
    switch (change.action) {
      case "add": {
        const lines = (await getCart(cartId))?.lines.nodes ?? [];
        const shortfalls = (
          await Promise.all(
            change.lines.map(async ({ quantity, variantId }) => {
              const existing = lines.find((line) => line.merchandise.id === variantId);
              const short = await checkStock(variantId, quantity + (existing?.quantity ?? 0));
              return short && { ...short, variantId };
            }),
          )
        ).filter((short) => short !== null);
        if (shortfalls.length)
          return {
            error: "Some lines are short in stock. Nothing was changed.",
            short: shortfalls,
          };
        return mutateCart(cartId, {
          lines: change.lines.map(({ quantity, variantId }) => ({
            merchandiseId: variantId,
            quantity,
          })),
        });
      }
      case "set-quantity": {
        const cart = await getCart(cartId);
        const line = cart?.lines.nodes.find((node) => node.id === change.lineId);
        if (!line) return { error: "This line is not in the current cart." };
        const short =
          change.quantity > line.quantity
            ? await checkStock(line.merchandise.id, change.quantity)
            : null;
        if (short) return short;
        return mutateCart(cartId, { lines: [{ id: change.lineId, quantity: change.quantity }] });
      }
      case "change-options":
        return changeLineOptions(cartId, change);
      case "apply-discount":
        return changeDiscountCodes(cartId, true, change.code);
      case "remove-discount":
        return changeDiscountCodes(cartId, false, change.code);
      case "set-note":
        return mutateCart(cartId, { note: change.note });
    }
  },
});
