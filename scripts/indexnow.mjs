/**
 * Submit the built sitemap to IndexNow.
 *
 * https://www.indexnow.org/documentation
 * The key is public by design: Bing, Yandex and Seznam fetch
 * https://photojhat.pages.dev/<key>.txt and compare it with this submission.
 * Run this only after that file is deployed, or the API rejects the key.
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

export const HOST = "photojhat.pages.dev";
export const KEY = "3bed6b749652d2f5712f87a90cc57725";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** IndexNow accepts at most 10,000 URLs in one POST. */
export const MAX_URLS = 10_000;

/**
 * IndexNow requires the UTF-8 text file to contain only the key. In particular,
 * a trailing newline or a UTF-8 BOM makes the hosted file a different value.
 */
export function validateKeyFile(contents) {
  if (contents !== KEY) {
    throw new Error(
      `public/${KEY}.txt must contain exactly the ${KEY.length}-character IndexNow key (no BOM or whitespace).`
    );
  }
}

export function urlsFromSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(match => match[1]);
}

export function indexNowPayload(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error("No sitemap URLs to submit. Run npm run build first.");
  }
  if (urls.length > MAX_URLS) {
    throw new Error(`IndexNow accepts ${MAX_URLS} URLs per request; got ${urls.length}.`);
  }
  const foreign = urls.find(url => {
    try {
      return new URL(url).host !== HOST;
    } catch {
      return true;
    }
  });
  if (foreign) throw new Error(`Sitemap URL is not on ${HOST}: ${foreign}`);
  return {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls
  };
}

export async function submitIndexNow(urls, fetchImpl = fetch) {
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowPayload(urls))
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const keyFile = await readFile(join(root, "public", `${KEY}.txt`), "utf8");
  validateKeyFile(keyFile);
  const xml = await readFile(join(root, "dist", "sitemap.xml"), "utf8");
  const urls = urlsFromSitemap(xml);
  for (let start = 0; start < urls.length; start += MAX_URLS) {
    const batch = urls.slice(start, start + MAX_URLS);
    const { status, body } = await submitIndexNow(batch);
    if (status !== 200 && status !== 202) {
      throw new Error(`IndexNow rejected ${batch.length} URL(s) with HTTP ${status}: ${body}`);
    }
    console.log(`Submitted ${batch.length} URL(s) to IndexNow (HTTP ${status}).`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
