/**
 * JPEG quality search that lands inside a minimum–maximum file size.
 *
 * The bisection is adapted from `compressToTargetSize` in
 * https://github.com/jeswintesting-spec/ImEditor (MIT).
 *
 * Copyright (c) 2026 Jeswin Sunny
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * ImEditor bisects quality toward one target byte count, keeping the closest
 * encode. PhotoJhat bisects the same way — too big lowers quality, small enough
 * tries a higher quality — and keeps the highest quality whose size falls
 * inside [minBytes, maxBytes].
 */

export type QualityHit = {
  quality: number;
  bytes: number;
  /** True when `bytes` is inside the requested range. */
  fits: boolean;
};

/**
 * Ten steps, the same count ImEditor uses: each step halves the quality
 * interval, which is enough to settle JPEG's coarse quality steps.
 */
export const QUALITY_STEPS = 10;

/**
 * Insert JPEG comment segments after the start-of-image marker until the file is at least
 * `minBytes`. Decoders ignore the comment, so the picture does not change. Returns null when
 * the pad would pass `maxBytes`.
 */
export function padJpegToMin(bytes: Uint8Array, minBytes: number, maxBytes: number): Uint8Array | null {
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  if (bytes.length >= minBytes) return bytes;
  const segments: Uint8Array[] = [];
  let deficit = minBytes - bytes.length;
  while (deficit > 0) {
    const room = Math.min(deficit, 4 + 65533);
    const payload = Math.max(0, room - 4);
    const seg = new Uint8Array(4 + payload);
    seg[0] = 0xff;
    seg[1] = 0xfe;
    const len = payload + 2;
    seg[2] = len >> 8;
    seg[3] = len & 0xff;
    segments.push(seg);
    deficit -= seg.length;
  }
  const extra = segments.reduce((n, s) => n + s.length, 0);
  if (bytes.length + extra > maxBytes) return null;
  const out = new Uint8Array(bytes.length + extra);
  out.set(bytes.subarray(0, 2), 0);
  let offset = 2;
  for (const seg of segments) {
    out.set(seg, offset);
    offset += seg.length;
  }
  out.set(bytes.subarray(2), offset);
  return out;
}

export async function searchQuality(
  sizeAt: (quality: number) => Promise<number> | number,
  minBytes: number,
  maxBytes: number,
  steps = QUALITY_STEPS
): Promise<QualityHit> {
  let lo = 0;
  let hi = 1;
  let best: QualityHit | null = null;
  let smallest: QualityHit | null = null;

  for (let i = 0; i < steps; i++) {
    const quality = (lo + hi) / 2;
    const bytes = await sizeAt(quality);
    if (!smallest || bytes < smallest.bytes) smallest = { quality, bytes, fits: false };
    if (bytes > maxBytes) {
      hi = quality;
    } else {
      if (bytes >= minBytes) best = { quality, bytes, fits: true };
      lo = quality;
    }
  }

  if (best) return best;

  const top = await sizeAt(1);
  if (top < minBytes) return { quality: 1, bytes: top, fits: false };

  const low = smallest ?? { quality: lo, bytes: await sizeAt(lo), fits: false };
  return { ...low, fits: low.bytes >= minBytes && low.bytes <= maxBytes };
}
