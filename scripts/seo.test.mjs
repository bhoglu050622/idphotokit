import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { KEY } from "./indexnow.mjs";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const dist = new URL("../dist/", import.meta.url);

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await htmlFiles(path));
    else if (entry.name.endsWith(".html")) found.push(path);
  }
  return found;
}

function expectedCanonical(file) {
  let rel = relative(distDir, file).split(sep).join("/");
  if (rel.endsWith("/index.html")) rel = rel.slice(0, -"/index.html".length);
  else if (rel.endsWith(".html")) rel = rel.slice(0, -".html".length);
  if (rel === "" || rel === "index") return "https://photojhat.pages.dev/";
  return `https://photojhat.pages.dev/${rel}`;
}

test("sitemap contains only India and exam routes", async () => {
  const xml = await readFile(new URL("sitemap.xml", dist), "utf8");
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  const tools = new Set([
    "/background-remover",
    "/remove-bg-alternative",
    "/remove-bg-alternative-free-india",
    "/white-background-for-meesho-amazon"
  ]);
  const unexpected = urls.filter(
    path =>
      path !== "/" &&
      path !== "/exam" &&
      !path.startsWith("/exam/") &&
      path !== "/photo/india" &&
      !path.startsWith("/photo/india/") &&
      !tools.has(path)
  );
  assert.deepEqual(unexpected, []);
  assert.ok(urls.length < 100, `expected an India-focused sitemap, found ${urls.length} URLs`);
  assert.ok(!urls.includes("/photo"), "international photo hub must not be in the sitemap");
  for (const path of ["/exam/ssc-cgl", "/exam/ibps-po", "/exam/neet-ug", "/photo/india", ...tools]) {
    assert.ok(urls.includes(path), `expected ${path} in the sitemap`);
  }
});

test("international document pages are noindex, follow", async () => {
  const india = await readFile(new URL("photo/india/index.html", dist), "utf8");
  for (const path of [
    "photo/united-states/index.html",
    "photo/france/visa/index.html",
    "photo/any-country/30x40-mm-3x4-cm/index.html"
  ]) {
    const international = await readFile(new URL(path, dist), "utf8");
    assert.match(international, /<meta name="robots" content="noindex,follow"\s*\/?>/);
  }
  assert.doesNotMatch(india, /name="robots" content="noindex/);
});

test("every built page canonicalises to photojhat.pages.dev", async () => {
  const files = await htmlFiles(distDir);
  assert.ok(files.length > 100, `expected the prerendered site, found ${files.length} HTML files`);
  const mismatches = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(match => match[1]);
    const expected = expectedCanonical(file);
    if (canonicals.length !== 1 || canonicals[0] !== expected) {
      mismatches.push(`${relative(distDir, file)} -> ${canonicals.join(", ") || "(none)"} (expected ${expected})`);
    }
  }
  assert.deepEqual(mismatches, []);
});

test("every page includes the Google Search Console verification tag", async () => {
  const tag = '<meta name="google-site-verification" content="z3hBGl84V4QqHhHPBOTUqXKXdDXpmDZOYv7bxKhwobk" />';
  const files = await htmlFiles(distDir);
  const missing = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    if (!html.includes(tag)) missing.push(relative(distDir, file));
  }
  assert.deepEqual(missing, []);
});

test("robots.txt points at the PhotoJhat sitemap and the IndexNow key is at the site root", async () => {
  const robots = await readFile(new URL("robots.txt", dist), "utf8");
  assert.match(robots, /^Sitemap: https:\/\/photojhat\.pages\.dev\/sitemap\.xml\s*$/m);
  const key = await readFile(new URL(`${KEY}.txt`, dist), "utf8");
  assert.equal(key.trim(), KEY);
});
