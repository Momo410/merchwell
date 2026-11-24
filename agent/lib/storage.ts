import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { get, put } from "@vercel/blob";

// Deployments have a read-only disk, so a connected Blob store holds the files; without one they stay on disk.
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Keys: "quotes/…" and "reports/…" are served at the same path; "data/…" are private records.
function diskPath(key: string) {
  return key.startsWith("data/")
    ? join(process.cwd(), ".data", key.slice("data/".length))
    : join(process.cwd(), "public", key);
}

export async function saveFile(key: string, body: string | Uint8Array, contentType: string) {
  if (useBlob()) {
    await put(key, Buffer.from(body), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return;
  }
  const path = diskPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

export async function readStoredFile(key: string) {
  if (useBlob()) {
    const result = await get(key, { access: "private", useCache: false });
    if (result?.statusCode !== 200) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  return readFile(diskPath(key)).catch(() => null);
}

export async function readJson<T>(key: string): Promise<T | null> {
  const file = await readStoredFile(key);
  return file ? (JSON.parse(file.toString("utf8")) as T) : null;
}

export const saveJson = (key: string, value: unknown) =>
  saveFile(key, JSON.stringify(value), "application/json");
