// One quote design for every output: the web page, the email, the PDF and the share image.
// Built with Hyper Elements, so a single tree of components renders to all of them.
import {
  Button,
  Canvas,
  Column,
  Document,
  Email,
  Heading,
  Image,
  LineBreak,
  Link,
  List,
  ListItem,
  Page,
  PageBreak,
  PageFooter,
  PageNumber,
  Row,
  Section,
  Span,
  Table,
  TableCell,
  TableRow,
  Text,
  token,
} from "@hyper-elements/react";
import type { ReactNode } from "react";

import type { PricedProduct, PricedQuote } from "./pricing";
import { DISPLAY, MONO, PAGE_FONTS, SANS, signal } from "./signal-theme";

export interface QuoteMeta {
  approveUrl: string;
  currency: string;
  issued: Date;
  number: string;
  // Set only on the emailed copy for a lead: their code and a Shopify checkout link with it applied.
  offer?: { code: string; payUrl: string; percent: number } | null;
  pageUrl: string | null;
  preparedFor: string;
  project: string | null;
  // Custom asks (discounts, substitutions) the agent can't grant; the owner reviews them.
  review: string[];
  // The earlier version this one replaces, if any.
  replaces: string | null;
  // True when a product has no decoration metafield, so shipping can't be estimated here.
  shippingAtCheckout: boolean;
  shopEmail: string;
  shopName: string;
  // Set on an old version once a newer one exists, so nobody pays from a stale quote.
  supersededBy: { number: string; url: string } | null;
  validUntil: Date;
  version: number;
}

export type Format = "document" | "email" | "image" | "page";

const RED = "#d71921";

const shortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric",
  });

