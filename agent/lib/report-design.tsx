// The owner's sales report in the Signal look, from one Hyper Elements tree: web page, email and PDF.
import {
  Column,
  Document,
  Email,
  Heading,
  Page,
  PageBreak,
  PageFooter,
  PageNumber,
  Row,
  Section,
  Table,
  TableCell,
  TableRow,
  Text,
  token,
} from "@hyper-elements/react";

import { DISPLAY, MONO, PAGE_FONTS, signal } from "./signal-theme";

export interface ReportDay {
  cancelled: number;
  gross: number;
  label: string;
  net: number;
  orders: number;
  refunds: number;
}

export interface ReportData {
  average: number;
  cancelled: { amount: number; orders: number };
  currency: string;
  days: ReportDay[];
  generated: string;
  gross: { amount: number; orders: number };
  net: number;
  number: string;
  period: string;
  refunds: { amount: number; orders: number };
  shopName: string;
  testOrders: number;
  topProducts: { name: string; revenue: number; units: number }[];
  units: number;
}

type Format = "document" | "email" | "page";

const RED = "#d71921";

function ReportBody({ data, format }: { data: ReportData; format: Format }) {
  const money = (c: number) =>
    new Intl.NumberFormat("en-US", { currency: data.currency, style: "currency" }).format(c / 100);
  const minus = (c: number) => (c ? `−${money(c)}` : money(0));
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const cell = { fontFamily: MONO, fontSize: 12, textAlign: "right" as const };
  return (
    <>
      <Column style={{ apply: ["card"], gap: 18, padding: [26, 28] }}>
        <Row style={{ alignItems: "center" }} stackOnMobile={false}>
          <Column>
            <Text style={{ fontFamily: DISPLAY, fontSize: 18, letterSpacing: 1 }}>
              {data.shopName.toUpperCase()} (R)
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
              SALES REPORT {data.number}
            </Text>
          </Column>
        </Row>
        <Column style={{ gap: 6 }}>
          <Text style={{ apply: ["label"] }}>Net sales · {data.period}</Text>
          <Heading level={1}>{money(data.net)}</Heading>
          <Text style={{ color: token("colors.muted") }}>
            Gross sales minus cancellations and refunds. This is the figure to check against Shopify
            payouts, before processing fees.
          </Text>
        </Column>
      </Column>

      <Column style={{ apply: ["card"] }}>
        <Heading level={2}>From gross to net</Heading>
        <Table
          style={{
            cellPadding: [10, 0],
            rowBorder: { color: token("colors.border"), style: "solid", width: 1 },
            width: "100%",
          }}
        >
          <TableRow>
            <TableCell>Gross sales, {plural(data.gross.orders, "order")}</TableCell>
            <TableCell style={{ textAlign: "right" }}>{money(data.gross.amount)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Cancelled, {plural(data.cancelled.orders, "order")}</TableCell>
            <TableCell
              style={{
                color: data.cancelled.amount ? RED : token("colors.muted"),
                textAlign: "right",
              }}
            >
              {minus(data.cancelled.amount)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Refunds and returns, {plural(data.refunds.orders, "order")}</TableCell>
            <TableCell
              style={{
                color: data.refunds.amount ? RED : token("colors.muted"),
                textAlign: "right",
              }}
            >
              {minus(data.refunds.amount)}
            </TableCell>
          </TableRow>
          <TableRow footer>
            <TableCell style={{ fontWeight: 700 }}>Net sales</TableCell>
            <TableCell
              style={{
                color: token("colors.foreground"),
                fontFamily: DISPLAY,
                fontSize: 20,
                textAlign: "right",
              }}
            >
              {money(data.net)}
            </TableCell>
          </TableRow>
        </Table>
      </Column>

      <Row style={{ gap: 12 }}>
        {[
          ["Orders kept", String(data.gross.orders - data.cancelled.orders)],
          ["Average net order", money(data.average)],
          ["Items sold", String(data.units)],
        ].map(([label, value]) => (
          <Column key={label} style={{ apply: ["card"], gap: 6, padding: [16, 18] }}>
            <Text style={{ apply: ["label"] }}>{label}</Text>
            <Text style={{ fontFamily: DISPLAY, fontSize: 24 }}>{value}</Text>
          </Column>
        ))}
      </Row>

      {format === "document" ? <PageBreak /> : null}

      <Column style={{ apply: ["card"] }}>
        <Heading level={2}>By day</Heading>
        <Table
          style={{
            cellPadding: [7, 0],
            rowBorder: { color: token("colors.border"), style: "solid", width: 1 },
            width: "100%",
          }}
        >
          <TableRow header>
            {["Day", "Orders", "Gross", "Cancel + refund", "Net"].map((h, i) => (
              <TableCell
                key={h}
                style={{ apply: ["label"], fontSize: 10, textAlign: i ? "right" : "left" }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
          {data.days.map((day) => (
            <TableRow key={day.label}>
              <TableCell style={{ fontSize: 13 }}>{day.label}</TableCell>
              <TableCell style={cell}>{day.orders}</TableCell>
              <TableCell style={cell}>{money(day.gross)}</TableCell>
              <TableCell
                style={{
                  ...cell,
                  color: day.cancelled + day.refunds ? RED : token("colors.muted"),
                }}
              >
                {minus(day.cancelled + day.refunds)}
              </TableCell>
              <TableCell style={{ ...cell, fontWeight: 500 }}>{money(day.net)}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Column>

      {format === "document" && data.days.length > 12 ? <PageBreak /> : null}

      <Column style={{ apply: ["card"] }}>
        <Heading level={2}>Top products</Heading>
        {data.topProducts.length ? (
          <Table
            style={{
              cellPadding: [8, 0],
              rowBorder: { color: token("colors.border"), style: "solid", width: 1 },
              width: "100%",
            }}
          >
            {data.topProducts.map((p) => (
              <TableRow key={p.name}>
                <TableCell style={{ fontSize: 13 }}>{p.name}</TableCell>
                <TableCell style={{ ...cell, width: 80 }}>×{p.units}</TableCell>
                <TableCell style={{ ...cell, width: 120 }}>{money(p.revenue)}</TableCell>
              </TableRow>
            ))}
          </Table>
        ) : (
          <Text style={{ color: token("colors.muted") }}>No sales in this period yet.</Text>
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
        {`IN ${data.currency} FROM SHOPIFY ORDERS · REFUNDS COUNT ON THE ORDER'S DAY${data.testOrders ? ` · ${data.testOrders} TEST ORDERS LEFT OUT` : ""} · ${data.generated.toUpperCase()}`}
      </Text>
    </>
  );
}

export function ReportPage({ data }: { data: ReportData }) {
  return (
    <Page
      description={`Sales report ${data.number}`}
      fonts={PAGE_FONTS}
      theme={signal}
      title={`Sales report ${data.number}`}
      width={760}
    >
      <Section style={{ gap: 14, padding: [40, 16] }}>
        <ReportBody data={data} format="page" />
      </Section>
    </Page>
  );
}

export function ReportEmail({ data }: { data: ReportData }) {
  const net = new Intl.NumberFormat("en-US", { currency: data.currency, style: "currency" }).format(
    data.net / 100,
  );
  return (
    <Email
      previewText={`${net} net sales, ${data.period}`}
      theme={signal}
      title={`Sales report ${data.number}`}
      width={640}
    >
      <Section style={{ gap: 14, padding: [24, 12] }}>
        <ReportBody data={data} format="email" />
      </Section>
    </Email>
  );
}

export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document
      margin={36}
      size="Letter"
      style={{ gap: 14 }}
      theme={signal}
      title={`Sales report ${data.number}`}
    >
      <ReportBody data={data} format="document" />
      <PageFooter>
        <Text
          style={{
            color: token("colors.muted"),
            fontFamily: MONO,
            fontSize: 8,
            textAlign: "right",
          }}
        >
          {data.shopName.toUpperCase()} · SALES REPORT {data.number} · PAGE <PageNumber /> OF{" "}
          <PageNumber total />
        </Text>
      </PageFooter>
    </Document>
  );
}
