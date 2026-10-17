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
  /** True when the long edge was reduced because the notice states no pixel size. */
  scaled: boolean;
};

const MAX_FREE_EDGE = 1600;

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

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = paint(
      req.image,
      req.sourceWidth,
      req.sourceHeight,
      width,
      height,
      req.fit,
      req.zoom,
      req.panX,
      req.panY
    );
    const blobs = new Map<number, Blob>();
    const sizeAt = async (quality: number) => {
      const blob = await toJpeg(canvas, quality);
      blobs.set(quality, blob);
      return blob.size;
    };
    const hit = await searchQuality(sizeAt, minBytes, maxBytes);
    let blob = blobs.get(hit.quality) ?? (await toJpeg(canvas, hit.quality));
    let padded = false;
    if (blob.size < minBytes) {
      const paddedBytes = padJpegToMin(new Uint8Array(await blob.arrayBuffer()), minBytes, maxBytes);
      if (paddedBytes && paddedBytes.length <= maxBytes) {
        const copy = new ArrayBuffer(paddedBytes.byteLength);
        new Uint8Array(copy).set(paddedBytes);
        blob = new Blob([copy], { type: "image/jpeg" });
        padded = true;
      }
    }
    last = {
      blob,
      width,
      height,
      bytes: blob.size,
      quality: hit.quality,
      fits: blob.size >= minBytes && blob.size <= maxBytes,
      padded,
      scaled
    };
    if (last.fits) return last;
    if (fixed || last.bytes <= maxBytes) return last;
    width = Math.max(32, Math.round(width * 0.85));
    height = Math.max(32, Math.round(height * 0.85));
    scaled = true;
  }

  return last!;
}
