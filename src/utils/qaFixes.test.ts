import assert from "node:assert/strict";
import { test } from "node:test";
import * as fit from "./fitJpeg.ts";
import * as matting from "./matting.ts";
import * as pose from "./pose.ts";

test("repairs a transparent island enclosed by confident subject alpha", () => {
  const repair = (matting as Record<string, unknown>).repairSubjectAlpha;
  assert.equal(typeof repair, "function", "repairSubjectAlpha must be exported");

  const alpha = new Float32Array(9 * 9);
  for (let y = 1; y < 8; y++) {
    for (let x = 1; x < 8; x++) alpha[y * 9 + x] = 0.98;
  }
  alpha[4 * 9 + 4] = 0.02;
  (repair as (a: Float32Array, w: number, h: number) => Float32Array)(alpha, 9, 9);

  assert.ok(alpha[4 * 9 + 4] > 0.9, "the enclosed hole should become foreground");
  assert.equal(alpha[0], 0, "open background must remain background");
});

test("does not fill a long narrow gap between hair strands", () => {
  const alpha = new Float32Array(11 * 11);
  for (let y = 1; y < 10; y++) {
    for (let x = 1; x < 10; x++) alpha[y * 11 + x] = 0.98;
  }
  for (let y = 3; y < 9; y++) alpha[y * 11 + 5] = 0.01;
  matting.repairSubjectAlpha(alpha, 11, 11);
  assert.ok(alpha[5 * 11 + 5] < 0.02);
});

test("reports enclosed transparent subject holes as cutout damage", () => {
  const inspect = (matting as Record<string, unknown>).inspectMatteIntegrity;
  assert.equal(typeof inspect, "function", "inspectMatteIntegrity must be exported");

  const alpha = new Float32Array(20 * 20);
  for (let y = 2; y < 19; y++) {
    for (let x = 3; x < 17; x++) alpha[y * 20 + x] = 0.98;
  }
  for (let y = 8; y < 12; y++) {
    for (let x = 8; x < 12; x++) alpha[y * 20 + x] = 0.01;
  }
  const result = (inspect as (a: Float32Array, w: number, h: number) => { damaged: boolean })(
    alpha,
    20,
    20
  );
  assert.equal(result.damaged, true);
});

test("detector eye keypoints can provide a roll-only pose fallback", () => {
  const fallback = (pose as Record<string, unknown>).poseFromDetectorEyes;
  assert.equal(typeof fallback, "function", "poseFromDetectorEyes must be exported");
  const measured = (
    fallback as (face: {
      leftEye: { x: number; y: number };
      rightEye: { x: number; y: number };
    }, width?: number, height?: number, scale?: number, faces?: number) => {
      roll: number;
      detail: string;
      faces: number;
    } | null
  )(
    {
      leftEye: { x: 0.7, y: 0.45 },
      rightEye: { x: 0.3, y: 0.4 }
    },
    1,
    1,
    1,
    2
  );
  assert.ok(measured);
  assert.equal(measured.detail, "eyes");
  assert.equal(measured.faces, 2);
  assert.ok(Math.abs(measured.roll) > 5 && Math.abs(measured.roll) < 10);
});

test("signature output tries modest real-pixel growth before metadata padding", () => {
  const candidates = (fit as Record<string, unknown>).dimensionCandidates;
  assert.equal(typeof candidates, "function", "dimensionCandidates must be exported");
  const sizes = (
    candidates as (
      w: number,
      h: number,
      mode: "fixed" | "preferred" | "minimum" | "unverified"
    ) => Array<{ width: number; height: number }>
  )(140, 60, "preferred");
  assert.deepEqual(sizes.slice(0, 3), [
    { width: 140, height: 60 },
    { width: 168, height: 72 },
    { width: 196, height: 84 }
  ]);
});

test("keeps the largest under-minimum result available for final padding", () => {
  const choose = (fit as Record<string, unknown>).choosePaddingCandidate;
  assert.equal(typeof choose, "function", "choosePaddingCandidate must be exported");
  const small = { bytes: 7_000 };
  const closer = { bytes: 9_000 };
  const oversized = { bytes: 21_000 };
  assert.equal(
    (choose as (a: typeof small | null, b: typeof small, min: number) => typeof small)(
      small,
      closer,
      10_000
    ),
    closer
  );
  assert.equal(
    (choose as (a: typeof small | null, b: typeof small, min: number) => typeof small)(
      closer,
      oversized,
      10_000
    ),
    closer
  );
});
