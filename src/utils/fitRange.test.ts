import assert from "node:assert/strict";
import { test } from "node:test";
import { padJpegToMin, searchQuality } from "./fitRange.ts";

test("highest quality inside a linear size curve lands in range", async () => {
  // 0 quality → 0 bytes, quality 1 → 80_000 bytes. 20–50 KB is quality ~0.256–0.64.
  const sizeAt = (q: number) => Math.round(q * 80_000);
  const hit = await searchQuality(sizeAt, 20 * 1024, 50 * 1024);
  assert.equal(hit.fits, true);
  assert.ok(hit.bytes >= 20 * 1024 && hit.bytes <= 50 * 1024);
  // The next step up would leave the range, so this is the high end of it.
  assert.ok(hit.quality > 0.55);
  assert.ok(sizeAt(Math.min(1, hit.quality + 0.05)) > 50 * 1024 || hit.quality > 0.6);
});

test("a file that is already under the ceiling at high quality stays there", async () => {
  const hit = await searchQuality(() => 30_000, 20 * 1024, 50 * 1024);
  assert.equal(hit.fits, true);
  assert.ok(hit.quality > 0.9);
  assert.equal(hit.bytes, 30_000);
});

test("reports a miss when even the smallest encode is over the maximum", async () => {
  const hit = await searchQuality(() => 80_000, 10 * 1024, 20 * 1024);
  assert.equal(hit.fits, false);
  assert.ok(hit.bytes > 20 * 1024);
});

test("pads a tiny JPEG up to the minimum without passing the maximum", () => {
  const tiny = new Uint8Array(200);
  tiny[0] = 0xff;
  tiny[1] = 0xd8;
  tiny[2] = 0xff;
  tiny[3] = 0xd9;
  const padded = padJpegToMin(tiny, 1200, 2000);
  assert.ok(padded);
  assert.ok(padded.length >= 1200 && padded.length <= 2000);
  assert.equal(padded[0], 0xff);
  assert.equal(padded[1], 0xd8);
  assert.equal(padded[2], 0xff);
  assert.equal(padded[3], 0xfe);
  assert.equal(padJpegToMin(tiny, 5000, 1000), null);
});

test("reports a miss when even quality 1 is under the minimum", async () => {
  const hit = await searchQuality((q) => Math.round(q * 1000), 10 * 1024, 20 * 1024);
  assert.equal(hit.fits, false);
  assert.equal(hit.quality, 1);
  assert.ok(hit.bytes < 10 * 1024);
});
