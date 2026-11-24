"use client";

import type { ReactNode } from "react";

interface ActionBarProps {
  children?: ReactNode;
}

export function ActionBar({ children }: ActionBarProps) {
  if (!children) return null;

  return (
    <div className="fixed right-4 bottom-4 z-70 flex items-center sm:right-5 sm:bottom-5 [body:has([data-cart-sheet][data-open])_&]:hidden [body:has([data-mobile-menu][data-open])_&]:hidden">
      {children}
    </div>
  );
}
