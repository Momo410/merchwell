// Owner sales report: Shopify Admin orders summed in code into gross, cancellations, refunds and net.
// The model never supplies amounts; every figure comes from the Admin API.
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ElementsError, formatDiagnostics, render } from "@hyper-elements/react";
import { renderPdf } from "@hyper-elements/react/pdf";
import { createElement } from "react";

import { shopConfig } from "../../lib/config";
import { signalFonts } from "./render-quote";
import {
  type ReportData,
  type ReportDay,
  ReportDocument,
  ReportEmail,
  ReportPage,
} from "./report-design";
import { adminQuery, getAdminToken } from "./shopify-admin";

type MoneySet = { shopMoney: { amount: string } };
interface AdminOrder {
  cancelledAt: string | null;
  createdAt: string;
  lineItems: { nodes: { discountedTotalSet: MoneySet; name: string; quantity: number }[] };
  test: boolean;
  totalPriceSet: MoneySet;
  totalRefundedSet: MoneySet;
}

type OrdersResult = {
  orders: { nodes: AdminOrder[]; pageInfo: { endCursor: string | null; hasNextPage: boolean } };
  shop: { currencyCode: string; ianaTimezone: string; name: string };
};

const DAY = 86_400_000;
const ORDERS_QUERY = `#graphql
  query SalesReportOrders($after: String, $query: String!) {
    shop { currencyCode ianaTimezone name }
    orders(first: 100, after: $after, query: $query, sortKey: CREATED_AT) {
      nodes {
        cancelledAt
        createdAt
        lineItems(first: 50) { nodes { discountedTotalSet { shopMoney { amount } } name quantity } }
        test
        totalPriceSet { shopMoney { amount } }
        totalRefundedSet { shopMoney { amount } }
      }
      pageInfo { endCursor hasNextPage }
    }
  }`;

const cents = (money: MoneySet) => Math.round(Number(money.shopMoney.amount) * 100);
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(value / 100);

async function fetchOrders(token: string, since: Date) {
  const orders: AdminOrder[] = [];
  let after: string | null = null;
  let shop: OrdersResult["shop"] | undefined;
  do {
    const data: OrdersResult = await adminQuery<OrdersResult>(token, ORDERS_QUERY, {
      after,
      query: `created_at:>='${since.toISOString()}'`,
    });
    shop = data.shop;
    orders.push(...data.orders.nodes);
    after = data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null;
  } while (after && orders.length < 2_000);
  return { orders, shop: shop! };
}

// Gross counts every real order at its original total. A cancelled order comes off whole (its refund
// isn't counted again); kept orders come off by what was refunded or returned.
function summarize(orders: AdminOrder[], days: number, timeZone: string, now: Date) {
  const dayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone });
  const dayLabel = (date: Date) =>
    date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      timeZone,
      weekday: "short",
    });
  const byDay = new Map<string, ReportDay>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY);
    byDay.set(dayKey(date), {
      cancelled: 0,
      gross: 0,
      label: dayLabel(date),
      net: 0,
      orders: 0,
      refunds: 0,
    });
  }
  const products = new Map<string, { revenue: number; units: number }>();
  const gross = { amount: 0, orders: 0 };
  const cancelled = { amount: 0, orders: 0 };
  const refunds = { amount: 0, orders: 0 };
  let testOrders = 0;
  let units = 0;
  for (const order of orders) {
    const day = byDay.get(dayKey(new Date(order.createdAt)));
    if (!day) continue;
    if (order.test) {
      testOrders++;
      continue;
    }
    const total = cents(order.totalPriceSet);
    gross.amount += total;
    gross.orders++;
    day.gross += total;
    day.orders++;
    if (order.cancelledAt) {
      cancelled.amount += total;
      cancelled.orders++;
      day.cancelled += total;
      continue;
    }
    const refunded = cents(order.totalRefundedSet);
    if (refunded) {
      refunds.amount += refunded;
      refunds.orders++;
      day.refunds += refunded;
    }
    for (const line of order.lineItems.nodes) {
      units += line.quantity;
      const product = products.get(line.name) ?? { revenue: 0, units: 0 };
      product.units += line.quantity;
      product.revenue += cents(line.discountedTotalSet);
      products.set(line.name, product);
    }
  }
  for (const day of byDay.values()) day.net = day.gross - day.cancelled - day.refunds;
  const net = gross.amount - cancelled.amount - refunds.amount;
  const kept = gross.orders - cancelled.orders;
  const allDays = [...byDay.values()];
  return {
    average: kept ? Math.round(net / kept) : 0,
    cancelled,
    // Long periods list only days with orders, so the printed report stays short.
    days: days > 14 ? allDays.filter((d) => d.orders) : allDays,
    first: allDays[0]?.label ?? "",
    gross,
    last: allDays.at(-1)?.label ?? "",
    net,
    refunds,
    testOrders,
    topProducts: [...products.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, p]) => ({ name, ...p })),
    units,
  };
}

export async function writeSalesReport(days: number) {
  const token = await getAdminToken();
  if (!token)
    return {
      message:
        "Sales reports need an Admin API app with read_orders. Set SHOPIFY_ADMIN_CLIENT_ID and SHOPIFY_ADMIN_CLIENT_SECRET in .env.local.",
      ok: false as const,
    };

  const now = new Date();
  const { orders, shop } = await fetchOrders(token, new Date(now.getTime() - (days + 1) * DAY));
  const s = summarize(orders, days, shop.ianaTimezone, now);
  const id = `R-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const data: ReportData = {
    average: s.average,
    cancelled: s.cancelled,
    currency: shop.currencyCode,
    days: s.days,
    generated: `Generated ${now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: shop.ianaTimezone })}`,
    gross: s.gross,
    net: s.net,
    number: id,
    period: `Last ${days} day${days === 1 ? "" : "s"}, ${s.first} to ${s.last}`,
    refunds: s.refunds,
    shopName: shop.name || shopConfig.site.name,
    testOrders: s.testOrders,
    topProducts: s.topProducts,
    units: s.units,
  };

  const dir = join(process.cwd(), "public", "reports", id);
  mkdirSync(dir, { recursive: true });
  try {
    const page = await render(createElement(ReportPage, { data }));
    const email = await render(createElement(ReportEmail, { data }));
    writeFileSync(join(dir, "report.html"), page.html);
    writeFileSync(join(dir, "email.html"), email.html);
    writeFileSync(join(dir, "email.txt"), email.text);
    const { pdf } = await renderPdf(createElement(ReportDocument, { data }), {
      date: now,
      fonts: await signalFonts(),
    });
    writeFileSync(join(dir, "report.pdf"), pdf);
  } catch (error) {
    if (error instanceof ElementsError)
      throw new Error(formatDiagnostics(error.diagnostics), { cause: error });
    throw error;
  }

  const c = shop.currencyCode;
  return {
    average: money(s.average, c),
    cancelled: `${money(s.cancelled.amount, c)} from ${s.cancelled.orders} orders`,
    email: `/reports/${id}/email.html`,
    gross: money(s.gross.amount, c),
    net: money(s.net, c),
    ok: true as const,
    orders: s.gross.orders,
    page: `/reports/${id}/report.html`,
    pdf: `/reports/${id}/report.pdf`,
    period: data.period,
    refunds: `${money(s.refunds.amount, c)} from ${s.refunds.orders} orders`,
    reportNumber: id,
    testOrdersLeftOut: s.testOrders,
  };
}
