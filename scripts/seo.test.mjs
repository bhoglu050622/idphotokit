import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const dist = new URL("../dist/", import.meta.url);

test("sitemap contains only India and exam routes", async () => {
  const xml = await readFile(new URL("sitemap.xml", dist), "utf8");
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  const unexpected = urls.filter(
    path =>
      path !== "/" &&
      path !== "/exam" &&
      !path.startsWith("/exam/") &&
      path !== "/photo/india" &&
      !path.startsWith("/photo/india/")
  );
  assert.deepEqual(unexpected, []);
  assert.ok(urls.length < 100, `expected an India-focused sitemap, found ${urls.length} URLs`);
  assert.ok(!urls.includes("/photo"), "international photo hub must not be in the sitemap");
  for (const path of ["/exam/ssc-cgl", "/exam/ibps-po", "/exam/neet-ug", "/photo/india"]) {
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
