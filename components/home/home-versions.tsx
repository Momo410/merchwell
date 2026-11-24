import Image from "next/image";
import { type ReactNode, Suspense } from "react";

import { QuoteTrigger } from "@/components/agent/quote-trigger";
import { CatalogSection, CategoryRow, QuoteBand } from "@/components/home/sections";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { getCollection, getCollectionResults } from "@/lib/collections/server";
import { formatPrice } from "@/lib/money";
import { buildProductUrl, isColorOption, swatchColor } from "@/lib/product";
import { getProduct } from "@/lib/product/server";

import { ButtonTuner, type StageItem, StageCycle } from "./home-versions-client";
import { QuoteDemo } from "./quote-demo";

// On-model studio portraits, one per product, from design/products/renders-v3.
const MODEL_PHOTO: Record<string, string> = {
  "boxy-tee": "/images/life/tee-hero.png",
  "canvas-tote": "/images/life/tote-hero.png",
  "heavyweight-hoodie": "/images/life/hoodie-hero.png",
  "insulated-bottle": "/images/life/bottle-hero.png",
  "loopback-crewneck": "/images/life/crewneck-hero.png",
  "ribbed-beanie": "/images/life/beanie-hero.png",
  "six-panel-cap": "/images/life/cap-hero.png",
  "studio-mug": "/images/life/mug-hero.png",
};

const STAGE = [
  ["heavyweight-hoodie", "Hoodie"],
  ["boxy-tee", "Tee"],
  ["loopback-crewneck", "Crewneck"],
  ["six-panel-cap", "Cap"],
] as const;
const HERO_ALT = /^On model: .+ in (.+)$/;
const STAGE_PHOTO_CLASS =
  "relative aspect-4/5 sm:aspect-3/2 lg:aspect-auto lg:h-[calc(100svh-12rem)]";

// The same model per product in every color, from the "On model: <title> in <color>" media in Shopify.
async function getStageItems(): Promise<StageItem[]> {
  const products = await Promise.all(STAGE.map(([handle]) => getProduct({ handle })));
  return products.flatMap((product, index) => {
    const option = product?.options.find(isColorOption);
    if (!product || !option) return [];
    const heroes = new Map(
      product.images.flatMap((image) => {
        const match = HERO_ALT.exec(image.altText ?? "");
        return match ? [[match[1], image] as const] : [];
      }),
    );
    const looks = option.values.flatMap((value) => {
      const image = heroes.get(value.name);
      if (!image) return [];
      return [
        {
          alt: image.altText ?? product.title,
          color: value.name,
          href: buildProductUrl(product.handle, [{ name: option.name, value: value.name }]),
          src: image.url,
          swatch: swatchColor(value.name, value.swatch?.color),
        },
      ];
    });
    if (looks.length === 0) return [];
    return [
      {
        breaks: product.priceBreaks.map((tier) => ({
          min: tier.min,
          price: formatPrice(tier.unitPrice),
        })),
        handle: product.handle,
        label: STAGE[index]![1],
        looks,
        title: product.title,
      },
    ];
  });
}

async function Stage() {
  return <StageCycle className={STAGE_PHOTO_CLASS} items={await getStageItems()} />;
}

function StageFallback() {
  return (
    <>
      <div className={STAGE_PHOTO_CLASS} />
      <div className="h-80 rounded-2xl bg-card" />
    </>
  );
}

const PRIMARY_CLASS =
  "inline-flex h-[var(--btn-h,3rem)] items-center justify-center rounded-[var(--btn-r,0.5rem)] bg-foreground px-6 font-mono text-xs tracking-[0.14em] text-background uppercase transition-opacity hover:opacity-85";
const SECONDARY_CLASS =
  "inline-flex h-[var(--btn-h,3rem)] cursor-pointer items-center justify-center gap-2.5 rounded-[var(--btn-r,0.5rem)] border border-foreground/20 px-6 font-mono text-xs tracking-[0.14em] uppercase transition-colors hover:border-foreground";

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
      <span className="size-1.5 rounded-full bg-signal" />
      {children}
    </p>
  );
}

function QuoteButton({ children, prompt }: { children: ReactNode; prompt?: string }) {
  return (
    <QuoteTrigger className={SECONDARY_CLASS} prompt={prompt}>
      <span className="size-1.5 rounded-full bg-signal" />
      {children}
    </QuoteTrigger>
  );
}

