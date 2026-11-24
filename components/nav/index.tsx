import { PredictiveSearchProvider } from "@shopify/hydrogen/react";
import { Suspense } from "react";

import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { shopConfig } from "@/lib/config";
import type { MenuItem } from "@/lib/menu/types";

import { NavAccount, NavAccountFallback } from "./account";
import { CartIcon, CartIconFallback } from "./cart";
import { MobileMenu } from "./mobile-menu";
import { QuickLinks } from "./quick-links";
import { SearchModal } from "./search-modal";

export function Nav() {
  const items: MenuItem[] = [
    { id: "default-nav-shop", items: [], title: "Shop all", url: "/collections/merch" },
    { id: "nav-apparel", items: [], title: "Apparel", url: "/collections/apparel" },
    { id: "nav-headwear", items: [], title: "Headwear", url: "/collections/headwear" },
    {
      id: "nav-carry",
      items: [],
      title: "Drinkware & carry",
      url: "/collections/drinkware-carry",
    },
  ];
  return (
    <nav
      className="pointer-events-none sticky top-0 z-30 w-full px-5 pt-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] lg:px-10"
      id="nav-outer"
    >
      {/* Same outer edges as the page Container (max-w-384 minus its padding), so the bar lines up with the content below. */}
      <div className="pointer-events-auto mx-auto grid max-w-[91rem] gap-1.5">
        <Link
          href="/collections/merch"
          className="group flex h-8 items-center justify-between gap-4 overflow-hidden rounded-md bg-signal px-4 font-mono text-xxs tracking-[0.14em] text-white uppercase sm:text-xs"
        >
          <span className="truncate">
            › Price breaks from 24 pieces · team quotes in 30 seconds
          </span>
          <span className="hidden shrink-0 underline underline-offset-4 sm:inline">Shop now</span>
        </Link>
        <Container className="relative flex h-14 items-center gap-2.5 rounded-md bg-card/85 shadow-[0_8px_30px_-18px_rgb(0_0_0/0.35)] backdrop-blur-xl md:gap-5 lg:px-5">
          <MobileMenu items={items} />

          <Link className="flex shrink-0 items-center" href="/">
            <span className="flex items-center gap-1.5 font-pixel text-lg leading-4 tracking-wide uppercase">
              {shopConfig.site.name} (R)
              <span className="size-1.5 rounded-full bg-signal" />
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-5">
            <QuickLinks items={items} />
            {shopConfig.search.isEnabled && (
              <PredictiveSearchProvider
                debounceInMs={300}
                limit={3}
                types={["PRODUCT", "COLLECTION", "QUERY"]}
              >
                <SearchModal />
              </PredictiveSearchProvider>
            )}
            {shopConfig.auth.isEnabled && (
              <Suspense fallback={<NavAccountFallback />}>
                <NavAccount />
              </Suspense>
            )}
            <Suspense fallback={<CartIconFallback />}>
              <CartIcon />
            </Suspense>
          </div>
        </Container>
      </div>
    </nav>
  );
}
