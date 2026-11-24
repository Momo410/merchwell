import { get } from "@vercel/blob";

// Locally quote files are static files in public/quotes; deployed, the agent writes them to the project's Blob store.
const FILES = new Set(["card.png", "email.html", "email.txt", "quote.html", "quote.pdf"]);
const QUOTE_ID = /^[A-Za-z0-9-]{1,64}$/;

export async function GET(_request: Request, ctx: RouteContext<"/quotes/[id]/[file]">) {
  const { file, id } = await ctx.params;
  if (!process.env.BLOB_READ_WRITE_TOKEN || !QUOTE_ID.test(id) || !FILES.has(file))
    return new Response("Not found", { status: 404 });

  const result = await get(`quotes/${id}/${file}`, { access: "private", useCache: false });
  if (result?.statusCode !== 200) return new Response("Not found", { status: 404 });
  return new Response(result.stream, {
    headers: {
      "cache-control": "private, no-store",
      "content-type": result.blob.contentType,
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
