"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronRight, Menu, XIcon } from "@/components/ui/pixel-icons";
import { type CSSProperties, useState } from "react";

import { openQuoteAgent } from "@/components/agent/quote-trigger";
import type { MenuItem } from "@/lib/menu/types";

import { MenuLink } from "./menu-link";

export function MobileMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const close = () => setOpen(false);
  const quote = () => {
    close();
    openQuoteAgent();
  };
  return (
    <Dialog.Root
      onOpenChange={(next) => {
        // The panel opens just under the header, which stays in view like nothing.tech's.
        if (next)
          setTop((document.getElementById("nav-outer")?.getBoundingClientRect().bottom ?? 0) + 6);
        setOpen(next);
      }}
      open={open}
    >
      <Dialog.Trigger
        render={
          <button
            aria-label={open ? "Close menu" : "Menu"}
            className="-ml-2 flex cursor-pointer p-2 md:hidden"
            type="button"
          >
            {open ? (
              <XIcon className="size-5 animate-in fade-in spin-in-45 duration-200" />
            ) : (
              <Menu className="size-5 animate-in fade-in duration-200" />
            )}
          </button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 md:hidden" />
        <Dialog.Popup
          className="fixed inset-x-3 z-60 flex max-h-[calc(100dvh-var(--menu-top)-0.75rem)] flex-col overflow-hidden rounded-md bg-card/85 text-foreground shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)] ring-1 ring-black/5 backdrop-blur-xl transition-[opacity,translate] duration-300 ease-out-expo data-ending-style:-translate-y-2 data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:opacity-0 md:hidden"
          data-mobile-menu=""
          style={{ "--menu-top": `${top}px`, top } as CSSProperties}
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-2">
            <ul>
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="animate-in fill-mode-both fade-in slide-in-from-top-2 duration-500"
                  style={{ animationDelay: `${60 + index * 50}ms` }}
                >
                  <MenuLink
                    className="group flex cursor-pointer items-center gap-3 border-b border-foreground/8 py-2.5"
                    onClick={close}
                    url={item.url}
                  >
                    <span className="min-w-0 flex-1 font-pixel text-[2.6rem] leading-[0.95] tracking-wide uppercase">
                      {item.title}
                    </span>
                    <ChevronRight className="size-7 shrink-0 stroke-[1.5] opacity-60 transition-transform group-active:translate-x-1" />
                  </MenuLink>
                  {item.items.length > 0 && (
                    <ul className="grid gap-1.5 pb-3 pl-1">
                      {item.items.map((child) => (
                        <li key={child.id}>
                          <MenuLink
                            className="font-mono text-xs tracking-[0.12em] uppercase opacity-70"
                            onClick={close}
                            url={child.url}
                          >
                            {child.title}
                          </MenuLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-4">
            <span className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
              Price breaks from 24 pcs
            </span>
            <button
              className="flex cursor-pointer items-center gap-2 rounded-full bg-foreground px-3.5 py-2 font-mono text-xxs tracking-[0.14em] text-background uppercase"
              onClick={quote}
              type="button"
            >
              <span className="size-1.5 rounded-full bg-signal" />
              Get a quote
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
