import assert from "node:assert/strict";
import { test } from "node:test";
import { limitLongSide, marketplaceFrame, subjectBox } from "./cutout.ts";

test("free output never exceeds 1000 pixels on the long side", () => {
  assert.deepEqual(limitLongSide(2000, 1000), { width: 1000, height: 500 });
  assert.deepEqual(limitLongSide(400, 800), { width: 400, height: 800 });
});

test("marketplace frame is square and keeps padding around the subject", () => {
  const alpha = new Float32Array(100 * 80);
  for (let y = 20; y < 60; y++) {
    for (let x = 30; x < 70; x++) alpha[y * 100 + x] = 1;
  }
  const box = subjectBox(alpha, 100, 80);
  assert.ok(box);
  const frame = marketplaceFrame(box, 100, 80, 0.1);
  assert.equal(frame.side, Math.max(frame.crop.width, frame.crop.height));
  assert.ok(frame.offsetX >= 0 && frame.offsetY >= 0);
  assert.ok(frame.crop.x < box.x && frame.crop.y < box.y);
});
