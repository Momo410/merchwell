// Server-only lead alerts to the merchant's Telegram, posted through Chat SDK's Telegram adapter.
import { randomBytes } from "node:crypto";

import { createMemoryState } from "@chat-adapter/state-memory";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { Actions, Card, CardText, Chat, LinkButton } from "chat";

export interface LeadAlert {
  code?: string;
  discounted?: string;
  email: string;
  name: string;
  order: string;
  phone?: string;
  quoteUrl?: string;
  total: string;
}

let bot: Promise<Chat> | undefined;

// Send-only: no webhook route is mounted and the secret is random, so the bot never takes incoming messages.
function getBot() {
  bot ??= createBot().catch((error: unknown) => {
    bot = undefined;
    throw error;
  });
  return bot;
}

async function createBot() {
  const chat = new Chat({
    adapters: {
      telegram: createTelegramAdapter({
        mode: "webhook",
        secretToken: randomBytes(24).toString("hex"),
      }),
    },
    state: createMemoryState(),
    userName: "Merchwell",
  });
  await chat.initialize();
  return chat;
}

// Shopper-typed text must not add bold, links or code spans to the owner's alert.
const plain = (text: string) => text.replace(/[*_`~[\]()<>|#]/g, "");

// Inline code is tap-to-copy in Telegram, so contact details stay one tap away.
export function formatLeadAlert(lead: LeadAlert, test = false) {
  const price = lead.discounted
    ? `~~${lead.total}~~ → **${lead.discounted}**`
    : `**${lead.total}**`;
  const lines = [
    `👤 **${plain(lead.name)}**`,
    `✉️ \`${lead.email}\``,
    ...(lead.phone ? [`📞 \`${lead.phone}\``] : []),
    "",
    `📦 ${plain(lead.order)}`,
    `💰 ${price}`,
    ...(lead.code ? [`🏷 ${lead.code}`] : []),
  ];
  const links = [
    ...(lead.phone
      ? [LinkButton({ label: "WhatsApp", url: `https://wa.me/${lead.phone.replace(/\D/g, "")}` })]
      : []),
    ...(lead.quoteUrl ? [LinkButton({ label: "View quote", url: lead.quoteUrl })] : []),
  ];
  return Card({
    children: [CardText(lines.join("\n")), ...(links.length ? [Actions(links)] : [])],
    title: `🟢 New lead${test ? " · TEST" : ""}`,
  });
}

export async function sendLeadAlert(lead: LeadAlert, test = false) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId)
    return { ok: false, reason: "Telegram is not configured." };
  try {
    await (await getBot()).thread(`telegram:${chatId}`).post(formatLeadAlert(lead, test));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
