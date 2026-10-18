/**
 * Paint a photo or signature at the exam's pixel size, then binary-search JPEG
 * quality until the file sits in the published kilobyte range.
 *
 * The search itself is `searchQuality` in ./fitRange.ts, adapted from
 * jeswintesting-spec/ImEditor (MIT, copyright 2026 Jeswin Sunny).
 */

import { padJpegToMin, searchQuality } from "./fitRange";

export type FitRequest = {
  image: CanvasImageSource;
  sourceWidth: number;
  sourceHeight: number;
  /** Omitted when the notice does not state a pixel size. */
  outWidth?: number;
  outHeight?: number;
  fit: "cover" | "contain";
  zoom: number;
  panX: number;
  panY: number;
  minKB: number;
  maxKB: number;
  /**
   * Whether the notice calls the pixel size exact, preferred, a minimum, or does not state
   * pixels. Preferred/minimum/unverified signatures may grow modestly before metadata is
   * used to satisfy a minimum byte count.
   */
  dimensionMode?: "fixed" | "preferred" | "minimum" | "unverified";
};

export type FitResult = {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
  quality: number;
  fits: boolean;
  /**
   * True when a JPEG comment was inserted so a simple image could reach the minimum
   * file size. The picture is unchanged; only the file is longer.
   */
  padded: boolean;
  /** True when real pixel dimensions were increased to reach the minimum byte count. */
  grew: boolean;
  /** True when the long edge was reduced because the notice states no pixel size. */
  scaled: boolean;
};

const MAX_FREE_EDGE = 1600;

export function dimensionCandidates(
  width: number,
  height: number,
  mode: "fixed" | "preferred" | "minimum" | "unverified" = "fixed"
): Array<{ width: number; height: number }> {
  const scales = mode === "fixed" ? [1] : [1, 1.2, 1.4, 1.6, 2];
  return scales.map(scale => ({
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  }));
}

/** Keep the closest real encode below the minimum in case later growth overshoots max. */
export function choosePaddingCandidate<T extends { bytes: number }>(
  current: T | null,
  candidate: T,
  minBytes: number
): T | null {
  if (candidate.bytes >= minBytes) return current;
  return !current || candidate.bytes > current.bytes ? candidate : current;
}

function paint(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  outWidth: number,
  outHeight: number,
  fit: "cover" | "contain",
  zoom: number,
  panX: number,
  panY: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const base =
    fit === "cover"
      ? Math.max(outWidth / sourceWidth, outHeight / sourceHeight)
      : Math.min(outWidth / sourceWidth, outHeight / sourceHeight);
  const scale = base * zoom;
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  ctx.drawImage(image, (outWidth - dw) / 2 + panX, (outHeight - dh) / 2 + panY, dw, dh);
  return canvas;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error("Could not encode JPEG"))),
      "image/jpeg",
      quality
    );
  });
}

export async function fitImageToSpec(req: FitRequest): Promise<FitResult> {
  const fixed = req.outWidth !== undefined && req.outHeight !== undefined;
  let width = fixed ? req.outWidth! : req.sourceWidth;
  let height = fixed ? req.outHeight! : req.sourceHeight;
  let scaled = false;

  if (!fixed) {
    const edge = Math.max(width, height);
    if (edge > MAX_FREE_EDGE) {
      const s = MAX_FREE_EDGE / edge;
      width = Math.max(1, Math.round(width * s));
      height = Math.max(1, Math.round(height * s));
      scaled = true;
    }
  }

  const minBytes = req.minKB * 1024;
  const maxBytes = req.maxKB * 1024;
  let last: FitResult | null = null;
  let padCandidate: FitResult | null = null;
  const candidates = fixed
    ? dimensionCandidates(width, height, req.dimensionMode)
    : [{ width, height }];

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = candidates[Math.min(attempt, candidates.length - 1)];
    width = candidate.width;
    height = candidate.height;
    const growth = fixed && req.outWidth ? width / req.outWidth : 1;
    const canvas = paint(
      req.image,
      req.sourceWidth,
      req.sourceHeight,
      width,
      height,
      req.fit,
      req.zoom,
      req.panX * growth,
      req.panY * growth
    );
    const blobs = new Map<number, Blob>();
    const sizeAt = async (quality: number) => {
      const blob = await toJpeg(canvas, quality);
      blobs.set(quality, blob);
      return blob.size;
    };
    const hit = await searchQuality(sizeAt, minBytes, maxBytes);
    const blob = blobs.get(hit.quality) ?? (await toJpeg(canvas, hit.quality));
    last = {
      blob,
      width,
      height,
      bytes: blob.size,
      quality: hit.quality,
      fits: blob.size >= minBytes && blob.size <= maxBytes,
      padded: false,
      grew: fixed && (width !== req.outWidth || height !== req.outHeight),
      scaled
    };
    padCandidate = choosePaddingCandidate(padCandidate, last, minBytes);
    if (last.fits) return last;
    if (fixed) {
      if (last.bytes > maxBytes || attempt + 1 >= candidates.length) break;
      continue;
    }
    if (last.bytes <= maxBytes) break;
    width = Math.max(32, Math.round(width * 0.85));
    height = Math.max(32, Math.round(height * 0.85));
    candidates[0] = { width, height };
    scaled = true;
  }

  // Metadata is the final fallback only. It changes no pixels, but some portals may strip
  // or reject it, so the result is visibly labelled instead of presented as an ordinary fit.
  if (padCandidate) {
    const paddedBytes = padJpegToMin(
      new Uint8Array(await padCandidate.blob.arrayBuffer()),
      minBytes,
      maxBytes
    );
    if (paddedBytes && paddedBytes.length <= maxBytes) {
      const copy = new ArrayBuffer(paddedBytes.byteLength);
      new Uint8Array(copy).set(paddedBytes);
      const blob = new Blob([copy], { type: "image/jpeg" });
      return { ...padCandidate, blob, bytes: blob.size, fits: true, padded: true };
    }
  }
  return last!;
}