async function ModelGrid({ columns }: { columns: "lookbook" | "rail" }) {
  const { products } = await getCollectionResults({ handle: "merch" });
  const items = products.filter((product) => MODEL_PHOTO[product.handle]);
  return (
    <ul
      className={
        columns === "rail"
          ? "grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4"
          : "grid gap-x-6 gap-y-12 md:grid-cols-2"
      }
    >
      {items.map((product) => (
        <li key={product.id}>
          <Link
            className="group grid gap-4"
            href={buildProductUrl(product.handle, product.defaultVariantSelectedOptions ?? [])}
          >
            <span
              className={`relative block overflow-hidden rounded-2xl bg-[#f2f2f2] ${columns === "rail" ? "aspect-4/5" : "aspect-3/2"}`}
            >
              <Image
                alt={`${product.title} on a model`}
                className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
                fill
                sizes="100vw"
                src={MODEL_PHOTO[product.handle]!}
              />
            </span>
            <span className="flex items-start justify-between gap-3">
              <span className="grid gap-1">
                <span className="font-pixel text-lg leading-tight tracking-wide uppercase">
                  {product.title}
                </span>
                <span className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
                  From {formatPrice(product.price)}
                </span>
              </span>
              <span className="flex gap-1 pt-1">
                {(product.colors ?? []).map((color) => (
                  <span
                    key={color.name}
                    aria-hidden="true"
                    className="size-3 rounded-full border border-foreground/15"
                    style={{ background: swatchColor(color.name, color.color) }}
                  />
                ))}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ModelGridFallback() {
  return <div className="aspect-[4/1] rounded-2xl bg-studio" />;
}

function DemoSection({ dark = false }: { dark?: boolean }) {
  return (
    <Container>
      <div
        className="grid items-center gap-10 rounded-3xl bg-card px-6 py-10 data-[dark=true]:bg-[#040404] data-[dark=true]:text-white md:px-12 md:py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
        data-dark={dark}
      >
        <div className="grid content-center gap-5">
          <Eyebrow>Quote agent</Eyebrow>
          <h2 className="font-pixel text-4xl leading-none tracking-wide uppercase md:text-5xl">
            Ask in plain words. Get a priced quote.
          </h2>
          <p className="font-serif text-xl leading-snug opacity-70">
            It checks live stock in Shopify, applies the price break your quantity reaches, and
            sends the quote as a page, an email and a PDF.
          </p>
          <div>
            <QuoteButton>Try the quote agent</QuoteButton>
          </div>
        </div>
        <QuoteDemo />
      </div>
    </Container>
  );
}

// V1 · Stage: the product page's stage on the homepage. One model, every color, the price ladder.
export function HomeStage() {
  return (
    <>
      {/* Anchored to the page top so the dots run behind the banner and nav, then fade before the next section. */}
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50rem] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
      />
      <section>
        <Container className="grid gap-8 pt-6 pb-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,17rem)] lg:items-center lg:gap-10 lg:pb-6">
          <div className="grid content-center gap-6">
            <h1 className="font-pixel text-5xl leading-[0.95] tracking-wide uppercase md:text-6xl">
              Merch your team actually wears.
            </h1>
            <p className="font-serif text-xl leading-snug text-muted-foreground">
              Heavy hoodies, tees, caps and drinkware with your logo. The more you order, the less
              each piece costs.
            </p>
            {/* Equal widths: side by side when there is room, one full-width stack in the narrow desktop column and on phones. */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Link className={PRIMARY_CLASS} href="/collections/merch">
                Shop the catalog
              </Link>
              <QuoteButton>Get a team quote</QuoteButton>
            </div>
          </div>
          <Suspense fallback={<StageFallback />}>
            <Stage />
          </Suspense>
        </Container>
      </section>
      <Container className="grid gap-8 pt-12 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-pixel text-4xl leading-none tracking-wide uppercase md:text-5xl">
            Every piece, worn
          </h2>
          <Link
            className="font-mono text-xs tracking-[0.14em] uppercase underline underline-offset-4"
            href="/collections/merch"
          >
            Shop all eight ›
          </Link>
        </div>
        <Suspense fallback={<ModelGridFallback />}>
          <ModelGrid columns="lookbook" />
        </Suspense>
      </Container>
      <div className="pt-16 md:pt-20">
        <DemoSection />
      </div>
      <div className="pt-16 md:pt-20">
        <QuoteBand />
      </div>
    </>
  );
}

const PROMPTS = [
  ["60 hoodies for an offsite", "60 Heavyweight Hoodies for an offsite, mixed sizes"],
  ["Onboarding kits for 20", "Quote 20 onboarding kits: a tee, a bottle and a tote each"],
  ["100 caps for an event", "Quote 100 Six-Panel Caps for an event"],
];

// V2 · Agent: the quote agent is the hero; the catalog follows.
export function HomeAgent() {
  return (
    <>
      <Container className="grid items-center gap-10 pt-8 pb-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 lg:pt-14">
        <div className="grid content-center gap-6">
          <Eyebrow>Company merch · quotes in 30 seconds</Eyebrow>
          <h1 className="font-pixel text-5xl leading-[0.95] tracking-wide uppercase md:text-6xl">
            Tell us what your team needs.
          </h1>
          <p className="font-serif text-xl leading-snug text-muted-foreground">
            Hoodies, tees, caps and drinkware with your logo, priced from live Shopify stock. Price
            breaks at 24, 50, 100 and 250 pieces.
          </p>
          <QuoteTrigger className="flex h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-xl bg-card px-5 text-left text-muted-foreground ring-1 ring-border transition-shadow hover:ring-foreground/40">
            <span className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-signal" />
              What does your team need?
            </span>
            <span className="rounded-lg bg-foreground px-3 py-1.5 font-mono text-xxs tracking-[0.14em] text-background uppercase">
              Ask
            </span>
          </QuoteTrigger>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map(([label, prompt]) => (
              <QuoteTrigger
                key={label}
                className="rounded-full border border-foreground/15 px-3.5 py-1.5 font-mono text-xxs tracking-[0.12em] uppercase transition-colors hover:border-foreground"
                prompt={prompt}
              >
                {label}
              </QuoteTrigger>
            ))}
          </div>
        </div>
        <QuoteDemo />
      </Container>
      <div className="grid gap-20 pt-20 md:gap-28 md:pt-28">
        <CategoryRow />
        <CatalogSection />
        <QuoteBand />
      </div>
    </>
  );
}

async function CollectionPhoto({ className, handle }: { className: string; handle: string }) {
  const collection = await getCollection({ handle });
  return (
    <Link
      className={`group relative block overflow-hidden rounded-2xl bg-studio ${className}`}
      href={`/collections/${handle}`}
    >
      {collection?.image ? (
        <Image
          alt={collection.image.altText ?? collection.title}
          className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.02]"
          fill
          sizes="100vw"
          src={collection.image.url}
        />
      ) : null}
      <span className="absolute bottom-4 left-4 rounded-lg bg-card/90 px-3 py-2 font-mono text-xs tracking-[0.14em] uppercase backdrop-blur">
        {collection?.title ?? handle} ›
      </span>
    </Link>
  );
}

// V3 · Lookbook: people first. Real coworkers in the merch, then every piece on a model.
export function HomeLookbook() {
  return (
    <>
      <section className="relative h-[calc(100svh-4rem)] min-h-[36rem] overflow-hidden bg-[#2a2a2a]">
        <Image
          alt="Five coworkers wearing Merchwell hoodies, tees, crewnecks and caps"
          className="object-cover object-[50%_35%]"
          fill
          priority
          sizes="100vw"
          src="/images/life/collection-merch.png"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-transparent" />
        <Container className="absolute inset-x-0 bottom-0 grid gap-6 pb-10 text-white md:pb-14">
          <h1 className="max-w-3xl font-pixel text-5xl leading-[0.95] tracking-wide uppercase md:text-7xl">
            Merch people keep wearing.
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex h-[var(--btn-h,3rem)] items-center rounded-[var(--btn-r,0.5rem)] bg-white px-6 font-mono text-xs tracking-[0.14em] text-black uppercase"
              href="/collections/merch"
            >
              Shop the catalog
            </Link>
            <QuoteTrigger className="inline-flex h-[var(--btn-h,3rem)] cursor-pointer items-center gap-2.5 rounded-[var(--btn-r,0.5rem)] border border-white/40 px-6 font-mono text-xs tracking-[0.14em] uppercase transition-colors hover:border-white">
              <span className="size-1.5 rounded-full bg-signal" />
              Get a team quote
            </QuoteTrigger>
          </div>
        </Container>
      </section>
      <Container className="grid gap-4 pt-4 md:grid-cols-3">
        <Suspense fallback={<div className="aspect-4/5 rounded-2xl bg-studio md:col-span-2" />}>
          <CollectionPhoto
            className="aspect-4/5 md:col-span-2 md:aspect-auto md:h-[34rem]"
            handle="apparel"
          />
        </Suspense>
        <div className="grid gap-4">
          <Suspense fallback={<div className="aspect-4/3 rounded-2xl bg-studio" />}>
            <CollectionPhoto
              className="aspect-4/3 md:aspect-auto md:h-[16.75rem]"
              handle="headwear"
            />
          </Suspense>
          <Suspense fallback={<div className="aspect-4/3 rounded-2xl bg-studio" />}>
            <CollectionPhoto
              className="aspect-4/3 md:aspect-auto md:h-[16.75rem]"
              handle="drinkware-carry"
            />
          </Suspense>
        </div>
      </Container>
      <Container className="grid gap-8 pt-20 md:pt-28">
        <h2 className="font-pixel text-4xl leading-none tracking-wide uppercase md:text-5xl">
          Every piece, worn
        </h2>
        <Suspense fallback={<ModelGridFallback />}>
          <ModelGrid columns="lookbook" />
        </Suspense>
      </Container>
      <div className="pt-20 md:pt-28">
        <DemoSection dark />
      </div>
      <div className="pt-20 md:pt-28">
        <QuoteBand />
      </div>
    </>
  );
}

const VERSIONS = [
  ["/v1", "V1 Stage"],
  ["/v2", "V2 Agent"],
  ["/v3", "V3 Lookbook"],
] as const;

export function HomeVersionSwitch({ current }: { current: (typeof VERSIONS)[number][0] }) {
  return (
    <>
      <ButtonTuner />
      <nav className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 gap-1 md:bottom-5 md:left-20 md:translate-x-0 rounded-xl bg-[#040404] p-1 shadow-xl">
        {VERSIONS.map(([href, label]) => (
          <Link
            key={href}
            className="rounded-lg px-3 py-1.5 font-mono text-xxs tracking-[0.12em] whitespace-nowrap text-white/70 uppercase transition-colors hover:text-white data-[active=true]:bg-white data-[active=true]:text-black"
            data-active={href === current}
            href={href}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
