import { cn } from "cn";
import Image from "next/image";

import { Container } from "@/components/ui/container";
import type { Image as ImageType } from "@/lib/media/types";
import type { Money } from "@/lib/money/types";
import { getSharedImages, isColorOption, toProductFormInput } from "@/lib/product";
import type { ProductDetails, ProductVariant } from "@/lib/product/types";

import {
  type ColorImage,
  ColorSwap,
  MerchAddButton,
  MerchBuyAnchor,
  MerchBuyProvider,
  MerchOptions,
  MerchPriceLadder,
  MerchQuantity,
  MerchQuoteButton,
  MerchStickyBar,
  MerchVariantImage,
} from "./merch-detail-client";
import { ProductForm } from "./product-form";
import { ProductInfoDescription } from "./product-info";

interface MerchMedia {
  heroes: ColorImage[];
  lifestyle: ImageType[];
  packshot: ImageType | undefined;
}

const HERO_ALT = /^On model: .+ in (.+)$/;
const DETAIL_ALT = /^Close-up, ([^:]+): .+ in (.+)$/;

// Shopify media order: a packshot per color, the studio hero per color ("On model: <title> in <color>"),
// close-ups per color ("Close-up, <detail>: <title> in <color>"), then lifestyle photos.
function merchMedia(product: ProductDetails): MerchMedia {
  const color = product.options.find(isColorOption);
  const colorUrls = new Set(color?.values.map((value) => value.image).filter(Boolean));
  const packshots = product.images.filter((image) => colorUrls.has(image.url));
  const packshot = packshots[0] ?? product.featuredImage ?? undefined;
  const heroes: ColorImage[] = [];
  const rest: ImageType[] = [];
  for (const image of getSharedImages(product.images, product.options)) {
    if (colorUrls.has(image.url)) continue;
    const alt = image.altText ?? "";
    const hero = HERO_ALT.exec(alt);
    const detail = DETAIL_ALT.exec(alt);
    if (hero) heroes.push({ color: hero[1], image });
    else if (!detail) rest.push(image);
  }
  // Products without per-color heroes keep their first shared photo as the hero.
  const lifestyle = heroes.length > 0 ? rest : rest.slice(1);
  if (heroes.length === 0) {
    const fallback = rest[0] ?? packshot;
    if (fallback) heroes.push({ color: "", image: fallback });
  }
  return { heroes, lifestyle, packshot };
}

interface MerchDetailProps {
  product: ProductDetails;
  variant: ProductVariant | undefined;
}

export function MerchDetail({ product, variant }: MerchDetailProps) {
  const media = merchMedia(product);
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  return (
    <ProductForm product={toProductFormInput(product, variant)}>
      <MerchBuyProvider>
        <StageLayout media={media} price={price} product={product} />
        <MerchStickyBar
          fallbackPrice={price}
          thumbnail={media.packshot?.url}
          title={product.title}
        />
      </MerchBuyProvider>
    </ProductForm>
  );
}

interface LayoutProps {
  media: MerchMedia;
  price: Money;
  product: ProductDetails;
}

function Photo({
  className,
  image,
  priority = false,
}: {
  className?: string;
  image: ImageType | undefined;
  priority?: boolean;
}) {
  if (!image) return null;
  return (
    <Image
      src={image.url}
      alt={image.altText ?? ""}
      fill
      priority={priority}
      sizes="100vw"
      className={cn("object-cover", className)}
    />
  );
}

function SpecList({ className, specs }: { className?: string; specs: string[] }) {
  if (specs.length === 0) return null;
  return (
    <ul className={cn("grid gap-2", className)}>
      {specs.map((spec) => (
        <li
          key={spec}
          className="flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] uppercase"
        >
          <span aria-hidden="true" className="grid size-3 grid-cols-2 gap-px opacity-70">
            <span className="rounded-full bg-current" />
            <span className="rounded-full bg-current" />
            <span className="rounded-full bg-current" />
            <span className="rounded-full bg-signal" />
          </span>
          {spec}
        </li>
      ))}
    </ul>
  );
}