function Chip({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "dark" | "plain" | "red";
}) {
  const colors = {
    dark: { backgroundColor: "#040404", color: "#ffffff", borderColor: "#040404" },
    plain: { backgroundColor: "#ffffff", color: "#040404", borderColor: "#d8d9d9" },
    red: { backgroundColor: "#fdeaea", color: RED, borderColor: "#f3b8ba" },
  }[tone];
  return (
    <Text
      style={{
        backgroundColor: colors.backgroundColor,
        border: { color: colors.borderColor, style: "solid", width: 1 },
        borderRadius: 4,
        color: colors.color,
        flex: "none",
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: 1,
        padding: [5, 8],
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <Text style={{ apply: ["label"] }}>{children}</Text>;
}

function Stat({ label, value, red }: { label: string; red?: boolean; value: string }) {
  return (
    <Column style={{ apply: ["card"], gap: 6, padding: [16, 18] }}>
      <Label>{label}</Label>
      <Text
        style={{ color: red ? RED : token("colors.foreground"), fontFamily: DISPLAY, fontSize: 24 }}
      >
        {value}
      </Text>
    </Column>
  );
}

function ProductRow({
  product,
  money,
  format,
}: {
  format: Format;
  money: (c: number) => string;
  product: PricedProduct;
}) {
  const short = product.variants.filter((v) => (v.shortBy ?? 0) > 0);
  return (
    <Column
      style={{
        backgroundColor: "#ffffff",
        border: { color: token("colors.border"), style: "solid", width: 1 },
        borderRadius: 6,
        gap: format === "document" ? 8 : 12,
        padding: format === "document" ? 12 : 16,
      }}
    >
      <Row style={{ alignItems: "center", gap: 16 }} stackOnMobile={false}>
        {product.image ? (
          <Column
            style={{
              backgroundColor: token("colors.background"),
              borderRadius: 4,
              width: format === "document" ? 64 : 84,
            }}
          >
            <Image
              alt={product.title}
              src={{
                height: product.image.height,
                src: product.image.url,
                width: product.image.width,
              }}
              style={{ borderRadius: 4, width: format === "document" ? 64 : 84 }}
            />
          </Column>
        ) : null}
        <Column style={{ gap: 3 }}>
          <Heading level={3}>{product.title}</Heading>
          <Text style={{ color: token("colors.muted"), fontSize: 12 }}>{product.decoration}</Text>
        </Column>
        <Column style={{ gap: 2, width: 140 }}>
          <Text style={{ fontSize: 16, fontWeight: 700, textAlign: "right" }}>
            {money(product.amount)}
          </Text>
          <Text
            style={{
              color: token("colors.muted"),
              fontFamily: MONO,
              fontSize: 11,
              textAlign: "right",
            }}
          >
            {product.qty} × {money(product.unitCents)}
          </Text>
        </Column>
      </Row>
      <Table
        style={{
          cellPadding: format === "document" ? [3, 0] : [6, 0],
          rowBorder: { color: token("colors.border"), style: "solid", width: 1 },
          width: "100%",
        }}
      >
        {product.variants.map((v) => (
          <TableRow key={v.label}>
            <TableCell style={{ fontSize: 12 }}>{v.label}</TableCell>
            <TableCell style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", width: 60 }}>
              ×{v.qty}
            </TableCell>
            <TableCell
              style={{
                color: v.shortBy ? RED : token("colors.muted"),
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: 1,
                textAlign: "right",
                width: 130,
              }}
            >
              {v.shortBy ? `● SHORT ${v.shortBy}` : "● IN STOCK"}
            </TableCell>
          </TableRow>
        ))}
      </Table>
      <Text
        style={{
          backgroundColor: token("colors.background"),
          borderRadius: 4,
          fontSize: 12,
          padding: [8, 12],
        }}
      >
        <Span style={{ fontFamily: MONO, fontWeight: 500 }}>{product.tierLabel} PC PRICE.</Span>{" "}
        {product.belowMinimum
          ? `Minimum order is ${product.belowMinimum} pieces; priced at the first break.`
          : product.nextBreak
            ? `Add ${product.nextBreak.addQty} more to reach ${product.nextBreak.min}+ at ${money(product.nextBreak.unitCents)}, ${money(product.nextBreak.savesPerUnit)} less per piece.`
            : "Best price on the ladder."}
        {short.length
          ? ` Some sizes are short right now; the owner confirms restock dates before production.`
          : ""}
      </Text>
    </Column>
  );
}

function Totals({
  dense,
  meta,
  money,
  quote,
}: {
  dense?: boolean;
  meta: QuoteMeta;
  money: (c: number) => string;
  quote: PricedQuote;
}) {
  const rows: [string, string, "estimate" | "final"][] = [
    [`Items, ${quote.pieces} pieces`, money(quote.subtotal), "final"],
    ["Logo setup", quote.setup ? money(quote.setup) : "Free", "final"],
    ...(quote.rush
      ? ([
          [`Rush production, ${quote.productionDays} business days`, money(quote.rush), "final"],
        ] as [string, string, "final"][])
      : []),
    meta.shippingAtCheckout
      ? ["Ground shipping, one US address", "At checkout", "estimate"]
      : quote.shipping
        ? ["Ground shipping, one US address", money(quote.shipping), "estimate"]
        : ["Ground shipping, one US address", "Free", "final"],
    ["Sales tax", "At checkout", "estimate"],
  ];
  return (
    <Table
      style={{
        cellPadding: dense ? [5, 0] : [10, 0],
        rowBorder: { color: token("colors.border"), style: "solid", width: 1 },
        width: "100%",
      }}
    >
      {rows.map(([label, value, kind]) => (
        <TableRow key={label}>
          <TableCell style={{ color: token("colors.muted"), fontSize: dense ? 13 : undefined }}>
            {label}
          </TableCell>
          <TableCell
            style={{
              color: kind === "estimate" ? RED : token("colors.muted"),
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: 1,
              textAlign: "right",
              width: 90,
            }}
          >
            {kind === "estimate" ? "ESTIMATE" : "FINAL"}
          </TableCell>
          <TableCell style={{ textAlign: "right", width: 120 }}>{value}</TableCell>
        </TableRow>
      ))}
      <TableRow footer>
        <TableCell style={{ fontSize: 15, fontWeight: 700 }}>Quote total before tax</TableCell>
        <TableCell />
        <TableCell
          style={{
            color: token("colors.foreground"),
            fontFamily: DISPLAY,
            fontSize: 20,
            textAlign: "right",
          }}
        >
          {money(quote.total)}
        </TableCell>
      </TableRow>
    </Table>
  );
}

// The content every output shares. Each root below wraps it with what only that output needs.
function QuoteBody({
  format,
  meta,
  quote,
}: {
  format: Format;
  meta: QuoteMeta;
  quote: PricedQuote;
}) {
  const money = (c: number) =>
    new Intl.NumberFormat("en-US", { currency: meta.currency, style: "currency" }).format(c / 100);
  const stale = meta.supersededBy;
  return (
    <>
      {stale ? (
        <Row
          style={{
            alignItems: "center",
            backgroundColor: RED,
            borderRadius: 6,
            gap: 12,
            padding: [14, 18],
          }}
          stackOnMobile={false}
        >
          <Column>
            <Text style={{ color: "#ffffff", fontFamily: MONO, fontSize: 12, letterSpacing: 1 }}>
              ● REPLACED BY {stale.number}. THESE PRICES NO LONGER APPLY.
            </Text>
          </Column>
          <Column style={{ width: 150 }}>
            <Text style={{ textAlign: "right" }}>
              <Link
                href={stale.url}
                style={{ color: "#ffffff", fontFamily: MONO, fontSize: 12, letterSpacing: 1 }}
              >
                OPEN v{meta.version + 1} ›
              </Link>
            </Text>
          </Column>
        </Row>
      ) : null}

      <Column style={{ apply: ["card"], gap: 20, padding: [26, 28] }}>
        <Row style={{ alignItems: "center" }} stackOnMobile={false}>
          <Column>
            <Text style={{ fontFamily: DISPLAY, fontSize: 18, letterSpacing: 1 }}>
              {meta.shopName.toUpperCase()} (R)
            </Text>
          </Column>
          <Column>
            <Text
              style={{
                color: token("colors.muted"),
                fontFamily: MONO,
                fontSize: 11,
                textAlign: "right",
              }}
            >
              QUOTE {meta.number}
              <LineBreak />
              {longDate(meta.issued).toUpperCase()}
            </Text>
          </Column>
        </Row>
        <Row style={{ gap: 6 }} stackOnMobile={false}>
          <Chip tone={stale ? "plain" : "dark"}>
            {stale
              ? "○ PRICE LOCK ENDED"
              : `● PRICE LOCKED UNTIL ${shortDate(meta.validUntil).toUpperCase()}`}
          </Chip>
          <Chip>
            {meta.replaces ? `v${meta.version} · REPLACES ${meta.replaces}` : `v${meta.version}`}
          </Chip>
          {meta.review.length ? <Chip tone="red">● NEEDS REVIEW</Chip> : null}
          {quote.shortPieces ? <Chip tone="red">● {quote.shortPieces} SHORT IN STOCK</Chip> : null}
        </Row>
        <Column style={{ gap: 6 }}>
          <Label>Prepared for {meta.preparedFor}</Label>
          <Heading level={1}>{money(quote.total)}</Heading>
          <Text style={{ color: token("colors.muted") }}>
            {meta.project ? `${meta.project}. ` : ""}
            {quote.pieces} branded pieces, printed and shipped. Prices are locked until{" "}
            {longDate(meta.validUntil)}.
          </Text>
        </Column>
      </Column>

      <Row style={{ gap: 12 }}>
        <Stat label="In hands by" value={shortDate(quote.inHands)} />
        <Stat label="Production" value={`${quote.productionDays} days`} />
        {/* Below the first price break there is nothing saved; a red $0.00 reads like an error, so show the lock date. */}
        {quote.savings > 0 ? (
          <Stat label="Bulk savings" red value={money(quote.savings)} />
        ) : (
          <Stat label="Price locked to" value={shortDate(meta.validUntil)} />
        )}
      </Row>

      {meta.review.length ? (
        <Column style={{ apply: ["card"], border: { color: RED, style: "solid", width: 1 } }}>
          <Text style={{ color: RED, fontFamily: MONO, fontSize: 11, letterSpacing: 1 }}>
            ● NEEDS OWNER REVIEW
          </Text>
          <List style={{ gap: 4 }} type="bullet">
            {meta.review.map((r) => (
              <ListItem key={r}>{r}</ListItem>
            ))}
          </List>
          <Text style={{ color: token("colors.muted"), fontSize: 12 }}>
            The prices on this quote are the standard price breaks. Discounts and substitutions are
            approved by the owner, never by the agent; you'll get a reply within one business day.
          </Text>
        </Column>
      ) : null}

      <Column style={{ apply: ["card"] }}>
        <Heading level={2}>What's in this quote</Heading>
        {quote.products.map((product) => (
          <ProductRow format={format} key={product.handle} money={money} product={product} />
        ))}
      </Column>

      <Column style={{ apply: ["card"] }}>
        <Totals meta={meta} money={money} quote={quote} />
        <Text style={{ color: token("colors.muted"), fontSize: 12 }}>
          {quote.freeShippingGap > 0 && !meta.shippingAtCheckout
            ? `${money(quote.freeShippingGap)} more in items ships free. `
            : ""}
          FINAL amounts are locked until {shortDate(meta.validUntil)}. ESTIMATE amounts are
          confirmed at checkout.
        </Text>
      </Column>

      <Column style={{ apply: ["card"] }}>
        <Heading level={2}>What happens next</Heading>
        <List style={{ gap: 6 }} type="number">
          <ListItem>
            Approve this quote. We check stock again at that moment; nothing is charged until you
            pay the invoice.
          </ListItem>
          <ListItem>
            Reply with your logo as SVG, AI or PDF. We send a digital proof within one business day.
          </ListItem>
          <ListItem>
            Approve the proof and production starts: {quote.productionDays} business days, then
            about 3 days of ground shipping.
          </ListItem>
          <ListItem>
            Need a different quantity? Ask the agent. You get a new version and this one is marked
            as replaced.
          </ListItem>
        </List>
        {stale ? (
          <Text style={{ color: RED, fontFamily: MONO, fontSize: 12 }}>
            This version can't be approved. Open {stale.number} instead.
          </Text>
        ) : (
          <Row style={{ alignItems: "center", gap: 12 }}>
            {meta.offer ? (
              <Button href={meta.offer.payUrl}>
                PAY NOW · {meta.offer.percent}% OFF WITH {meta.offer.code} ›
              </Button>
            ) : (
              <Button href={meta.approveUrl}>APPROVE QUOTE ›</Button>
            )}
            {format === "email" && meta.pageUrl ? (
              <Text style={{ fontSize: 12 }}>
                or view it online at <Link href={meta.pageUrl}>{meta.pageUrl}</Link>
              </Text>
            ) : null}
          </Row>
        )}
      </Column>

      <Text
        style={{
          color: token("colors.muted"),
          fontFamily: MONO,
          fontSize: 10,
          padding: [0, 8],
          textAlign: "center",
        }}
      >
        {/* The contact email stays in the Approve button and reply-to only, never printed on the quote. */}
        {meta.shopName.toUpperCase()} · PRICES IN {meta.currency} FROM THE STORE'S PRICE BREAKS IN
        SHOPIFY · BUILT WITH EVE + HYPER ELEMENTS
      </Text>
    </>
  );
}

export function QuoteEmail(props: { meta: QuoteMeta; quote: PricedQuote }) {
  const total = new Intl.NumberFormat("en-US", {
    currency: props.meta.currency,
    style: "currency",
  }).format(props.quote.total / 100);
  return (
    <Email
      previewText={
        props.meta.supersededBy
          ? `Replaced by ${props.meta.supersededBy.number}`
          : `Your merch quote: ${props.quote.pieces} pieces, ${total}`
      }
      theme={signal}
      title={`Quote ${props.meta.number}`}
      width={640}
    >
      <Section style={{ gap: 14, padding: [24, 12] }}>
        <QuoteBody format="email" {...props} />
      </Section>
    </Email>
  );
}

export function QuotePage(props: { meta: QuoteMeta; quote: PricedQuote }) {
  return (
    <Page
      description={`Merch quote ${props.meta.number} for ${props.meta.preparedFor}`}
      fonts={PAGE_FONTS}
      theme={signal}
      title={`Quote ${props.meta.number} · ${props.meta.shopName}`}
      width={760}
    >
      <Section style={{ gap: 14, padding: [40, 16] }}>
        <QuoteBody format="page" {...props} />
      </Section>
    </Page>
  );
}

// The PDF is one Letter page: a Document only splits at PageBreak, so items are a single table, not cards.
// Past this many item rows the totals would run off the page, so they start page 2 instead.
const ONE_PAGE_LINES = 5;

function DocumentBody({ meta, quote }: { meta: QuoteMeta; quote: PricedQuote }) {
  const money = (c: number) =>
    new Intl.NumberFormat("en-US", { currency: meta.currency, style: "currency" }).format(c / 100);
  const stale = meta.supersededBy;
  const muted = token("colors.muted");
  const cell = { fontSize: 12, verticalAlign: "top" } as const;
  const num = { ...cell, fontFamily: MONO, textAlign: "right" } as const;
  return (
    <>
      {stale ? (
        <Text
          style={{
            backgroundColor: RED,
            borderRadius: 6,
            color: "#ffffff",
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: 1,
            padding: [10, 14],
          }}
        >
          ● REPLACED BY {stale.number}. THESE PRICES NO LONGER APPLY.
        </Text>
      ) : null}

      <Column style={{ apply: ["card"], gap: 10, padding: [16, 22] }}>
        <Row style={{ alignItems: "center" }} stackOnMobile={false}>
          <Column>
            <Text style={{ fontFamily: DISPLAY, fontSize: 18, letterSpacing: 1 }}>
              {meta.shopName.toUpperCase()} (R)
            </Text>
          </Column>
          <Column>
            <Text style={{ color: muted, fontFamily: MONO, fontSize: 11, textAlign: "right" }}>
              QUOTE {meta.number}
              <LineBreak />
              {longDate(meta.issued).toUpperCase()}
            </Text>
          </Column>
        </Row>
        <Row style={{ gap: 6 }} stackOnMobile={false}>
          <Chip tone={stale ? "plain" : "dark"}>
            {stale
              ? "○ PRICE LOCK ENDED"
              : `● PRICE LOCKED UNTIL ${shortDate(meta.validUntil).toUpperCase()}`}
          </Chip>
          <Chip>
            {meta.replaces ? `v${meta.version} · REPLACES ${meta.replaces}` : `v${meta.version}`}
          </Chip>
          {meta.review.length ? <Chip tone="red">● NEEDS REVIEW</Chip> : null}
          {quote.shortPieces ? <Chip tone="red">● {quote.shortPieces} SHORT IN STOCK</Chip> : null}
        </Row>
        <Row style={{ alignItems: "end", gap: 16 }} stackOnMobile={false}>
          <Column style={{ gap: 4 }}>
            <Label>Prepared for {meta.preparedFor}</Label>
            <Heading level={1}>{money(quote.total)}</Heading>
            <Text style={{ color: muted, fontSize: 12 }}>
              {meta.project ? `${meta.project}. ` : ""}
              {quote.pieces} branded pieces, printed and shipped.
            </Text>
          </Column>
          <Column style={{ width: 230 }}>
            <Text
              style={{
                color: muted,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: 1,
                textAlign: "right",
              }}
            >
              IN HANDS BY {shortDate(quote.inHands).toUpperCase()}
              <LineBreak />
              {quote.productionDays} BUSINESS DAYS PRODUCTION
              {quote.savings > 0 ? (
                <>
                  <LineBreak />
                  <Span style={{ color: RED }}>BULK SAVINGS {money(quote.savings)}</Span>
                </>
              ) : null}
            </Text>
          </Column>
        </Row>
      </Column>

      {meta.review.length ? (
        <Column
          style={{ apply: ["card"], border: { color: RED, style: "solid", width: 1 }, gap: 6 }}
        >
          <Text style={{ color: RED, fontFamily: MONO, fontSize: 10, letterSpacing: 1 }}>
            ● NEEDS OWNER REVIEW: {meta.review.join("; ")}
          </Text>
          <Text style={{ color: muted, fontSize: 11 }}>
            Prices here are the standard price breaks. The owner replies within one business day.
          </Text>
        </Column>
      ) : null}

      <Column style={{ apply: ["card"], gap: 8 }}>
        <Heading level={2}>What's in this quote</Heading>
        <Table
          style={{
            cellPadding: [5, 4],
            rowBorder: { color: token("colors.border"), style: "solid", width: 1 },
            width: "100%",
          }}
        >
          <TableRow header>
            <TableCell style={{ fontSize: 11, width: 44 }} />
            <TableCell style={{ fontSize: 11 }}>Item</TableCell>
            <TableCell style={{ fontSize: 11, textAlign: "right", width: 50 }}>Qty</TableCell>
            <TableCell style={{ fontSize: 11, textAlign: "right", width: 80 }}>Each</TableCell>
            <TableCell style={{ fontSize: 11, textAlign: "right", width: 90 }}>Amount</TableCell>
          </TableRow>
          {quote.products.map((product) => (
            <TableRow key={product.handle}>
              <TableCell style={{ verticalAlign: "top", width: 44 }}>
                {product.image ? (
                  <Image
                    alt={product.title}
                    src={{
                      height: product.image.height,
                      src: product.image.url,
                      width: product.image.width,
                    }}
                    style={{ borderRadius: 4, width: 36 }}
                  />
                ) : null}
              </TableCell>
              <TableCell style={cell}>
                <Span style={{ fontWeight: 600 }}>{product.title}</Span>
                <Span style={{ color: muted }}> · {product.decoration}</Span>
                <LineBreak />
                <Span style={{ color: muted, fontSize: 11 }}>
                  {product.variants
                    .map((v) => `${v.label} ×${v.qty}${v.shortBy ? ` (short ${v.shortBy})` : ""}`)
                    .join(" · ")}
                </Span>
              </TableCell>
              <TableCell style={num}>{product.qty}</TableCell>
              <TableCell style={num}>{money(product.unitCents)}</TableCell>
              <TableCell style={{ ...cell, fontWeight: 700, textAlign: "right" }}>
                {money(product.amount)}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Column>

      {quote.products.length + (meta.review.length ? 1 : 0) > ONE_PAGE_LINES ? <PageBreak /> : null}

      <Column style={{ apply: ["card"], gap: 8 }}>
        <Totals dense meta={meta} money={money} quote={quote} />
        <Text style={{ color: muted, fontSize: 11 }}>
          FINAL amounts are locked until {shortDate(meta.validUntil)}. ESTIMATE amounts are
          confirmed at checkout.
        </Text>
        <Text style={{ fontSize: 12, padding: [6, 0, 0, 0] }}>
          <Span style={{ fontWeight: 600 }}>Next: </Span>
          {stale
            ? `this version can't be approved. Use ${stale.number} instead.`
            : `approve the quote and send your logo as SVG, AI or PDF. You get a proof within one business day, then ${quote.productionDays} business days of production and about 3 days of shipping. Nothing is charged until you pay the invoice.`}
        </Text>
      </Column>
    </>
  );
}

export function QuoteDocument(props: { meta: QuoteMeta; quote: PricedQuote }) {
  return (
    <Document
      margin={36}
      size="Letter"
      style={{ gap: 14 }}
      theme={signal}
      title={`Quote ${props.meta.number}`}
    >
      <DocumentBody {...props} />
      <PageFooter>
        <Text
          style={{
            color: token("colors.muted"),
            fontFamily: MONO,
            fontSize: 8,
            textAlign: "right",
          }}
        >
          {props.meta.shopName.toUpperCase()} · QUOTE {props.meta.number} · BUILT WITH EVE + HYPER
          ELEMENTS · PAGE <PageNumber /> OF <PageNumber total />
        </Text>
      </PageFooter>
    </Document>
  );
}

// 1200x630: the image chat apps and social posts show when the quote link is shared.
export function QuoteCard({ meta, quote }: { meta: QuoteMeta; quote: PricedQuote }) {
  const money = (c: number) =>
    new Intl.NumberFormat("en-US", {
      currency: meta.currency,
      maximumFractionDigits: 0,
      style: "currency",
    }).format(c / 100);
  const tile = (label: string, value: string, red = false) => (
    <Column
      key={label}
      style={{
        backgroundColor: "#ffffff",
        border: { color: "#d8d9d9", style: "solid", width: 1 },
        borderRadius: 6,
        gap: 8,
        padding: [18, 22],
      }}
    >
      <Text style={{ color: "#595a5a", fontFamily: MONO, fontSize: 16, letterSpacing: 2 }}>
        {label}
      </Text>
      <Text style={{ color: red ? RED : "#040404", fontFamily: DISPLAY, fontSize: 34 }}>
        {value}
      </Text>
    </Column>
  );
  return (
    <Canvas
      height={630}
      style={{
        backgroundColor: "#f4f4f4",
        color: "#040404",
        fontFamily: SANS,
        gap: 26,
        justifyContent: "space-between",
        padding: 60,
      }}
      width={1200}
    >
      <Row style={{ alignItems: "center" }}>
        <Column>
          <Text
            style={{ fontFamily: DISPLAY, fontSize: 30, letterSpacing: 2 }}
          >{`${meta.shopName.toUpperCase()} (R)`}</Text>
        </Column>
        <Column>
          <Text
            style={{ color: "#595a5a", fontFamily: MONO, fontSize: 20, textAlign: "right" }}
          >{`QUOTE ${meta.number}`}</Text>
        </Column>
      </Row>
      <Column style={{ gap: 12 }}>
        <Text
          style={{ color: RED, fontFamily: MONO, fontSize: 22, letterSpacing: 2 }}
        >{`● FOR ${meta.preparedFor.toUpperCase()}`}</Text>
        <Text style={{ fontFamily: DISPLAY, fontSize: 120, lineHeight: 1 }}>
          {money(quote.total)}
        </Text>
        <Text style={{ color: "#595a5a", fontSize: 28 }}>
          {quote.products.map((p) => `${p.qty} ${p.title.toLowerCase()}`).join(" · ")}
        </Text>
      </Column>
      <Row style={{ gap: 16 }}>
        {tile("IN HANDS BY", shortDate(quote.inHands).toUpperCase())}
        {tile("PRICE LOCKED", `TO ${shortDate(meta.validUntil).toUpperCase()}`)}
        {quote.savings > 0
          ? tile("BULK SAVINGS", money(quote.savings), true)
          : tile("PIECES", String(quote.pieces))}
      </Row>
    </Canvas>
  );
}
