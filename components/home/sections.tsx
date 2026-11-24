import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Layers,
  Lock,
  PackageCheck,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import { type ReactNode, Suspense } from "react";

import { QuoteTrigger } from "@/components/agent/quote-trigger";
import { ProductsGrid } from "@/components/product/products-grid";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { getCollection } from "@/lib/collections/server";

const MARQUEE_ITEMS = [
  "Price breaks at 24 · 50 · 100 · 250 pieces",
  "Live stock from Shopify",
  "Quotes as a page, email and PDF",
  "Prices locked for 14 days",
  "Proof before print",
];

export function HomeMarquee() {
  // The list renders twice so the -50% loop lands on an identical frame.
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden border-y border-border bg-card py-3">
      <ul className="flex w-max animate-marquee gap-10 motion-reduce:animate-none">
        {items.map((item, index) => (
          <li
            key={index}
            aria-hidden={index >= MARQUEE_ITEMS.length}
            className="flex items-center gap-10 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase"
          >
            {item}
            <span className="size-1.5 rounded-full bg-signal" />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SectionHeadingProps {
  children?: ReactNode;
  eyebrow: string;
  title: string;
}

export function SectionHeading({ children, eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
        <span className="size-1.5 rounded-full bg-signal" />
        {eyebrow}
      </p>
      <h2 className="font-pixel text-4xl leading-none tracking-wide text-foreground uppercase md:text-6xl">
        {title}
      </h2>
      {children ? (
        <p className="max-w-lg font-serif text-xl leading-snug text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

const WALL_LEFT = [
  { alt: "Heavyweight Hoodie", src: "/images/merch/hoodie.png" },
  { alt: "Woman in the navy Six-Panel Cap", src: "/images/life/cap-life-2.png" },
  { alt: "Studio Mug", src: "/images/merch/mug.png" },
  { alt: "Woman carrying the Canvas Tote", src: "/images/life/tote-life-1.png" },
];
const WALL_RIGHT = [
  {
    alt: "Woman in the black Heavyweight Hoodie at her desk",
    src: "/images/life/hoodie-life-2.png",
  },
  { alt: "Six-Panel Cap", src: "/images/merch/cap.png" },
  { alt: "Woman holding the Insulated Bottle", src: "/images/life/bottle-life-1.png" },
  { alt: "Ribbed Beanie", src: "/images/merch/beanie.png" },
];

function WallColumn({ items, up }: { items: { alt: string; src: string }[]; up: boolean }) {
  const doubled = [...items, ...items];
  return (
    <ul
      className={`grid gap-3 ${up ? "animate-marquee-up" : "animate-marquee-down"} motion-reduce:animate-none md:gap-4`}
    >
      {doubled.map((item, index) => (
        <li
          key={index}
          aria-hidden={index >= items.length}
          className="relative aspect-4/5 overflow-hidden rounded-2xl bg-studio"
        >
          <Image
            src={item.src}
            alt={index >= items.length ? "" : item.alt}
            fill
            sizes="100vw"
            className="object-cover object-[50%_30%]"
          />
        </li>
      ))}
    </ul>
  );
}

const HERO_PROMPTS = [
  ["50 hoodies for an offsite", "Quote 50 Heavyweight Hoodies for our team offsite"],
  ["Onboarding kits", "Quote 20 onboarding kits: a tee, a bottle and a tote each"],
  ["Conference caps", "Quote 100 Six-Panel Caps for a conference booth"],
];

export function HeroWall() {
  return (
    <section className="dot-grid border-b border-border">
      <Container className="grid items-center gap-10 pt-8 pb-10 md:grid-cols-[1fr_1.05fr] md:gap-14 md:pt-12 md:pb-14">
        <div className="grid gap-7">
          <p className="flex w-fit items-center gap-2 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase animate-in fade-in duration-700">
            <span className="size-1.5 rounded-full bg-signal" />
            Custom company merch · US
          </p>
          <h1 className="font-pixel text-6xl leading-[0.9] tracking-wide text-foreground uppercase animate-in fade-in slide-in-from-bottom-6 delay-150 duration-1000 fill-mode-both md:text-8xl">
            Merch,
            <br />
            engineered<span className="text-signal">.</span>
          </h1>
          <p className="max-w-md font-serif text-2xl leading-snug text-muted-foreground animate-in fade-in slide-in-from-bottom-6 delay-300 duration-1000 fill-mode-both">
            Hoodies, tees, caps and drinkware with your logo. The more you order, the less each
            piece costs.
          </p>
          <div className="grid max-w-lg gap-3 animate-in fade-in slide-in-from-bottom-6 delay-500 duration-1000 fill-mode-both">
            <QuoteTrigger
              prompt="I need merch for my team: "
              className="group flex h-14 w-full items-center justify-between gap-3 rounded-xl border border-foreground/15 bg-card px-4 text-left shadow-sm transition-colors hover:border-foreground"
            >
              <span className="flex items-center gap-3 text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-signal" />
                Tell us what your team needs
              </span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors group-hover:bg-signal">
                <ArrowRight className="size-4" />
              </span>
            </QuoteTrigger>
            <div className="flex flex-wrap gap-2">
              {HERO_PROMPTS.map(([label, prompt]) => (
                <QuoteTrigger
                  key={label}
                  prompt={prompt}
                  className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xxs tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-foreground hover:text-foreground"
                >
                  {label}
                </QuoteTrigger>
              ))}
            </div>
          </div>
          <Link
            href="/collections/merch"
            className="group flex w-fit items-center gap-1.5 font-mono text-xs tracking-[0.14em] uppercase underline underline-offset-4"
          >
            Or browse the catalog
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div
          className="grid h-[440px] grid-cols-2 gap-3 overflow-hidden md:h-[640px] md:gap-4"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <WallColumn items={WALL_LEFT} up />
          <WallColumn items={WALL_RIGHT} up={false} />
        </div>
      </Container>
    </section>
  );
}

const CATEGORIES = [
  { handle: "merch", title: "All merch" },
  { handle: "apparel", title: "Apparel" },
  { handle: "headwear", title: "Headwear" },
  { handle: "drinkware-carry", title: "Drinkware & carry" },
];

function CategoryTileFrame({ children }: { children?: ReactNode }) {
  return (
    <span className="relative block aspect-4/5 overflow-hidden rounded-2xl bg-studio">
      {children}
    </span>
  );
}

async function CategoryTileImage({ handle }: { handle: string }) {
  const collection = await getCollection({ handle });
  if (!collection?.image) return <CategoryTileFrame />;
  return (
    <CategoryTileFrame>
      <Image
        src={collection.image.url}
        alt={collection.image.altText ?? collection.title}
        fill
        sizes="100vw"
        className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
      />
    </CategoryTileFrame>
  );
}

export function CategoryRow() {
  return (
    <Container className="grid gap-10 reveal">
      <SectionHeading eyebrow="Four ways in" title="Shop by category" />
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {CATEGORIES.map((c) => (
          <Link key={c.handle} href={`/collections/${c.handle}`} className="group grid gap-3">
            <Suspense fallback={<CategoryTileFrame />}>
              <CategoryTileImage handle={c.handle} />
            </Suspense>
            <span className="flex items-center gap-1 font-mono text-xs tracking-[0.14em] uppercase">
              {c.title}
              <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </Container>
  );
}

const TABS = [
  { href: "/collections/merch", title: "All" },
  { href: "/collections/apparel", title: "Apparel" },
  { href: "/collections/headwear", title: "Headwear" },
  { href: "/collections/drinkware-carry", title: "Drinkware & carry" },
];

export function CatalogSection() {
  return (
    <Container className="grid gap-8 reveal">
      <SectionHeading eyebrow="Eight pieces" title="Shop the catalog" />
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <ul className="flex flex-wrap gap-5">
          {TABS.map((tab, index) => (
            <li key={tab.title}>
              <Link
                href={tab.href}
                className={`font-mono text-xs tracking-[0.12em] uppercase transition-colors hover:text-foreground ${index === 0 ? "text-foreground underline underline-offset-[14px]" : "text-muted-foreground"}`}
              >
                {tab.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/collections/merch"
          className="font-mono text-xs tracking-[0.12em] uppercase underline underline-offset-4"
        >
          View all ›
        </Link>
      </nav>
      <ProductsGrid collection="merch" eagerCount={4} limit={8} title="" />
    </Container>
  );
}

const KITS = [
  {
    items: ["tee", "cap", "mug"],
    name: "Starter kit",
    note: "Boxy Tee · Six-Panel Cap · Studio Mug",
    prompt: "Quote 25 Starter kits: a Boxy Tee, a Six-Panel Cap and a Studio Mug each",
  },
  {
    items: ["hoodie", "bottle", "tote"],
    name: "Onboarding kit",
    note: "Heavyweight Hoodie · Insulated Bottle · Canvas Tote",
    prompt:
      "Quote 20 Onboarding kits: a Heavyweight Hoodie, an Insulated Bottle and a Canvas Tote each",
  },
  {
    items: ["crewneck", "beanie", "mug"],
    name: "Offsite kit",
    note: "Loopback Crewneck · Ribbed Beanie · Studio Mug",
    prompt: "Quote 40 Offsite kits: a Loopback Crewneck, a Ribbed Beanie and a Studio Mug each",
  },
];

const QUOTE_CLASS =
  "group inline-flex h-11 items-center justify-center gap-2.5 rounded-lg border border-foreground/15 px-5 font-mono text-xs tracking-[0.14em] uppercase transition-colors hover:border-foreground hover:bg-foreground hover:text-background";

export function KitsSection() {
  return (
    <Container className="grid gap-10 reveal">
      <SectionHeading eyebrow="Bundles" title="Team kits">
        Three pieces that work together. Pick a kit, tell us how many people, get a quote.
      </SectionHeading>
      <div className="grid gap-4 md:grid-cols-3">
        {KITS.map((kit) => (
          <article
            key={kit.name}
            className="group grid gap-5 rounded-2xl border border-border bg-card p-4 transition-colors duration-300 hover:border-foreground/40"
          >
            <div className="grid grid-cols-3 gap-2">
              {kit.items.map((item, index) => (
                <div
                  key={item}
                  className="relative aspect-square overflow-hidden rounded-xl bg-studio transition-transform duration-700 ease-out-expo group-hover:-translate-y-1"
                  style={{ transitionDelay: `${index * 70}ms` }}
                >
                  <Image
                    src={`/images/merch/${item}.png`}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-1 px-1">
              <h3 className="font-pixel text-xl tracking-wide uppercase">{kit.name}</h3>
              <p className="text-sm text-muted-foreground">{kit.note}</p>
            </div>
            <QuoteTrigger prompt={kit.prompt} className={QUOTE_CLASS}>
              Quote this kit
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </QuoteTrigger>
          </article>
        ))}
      </div>
    </Container>
  );
}

const STEPS = [
  [
    "01",
    "Fill a cart",
    "Pick products, colors and sizes. Every piece counts toward the price break.",
  ],
  ["02", "Get a quote", "The agent prices your cart from Shopify in seconds: page, email and PDF."],
  [
    "03",
    "Approve the proof",
    "We send a proof of your logo. Nothing is printed until you say yes.",
  ],
];

export function HowItWorks() {
  return (
    <Container className="grid gap-10 reveal">
      <SectionHeading eyebrow="Three steps" title="How it works" />
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(([n, title, text]) => (
          <li
            key={n}
            className="grid content-start gap-3 rounded-2xl border border-border bg-card p-6"
          >
            <span className="font-pixel text-4xl text-signal">{n}</span>
            <h3 className="font-mono text-sm tracking-[0.14em] uppercase">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
    </Container>
  );
}

const TRUST = [
  { icon: Layers, title: "Price breaks from 24" },
  { icon: Lock, title: "Prices locked 14 days" },
  { icon: PackageCheck, title: "Live stock" },
  { icon: BadgeCheck, title: "Proof before print" },
  { icon: UserCheck, title: "A person reviews discounts" },
];

export function TrustRow() {
  return (
    <Container className="reveal">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-5">
        {TRUST.map(({ icon: Icon, title }, index) => (
          <li
            key={title}
            className={`grid justify-items-center gap-3 bg-card px-4 py-8 text-center ${index === TRUST.length - 1 ? "col-span-2 md:col-span-1" : ""}`}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="font-serif text-lg leading-tight">{title}</span>
          </li>
        ))}
      </ul>
    </Container>
  );
}

const QUOTE_PROMPTS = [
  ["50 hoodies, mixed sizes", "Quote 50 Heavyweight Hoodies in mixed sizes"],
  ["Onboarding kits for 20", "Quote 20 onboarding kits: a tee, a bottle and a tote each"],
  ["100 caps for an event", "Quote 100 Six-Panel Caps for an event"],
];

export function QuoteBand() {
  return (
    <Container className="reveal">
      <div
        id="quote"
        className="relative isolate grid scroll-mt-28 justify-items-center gap-5 overflow-hidden rounded-2xl bg-[#040404] px-6 py-14 text-center text-white md:py-20"
      >
        <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-white/60 uppercase">
          <span className="size-1.5 animate-pulse rounded-full bg-signal" />
          Quote agent
        </span>
        <h2 className="max-w-2xl font-pixel text-4xl leading-tight tracking-wide uppercase md:text-6xl">
          Need a quote for your team?
        </h2>
        <p className="max-w-xl font-serif text-xl text-white/70">
          Ask in plain words. You get a web page, an email and a PDF with every price from Shopify,
          locked for 14 days.
        </p>
        {/* One equal-width stack until all three fit on one line, so no chip is left alone or ragged. */}
        <div className="grid w-full max-w-sm gap-2 pt-3 lg:flex lg:w-auto lg:max-w-none lg:justify-center">
          {QUOTE_PROMPTS.map(([label, prompt]) => (
            <QuoteTrigger
              key={label}
              prompt={prompt}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2 font-mono text-xs tracking-[0.12em] uppercase transition-colors hover:border-white hover:bg-white hover:text-black"
            >
              {label}
            </QuoteTrigger>
          ))}
        </div>
      </div>
    </Container>
  );
}