function PricingBand({ product }: { product: ProductDetails }) {
  if (product.priceBreaks.length === 0) return null;
  return (
    <Container>
      <div className="grid gap-8 rounded-2xl bg-[#040404] px-6 py-10 text-white md:grid-cols-[1fr_1.3fr] md:items-center md:gap-12 md:px-10 md:py-14">
        <div className="grid gap-4">
          <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-white/60 uppercase">
            <span className="size-1.5 rounded-full bg-signal" />
            Team pricing
          </p>
          <h2 className="font-pixel text-4xl leading-none tracking-wide uppercase md:text-5xl">
            The more you order, the less each piece costs.
          </h2>
          <p className="font-serif text-lg text-white/70">
            Mix sizes and colors: every {product.title} counts toward the same break. Change the
            quantity above to see where your order lands.
          </p>
        </div>
        <div className="grid gap-5">
          <MerchPriceLadder breaks={product.priceBreaks} tone="dark" />
          <MerchQuoteButton className="border-white/25 hover:border-white" title={product.title} />
        </div>
      </div>
    </Container>
  );
}

function DetailsSection({ product }: { product: ProductDetails }) {
  return (
    <Container>
      <div className="grid gap-8 border-t border-border pt-10 md:grid-cols-3 md:gap-12">
        <h2 className="font-pixel text-3xl leading-none tracking-wide uppercase">Details</h2>
        <div className="grid content-start gap-4">
          <ProductInfoDescription
            className="[&_.prose]:font-serif [&_.prose]:text-lg [&_.prose]:text-foreground/80"
            descriptionHtml={product.descriptionHtml}
          />
          <SpecList specs={product.highlights?.specs ?? []} />
        </div>
        <dl className="grid content-start gap-4 font-mono text-xs tracking-[0.1em] uppercase">
          {[
            ["Your logo", "Printed, embroidered or engraved, matched to the piece"],
            ["Proof first", "Nothing is made until you approve the proof"],
            ["Mix and match", "Sizes and colors all count toward one price break"],
          ].map(([term, text]) => (
            <div key={term} className="grid gap-1 border-b border-border pb-4">
              <dt>{term}</dt>
              <dd className="font-sans text-sm tracking-normal text-muted-foreground normal-case">
                {text}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Container>
  );
}

function PageEnd({ product }: { product: ProductDetails }) {
  return (
    <div className="grid gap-16 pt-16 md:gap-20 md:pt-20">
      <PricingBand product={product} />
      <DetailsSection product={product} />
    </div>
  );
}

const FADE_SIDES = {
  maskImage:
    "linear-gradient(to right, transparent, black 10%, black 90%, transparent), linear-gradient(to bottom, transparent, black 4%, black 85%, transparent)",
  maskComposite: "intersect",
} as const;

// The hero keeps the middle column of the three, so it stays the same width without side content.
function StageLayout({ media, price, product }: LayoutProps) {
  return (
    <>
      {/* Anchored to the page top so the dots run behind the banner and nav, then fade before the next section. */}
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50rem] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
      />
      <section>
        <Container className="grid gap-6 pt-3 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,17rem)] lg:gap-10 lg:pt-6">
          <div className="grid min-w-0 lg:col-start-2">
            <div
              className="relative order-1 -mx-5 aspect-4/5 sm:mx-0 sm:aspect-3/2 lg:aspect-auto lg:h-[calc(100svh-7rem)]"
              style={FADE_SIDES}
            >
              <ColorSwap images={media.heroes} priority className="object-[50%_20%]" />
            </div>
            {media.lifestyle.slice(0, 2).map((image) => (
              <div
                key={image.url}
                className="relative order-3 mt-3 aspect-4/5 overflow-hidden rounded-2xl sm:aspect-3/2 lg:order-2 lg:mt-6 lg:aspect-auto lg:h-[calc(100svh-7rem)]"
              >
                <Photo image={image} />
              </div>
            ))}
            <div className="relative z-10 order-2 -mt-16 sm:-mt-24 lg:sticky lg:bottom-4 lg:order-3 lg:-mt-64">
              <div className="mx-auto grid w-full max-w-lg gap-4 rounded-2xl bg-card/90 p-4 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.5)] ring-1 ring-border backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-studio">
                    <MerchVariantImage fallback={media.packshot?.url} />
                  </span>
                  <div className="grid min-w-0 gap-1">
                    <h1 className="font-pixel text-2xl leading-none tracking-wide uppercase">
                      {product.title}
                    </h1>
                    <p className="truncate font-mono text-xxs tracking-[0.12em] text-muted-foreground uppercase">
                      {(product.highlights?.specs ?? []).join(" · ")}
                    </p>
                  </div>
                </div>
                <MerchOptions />
                <div className="flex items-end gap-2">
                  <MerchQuantity />
                  <MerchBuyAnchor className="flex-1">
                    <MerchAddButton fallbackPrice={price} />
                  </MerchBuyAnchor>
                </div>
                <MerchQuoteButton title={product.title} />
              </div>
            </div>
          </div>
        </Container>
      </section>
      <PageEnd product={product} />
    </>
  );
}
