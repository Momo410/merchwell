"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { CartProvider, useCartActions } from "@/lib/cart/client";

// The cart cookie is shared by every tab and the agent, so a tab coming back into view reloads it before the shopper edits stale lines.
function CartTabSync() {
  const { refresh } = useCartActions();
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [refresh]);
  return null;
}

interface CartDrawerContextValue {
  isOverlayOpen: boolean;
  openOverlay: () => void;
  setOverlayOpen: (open: boolean) => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const openOverlay = useCallback(() => setOverlayOpen(true), []);

  return (
    <CartDrawerContext.Provider value={{ isOverlayOpen, openOverlay, setOverlayOpen }}>
      {children}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  if (!context) throw new Error("useCartDrawer must be used within CartDrawerProvider");
  return context;
}

interface CartProviderWrapperProps {
  cartData: ComponentProps<typeof CartProvider>["initialData"];
  children: ReactNode;
}

export function CartProviderWrapper({ cartData, children }: CartProviderWrapperProps) {
  return (
    <CartProvider initialData={cartData}>
      <CartTabSync />
      <CartDrawerProvider>{children}</CartDrawerProvider>
    </CartProvider>
  );
}
