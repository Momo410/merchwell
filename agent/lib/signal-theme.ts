// The Signal brand (Nothing-style): grey paper, black ink, one red dot. Shared by quotes and reports.
import { defineTheme } from "@hyper-elements/react";

import { shopConfig } from "../../lib/config";

export const SANS = "Geist, Arial, sans-serif";
export const MONO = "'Geist Mono', 'Courier New', monospace";
export const DISPLAY = "'Geist Pixel Circle', 'Geist Mono', monospace";

const face = (family: string, file: string, weight: number) => ({
  family,
  format: "woff2" as const,
  src: new URL(`/fonts/${file}.woff2`, shopConfig.site.url).href,
  style: "normal" as const,
  weight,
});

// Web fonts for the Page; the PDF and image get the TTF files from agent/fonts instead.
export const PAGE_FONTS = [
  face("Geist", "Geist-Regular", 400),
  face("Geist", "Geist-Medium", 500),
  face("Geist", "Geist-SemiBold", 600),
  face("Geist", "Geist-Bold", 700),
  face("Geist Mono", "GeistMono-Regular", 400),
  face("Geist Mono", "GeistMono-Medium", 500),
  face("Geist Pixel Circle", "GeistPixel-Circle", 400),
];

export const signal = defineTheme({
  colors: {
    background: "#f4f4f4",
    border: "#d8d9d9",
    foreground: "#040404",
    muted: "#595a5a",
    primary: "#040404",
    primaryForeground: "#ffffff",
    red: "#d71921",
  },
  elements: {
    Button: {
      borderRadius: 999,
      fontFamily: MONO,
      fontSize: 13,
      fontWeight: 500,
      hover: { backgroundColor: "#d71921" },
      letterSpacing: 1,
      padding: [12, 22],
    },
    Heading: {
      by: {
        level: {
          1: {
            fontFamily: DISPLAY,
            fontSize: 52,
            fontWeight: 400,
            lineHeight: 1.05,
            mobile: { fontSize: 38 },
          },
          2: { fontSize: 18, fontWeight: 600 },
          3: { fontSize: 15, fontWeight: 600 },
        },
      },
    },
    Link: { color: "#040404" },
  },
  fonts: { body: SANS, heading: SANS },
  fontSizes: { body: 14 },
  lineHeights: { body: 1.5 },
  styles: {
    card: {
      backgroundColor: "#ffffff",
      border: { color: "{colors.border}", style: "solid", width: 1 },
      borderRadius: 8,
      gap: 14,
      padding: 24,
    },
    label: {
      color: "{colors.muted}",
      fontFamily: MONO,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
  },
});
