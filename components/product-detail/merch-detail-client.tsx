"use client";

import { cn } from "cn";
import Image from "next/image";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { QuoteTrigger } from "@/components/agent/quote-trigger";
import { useCartDrawer } from "@/components/cart/context";
import { Loader2, MinusIcon, PlusIcon } from "@/components/ui/pixel-icons";
import type { Image as ImageType } from "@/lib/media/types";
import { formatPrice } from "@/lib/money";
import type { Money } from "@/lib/money/types";
import { swatchColor } from "@/lib/product";
import { useProduct, useProductForm } from "@/lib/product/client";

const MAX_QUANTITY = 999;

interface MerchBuyState {
  anchor: HTMLDivElement | null;
  quantity: number;
  setAnchor: (anchor: HTMLDivElement | null) => void;
  setQuantity: (quantity: number) => void;
}

const MerchBuyContext = createContext<MerchBuyState | null>(null);

function useMerchBuy() {
  const state = useContext(MerchBuyContext);
  if (!state) throw new Error("Merch buy controls must sit inside MerchBuyProvider.");
  return state;
}

export function MerchBuyProvider({ children }: { children: ReactNode }) {
  const [quantity, setQuantity] = useState(1);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <MerchBuyContext.Provider value={{ anchor, quantity, setAnchor, setQuantity }}>
      {children}
    </MerchBuyContext.Provider>
  );
}

