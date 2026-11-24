"use client";

import type { CartData } from "@shopify/hydrogen";

import { openQuoteAgent } from "@/components/agent/quote-trigger";
import { useCartDrawer } from "@/components/cart/context";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/ui/pixel-icons";
import { useCart, useCheckout } from "@/lib/cart/client";

import { DiscountForm } from "./discount-form";

interface CartSummaryProps {
  cart: CartData;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const { setOverlayOpen } = useCartDrawer();
  return (
    <div className="grid gap-5">
      <div className="grid gap-2.5">
        <DiscountForm cart={cart} />
        <CartTotal cart={cart} />
      </div>
      <div className="grid gap-2">
        <CartCheckout label="Go to checkout" />
        <button
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-foreground/20 font-mono text-xs tracking-[0.14em] uppercase transition-colors hover:border-foreground"
          onClick={() => {
            setOverlayOpen(false);
            openQuoteAgent("Make me a quote for my cart");
          }}
          type="button"
        >
          <span className="size-1.5 rounded-full bg-signal" />
          24+ pieces? Get a team quote
        </button>
      </div>
    </div>
  );
}

interface CartTotalProps {
  cart: CartData;
}

export function CartTotal({ cart }: CartTotalProps) {
  const isCostPending = useCart((state) =>
    Boolean(state.loading || state.pending.cost || state.revalidating),
  );
  const { amount, currencyCode } = cart.cost.totalAmount;
  return (
    <div
      aria-busy={isCostPending || undefined}
      aria-label="Estimated total"
      className="grid gap-1"
      role="group"
    >
      <div className="flex items-baseline justify-between text-foreground">
        <span className="font-mono text-xs tracking-[0.14em] uppercase">Estimated total</span>
        {isCostPending || !currencyCode ? (
          <span className="font-medium text-muted-foreground text-xl">Updating…</span>
        ) : (
          <Price amount={amount} className="font-medium text-xl" currencyCode={currencyCode} />
        )}
      </div>
      <p className="text-muted-foreground text-xs">Taxes and shipping calculated at checkout.</p>
    </div>
  );
}

interface CartCheckoutProps {
  label?: string;
}

export function CartCheckout({ label = "Checkout" }: CartCheckoutProps) {
  const {
    checkoutError,
    checkoutErrorId,
    handleCheckout,
    isCheckingOut,
    isCheckoutDisabled,
    isUpdatingCart,
  } = useCheckout();
  return (
    <div className="grid gap-2.5">
      <Button
        aria-busy={isCheckingOut || isUpdatingCart || undefined}
        aria-describedby={checkoutError ? checkoutErrorId : undefined}
        className="h-12 w-full justify-center font-mono text-xs tracking-[0.14em] uppercase"
        disabled={isCheckoutDisabled}
        onClick={handleCheckout}
        type="button"
      >
        {isCheckingOut || isUpdatingCart ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {isCheckingOut ? "Redirecting..." : isUpdatingCart ? "Updating cart..." : label}
      </Button>
      {checkoutError ? (
        <p className="text-xs text-destructive" id={checkoutErrorId} role="alert">
          {checkoutError}
        </p>
      ) : null}
    </div>
  );
}
