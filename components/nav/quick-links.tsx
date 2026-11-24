import Image from "next/image";
import { type ReactNode, Suspense } from "react";

import { QuoteTrigger } from "@/components/agent/quote-trigger";
import { Price } from "@/components/product/price";
import { Link } from "@/components/ui/link";
import { ChevronRight, MessageSquare, Shirt } from "@/components/ui/pixel-icons";
import { getCollectionResults } from "@/lib/collections/server";
import type { MenuItem } from "@/lib/menu/types";
import { buildProductUrl } from "@/lib/product";

import { MenuLink } from "./menu-link";

const TRIGGER_CLASS =
  "flex items-center gap-1 font-pixel text-sm leading-4 tracking-wide whitespace-nowrap uppercase transition-colors lg:text-lg hover:text-signal group-hover:text-signal";

const ROW_CLASS =
  "flex h-11 cursor-pointer items-center justify-between gap-3 rounded-lg bg-background px-3.5 font-mono text-xs tracking-[0.12em] uppercase transition-colors hover:bg-foreground hover:text-background";

const MEGA_TILES = 4;

export function QuickLinks({ items }: { items: MenuItem[] }) {
  return (
    <ul className="hidden items-center gap-4 md:flex lg:gap-5">
      {items.map((item) => (
        <NavItem key={item.id} item={item} />
      ))}
    </ul>
  );
}

function collectionHandle(url: string) {
  return url.match(/^\/collections\/([^/?#]+)/)?.[1];
}

function NavItem({ item }: { item: MenuItem }) {
  const handle = collectionHandle(item.url);
  if (!handle || handle === "merch") {
    return (
      <li className="flex h-14 items-center">
        <MenuLink url={item.url} className={TRIGGER_CLASS}>
          {item.title}
        </MenuLink>
      </li>
    );
  }
  return (
    <li className="group flex h-14 items-center">
      <MenuLink url={item.url} className={TRIGGER_CLASS}>
        {item.title}
      </MenuLink>
      <div className="invisible absolute inset-x-0 top-full z-40 translate-y-1 pt-1.5 opacity-0 transition-[opacity,translate,visibility] duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:translate-y-0 group-has-[:focus-visible]:opacity-100">
        <div className="grid gap-4 rounded-md bg-card p-5 shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)]">
          <p className="font-mono text-xs tracking-[0.14em] uppercase">{item.title}</p>
          <div className="grid grid-cols-[1fr_14rem] gap-4">
            <Suspense fallback={<MegaTilesFallback />}>
              <MegaTiles handle={handle} />
            </Suspense>
            <ul className="grid content-start gap-2">
              <li>
                <MenuLink url={item.url} className={ROW_CLASS}>
                  All {item.title}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </MenuLink>
              </li>
              <li>
                <MenuLink url="/collections/merch" className={ROW_CLASS}>
                  Shop all merch
                  <Shirt className="size-4" aria-hidden="true" />
                </MenuLink>
              </li>
              <li>
                <QuoteTrigger
                  prompt={`I need ${item.title.toLowerCase()} for my team: `}
                  className={`${ROW_CLASS} w-full`}
                >
                  Get a team quote
                  <MessageSquare className="size-4" aria-hidden="true" />
                </QuoteTrigger>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </li>
  );
}

function MegaTilesGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-4 gap-3">{children}</ul>;
}

function MegaTilesFallback() {
  return (
    <MegaTilesGrid>
      {Array.from({ length: MEGA_TILES }, (_, index) => (
        <li key={index} className="grid gap-2.5">
          <span className="block aspect-square rounded-lg bg-studio" />
          <span className="h-9" />
        </li>
      ))}
    </MegaTilesGrid>
  );
}

async function MegaTiles({ handle }: { handle: string }) {
  const { products } = await getCollectionResults({ handle });
  return (
    <MegaTilesGrid>
      {products.slice(0, MEGA_TILES).map((product) => (
        <li key={product.id}>
          <Link
            href={buildProductUrl(product.handle, product.defaultVariantSelectedOptions ?? [])}
            className="group/tile grid gap-2.5"
          >
            <span className="relative block aspect-square overflow-hidden rounded-lg bg-studio">
              {product.featuredImage ? (
                <Image
                  src={product.featuredImage.url}
                  alt={product.featuredImage.altText || product.title}
                  fill
                  sizes="100vw"
                  className="object-cover transition-transform duration-500 ease-out-expo group-hover/tile:scale-[1.04]"
                />
              ) : null}
            </span>
            <span className="grid gap-0.5">
              <span className="font-pixel text-sm leading-tight tracking-wide uppercase">
                {product.title}
              </span>
              <span className="flex items-baseline gap-1 font-mono text-xxs tracking-[0.12em] text-muted-foreground uppercase">
                From
                <Price
                  amount={product.price.amount}
                  currencyCode={product.price.currencyCode}
                  className="text-xs text-muted-foreground"
                />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </MegaTilesGrid>
  );
}