// Marks the in-page buy button; the sticky bar shows once it scrolls out of view.
export function MerchBuyAnchor({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { setAnchor } = useMerchBuy();
  return (
    <div ref={setAnchor} className={className}>
      {children}
    </div>
  );
}

interface MerchOptionsProps {
  tone?: "card" | "plain";
}

export function MerchOptions({ tone = "plain" }: MerchOptionsProps) {
  const { options, selectOption } = useProduct();
  const visible = options.filter((option) => option.values.length > 1);
  return (
    <div className="grid gap-4">
      {visible.map((option) => {
        const selected = option.values.find((value) => value.selected)?.name;
        const isColor = option.name.toLowerCase().includes("color");
        return (
          <fieldset key={option.name} className="grid gap-2">
            <legend className="flex w-full items-center justify-between pb-2 font-mono text-xxs tracking-[0.16em] text-muted-foreground uppercase">
              <span>{option.name}</span>
              <span className="text-foreground">{selected}</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {option.values.map((value) => (
                <button
                  key={value.name}
                  aria-label={`${option.name}: ${value.name}${value.available ? "" : " (sold out)"}`}
                  aria-pressed={value.selected}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 font-mono text-xs tracking-[0.08em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    tone === "card" ? "bg-background" : "bg-card",
                    value.selected
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    value.exists && !value.available && "line-through",
                    isColor ? "pr-3.5 pl-2" : "min-w-12 justify-center",
                  )}
                  disabled={!value.exists}
                  onClick={() => selectOption(option.name, value.name)}
                  type="button"
                >
                  {isColor ? (
                    <span
                      aria-hidden="true"
                      className="size-5 rounded-full border border-foreground/15"
                      style={{ background: swatchColor(value.name, value.swatch?.color) }}
                    />
                  ) : null}
                  {value.name}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export function MerchQuantity() {
  const { quantity, setQuantity } = useMerchBuy();
  const clamp = (value: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(value) || 1));
  return (
    <div className="grid gap-2">
      <label
        htmlFor="merch-quantity"
        className="font-mono text-xxs tracking-[0.16em] text-muted-foreground uppercase"
      >
        Quantity
      </label>
      <div className="grid h-12 w-36 grid-cols-[2.75rem_1fr_2.75rem] rounded-lg bg-card ring-1 ring-border ring-inset">
        <button
          aria-label="Decrease quantity"
          className="flex cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
          disabled={quantity <= 1}
          onClick={() => setQuantity(clamp(quantity - 1))}
          type="button"
        >
          <MinusIcon className="size-4" />
        </button>
        <input
          id="merch-quantity"
          className="w-full bg-transparent text-center font-mono text-sm tabular-nums outline-none"
          inputMode="numeric"
          max={MAX_QUANTITY}
          min={1}
          onChange={(event) => setQuantity(clamp(Number(event.target.value)))}
          type="number"
          value={quantity}
        />
        <button
          aria-label="Increase quantity"
          className="flex cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
          disabled={quantity >= MAX_QUANTITY}
          onClick={() => setQuantity(clamp(quantity + 1))}
          type="button"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

interface MerchAddButtonProps {
  className?: string;
  fallbackPrice: Money;
}

export function MerchAddButton({ className, fallbackPrice }: MerchAddButtonProps) {
  const { quantity } = useMerchBuy();
  const { formProps, pending, register, selectedVariant } = useProductForm();
  const { openOverlay } = useCartDrawer();
  const unavailable = !selectedVariant || !selectedVariant.availableForSale;
  const price = selectedVariant?.price ?? fallbackPrice;
  return (
    <form
      {...formProps({
        beforeSubmit: (event) => {
          if (unavailable || pending) {
            event.preventDefault();
            return;
          }
          openOverlay();
        },
      })}
      // A container, so the label can drop the price when the button is narrow (next to the quantity on phones).
      className={cn("@container", className)}
    >
      <input type="hidden" {...register("merchandiseId", {})} />
      <input type="hidden" {...register("quantity", { value: quantity })} />
      <button
        {...register("addToCart", {})}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 font-mono whitespace-nowrap text-sm tracking-[0.12em] text-primary-foreground uppercase transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:opacity-50"
        disabled={unavailable || pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : unavailable ? (
          "Sold out"
        ) : (
          <>
            <span className="@min-[18rem]:hidden">Add to bag</span>
            <span className="hidden items-center gap-2 @min-[18rem]:flex">
              <span className="tabular-nums">{formatPrice(price)}</span>
              <span aria-hidden="true">·</span>
              {quantity > 1 ? `Add ${quantity} to bag` : "Add to bag"}
            </span>
          </>
        )}
      </button>
    </form>
  );
}

interface MerchPriceLadderProps {
  breaks: { min: number; unitPrice: Money }[];
  tone?: "dark" | "light";
}

export function MerchPriceLadder({ breaks, tone = "light" }: MerchPriceLadderProps) {
  const { quantity } = useMerchBuy();
  if (breaks.length === 0) return null;
  const reached = breaks.filter((row) => quantity >= row.min).at(-1)?.min;
  const max = Number(breaks[0].unitPrice.amount);
  return (
    <div className="grid gap-3">
      <p
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-xxs tracking-[0.16em] text-muted-foreground uppercase data-[tone=dark]:text-white/60"
        data-tone={tone}
      >
        <span>Team price per piece</span>
        <span>Applied in your quote</span>
      </p>
      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {breaks.map((row) => {
          const active = row.min === reached;
          const saving = Math.round((1 - Number(row.unitPrice.amount) / max) * 100);
          return (
            <li
              key={row.min}
              data-active={active}
              className={cn(
                "grid gap-1 rounded-lg border px-2.5 py-2.5 transition-colors",
                tone === "dark"
                  ? "border-white/15 data-[active=true]:border-white data-[active=true]:bg-white data-[active=true]:text-black"
                  : "border-border bg-card data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background",
              )}
            >
              <span className="font-mono text-xxs tracking-[0.12em] uppercase opacity-70">
                {row.min}+ pcs
              </span>
              <span className="font-mono text-sm tabular-nums">{formatPrice(row.unitPrice)}</span>
              <span className="font-mono text-xxs tracking-[0.08em] uppercase opacity-60">
                {saving > 0 ? `−${saving}%` : "Base"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface MerchQuoteButtonProps {
  className?: string;
  title: string;
}

export function MerchQuoteButton({ className, title }: MerchQuoteButtonProps) {
  const { quantity } = useMerchBuy();
  const { options } = useProduct();
  const picked = options
    .filter((option) => option.values.length > 1)
    .map((option) => option.values.find((value) => value.selected)?.name)
    .filter(Boolean)
    .join(", ");
  const count = Math.max(quantity, 24);
  return (
    <QuoteTrigger
      prompt={`Quote ${count} ${title}${picked ? ` (${picked})` : ""} for my team`}
      className={cn(
        "group flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-foreground/20 font-mono text-xs tracking-[0.14em] uppercase transition-colors hover:border-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-signal transition-transform group-hover:scale-150" />
      Get a team quote for this
    </QuoteTrigger>
  );
}

export function MerchVariantImage({
  className,
  fallback,
}: {
  className?: string;
  fallback?: string;
}) {
  const { selectedVariant } = useProduct();
  const src = selectedVariant?.image?.url ?? fallback;
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={selectedVariant?.image?.altText ?? ""}
      fill
      sizes="100vw"
      className={cn("object-cover", className)}
    />
  );
}

interface MerchStickyBarProps {
  fallbackPrice: Money;
  thumbnail?: string;
  title: string;
}

export function MerchStickyBar({ fallbackPrice, thumbnail, title }: MerchStickyBarProps) {
  const { anchor } = useMerchBuy();
  const { options } = useProduct();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!anchor) return;
    const update = () => setVisible(anchor.getBoundingClientRect().bottom < 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [anchor]);
  const picked = options
    .filter((option) => option.values.length > 1)
    .map((option) => option.values.find((value) => value.selected)?.name)
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      data-visible={visible}
      className="pointer-events-none fixed inset-x-0 bottom-3 z-60 flex justify-center pr-21 pl-3 opacity-0 transition-[opacity,translate] duration-300 data-[visible=true]:pointer-events-auto data-[visible=true]:opacity-100 sm:bottom-5 sm:px-24 translate-y-4 data-[visible=true]:translate-y-0"
    >
      <div className="flex w-full max-w-2xl items-center gap-3 rounded-xl bg-card/90 p-2 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.45)] ring-1 ring-border backdrop-blur-xl">
        <span className="relative hidden size-11 shrink-0 overflow-hidden rounded-lg bg-studio sm:block">
          <MerchVariantImage fallback={thumbnail} />
        </span>
        <span className="hidden min-w-0 flex-1 sm:grid">
          <span className="truncate font-pixel text-sm tracking-wide uppercase">{title}</span>
          <span className="truncate font-mono text-xxs tracking-[0.12em] text-muted-foreground uppercase">
            {picked}
          </span>
        </span>
        <MerchAddButton className="flex-1 sm:w-72 sm:flex-none" fallbackPrice={fallbackPrice} />
      </div>
    </div>
  );
}

export interface ColorImage {
  color: string;
  image: ImageType;
}

interface ColorSwapProps {
  className?: string;
  images: ColorImage[];
  priority?: boolean;
}

// Every color's photo stays mounted and stacked, so picking a color crossfades instead of reloading.
export function ColorSwap({ className, images, priority = false }: ColorSwapProps) {
  const { options } = useProduct();
  const selected = options
    .find((option) => option.name.toLowerCase().includes("color"))
    ?.values.find((value) => value.selected)?.name;
  const active = (images.find((entry) => entry.color === selected) ?? images[0])?.image.url;
  return images.map(({ image }) => (
    <Image
      key={image.url}
      src={image.url}
      alt={image.altText ?? ""}
      aria-hidden={image.url === active ? undefined : true}
      data-active={image.url === active}
      fill
      priority={priority && image.url === active}
      sizes="100vw"
      className={cn(
        "object-cover opacity-0 transition-opacity duration-700 ease-out data-[active=true]:opacity-100",
        className,
      )}
    />
  ));
}
