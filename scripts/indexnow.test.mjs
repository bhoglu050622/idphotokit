import assert from "node:assert/strict";
import { test } from "node:test";
import { HOST, KEY, indexNowPayload, urlsFromSitemap, validateKeyFile } from "./indexnow.mjs";

test("reads every sitemap location", () => {
  const urls = urlsFromSitemap(`<?xml version="1.0"?>
<urlset>
  <url><loc>https://${HOST}/</loc></url>
  <url><loc>https://${HOST}/exam/ibps-po</loc></url>
</urlset>`);
  assert.deepEqual(urls, [`https://${HOST}/`, `https://${HOST}/exam/ibps-po`]);
});

test("builds the IndexNow submission for photojhat.pages.dev", () => {
  const urls = [`https://${HOST}/`, `https://${HOST}/photo/india`];
  assert.deepEqual(indexNowPayload(urls), {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls
  });
});

test("requires the hosted key file to match exactly", () => {
  assert.doesNotThrow(() => validateKeyFile(KEY));
  assert.throws(() => validateKeyFile(`${KEY}\n`), /exactly.*no BOM or whitespace/);
  assert.throws(() => validateKeyFile(`\uFEFF${KEY}`), /exactly.*no BOM or whitespace/);
});

test("refuses a sitemap built for another host", () => {
  assert.throws(
    () => indexNowPayload(["https://example.com/photo/india"]),
    /not on photojhat\.pages\.dev/
  );
});
