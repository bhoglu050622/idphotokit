/**
 * JPEG encoding to a file-size limit.
 *
 * Upload forms reject on bytes, not on looks: a PAN card upload over 30KB or a DS-160 photo
 * over 240KB fails no matter how good it is. So for a document with a limit, the download is
 * the best quality that fits, found by bisecting the JPEG quality setting.
 */

export type Encoded = {
  blob: Blob;
  /** The JPEG quality used, 0..1. */
  quality: number;
  /** False when even the lowest quality tried is still outside the limit. */
  fits: boolean;
};

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality);
  });
}

/** Below this, JPEG artefacts on skin are visible enough to get a photo rejected anyway. */
const MIN_QUALITY = 0.3;
const MAX_QUALITY = 0.95;

export async function encodeJpegWithin(
  canvas: HTMLCanvasElement,
  limitKB: { min?: number; max: number }
): Promise<Encoded> {
  const maxBytes = limitKB.max * 1024;
  const minBytes = (limitKB.min ?? 0) * 1024;

  const best = await toJpeg(canvas, MAX_QUALITY);
  if (best.size <= maxBytes) {
    // Already under the ceiling. A floor is only a problem for tiny, flat images; the
    // highest quality is the most that can be done about it.
    if (best.size >= minBytes) return { blob: best, quality: MAX_QUALITY, fits: true };
    const top = await toJpeg(canvas, 1);
    return { blob: top, quality: 1, fits: top.size >= minBytes };
  }

  let lo = MIN_QUALITY;
  let hi = MAX_QUALITY;
  let found: Encoded | null = null;

  for (let i = 0; i < 7; i++) {
    const q = (lo + hi) / 2;
    const blob = await toJpeg(canvas, q);
    if (blob.size <= maxBytes) {
      found = { blob, quality: q, fits: blob.size >= minBytes };
      lo = q;
    } else {
      hi = q;
    }
  }

  if (found) return found;
  const floor = await toJpeg(canvas, MIN_QUALITY);
  return { blob: floor, quality: MIN_QUALITY, fits: floor.size <= maxBytes };
}

/**
 * A canvas encodes with no resolution in the file: a JPEG says "no units, 1:1" and a PNG says
 * nothing, so Windows, Photoshop and print shops read it as 72 or 96 DPI and print a 300 DPI
 * photo three times too big. This writes the DPI in: the JFIF density fields of a JPEG, a
 * pHYs chunk in a PNG. The pixels are untouched.
 */
export async function withDpi(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));

  // JPEG: SOI, then the JFIF APP0 segment — units at offset 13, X and Y density after it.
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes[3] === 0xe0 &&
      String.fromCharCode(...bytes.subarray(6, 10)) === "JFIF") {
    bytes[13] = 1; // dots per inch
    bytes[14] = d >> 8; bytes[15] = d & 0xff;
    bytes[16] = d >> 8; bytes[17] = d & 0xff;
    return new Blob([bytes], { type: blob.type });
  }

  // PNG: signature, then IHDR (always first, 25 bytes); pHYs goes straight after it.
  if (bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const ihdrEnd = 8 + 25;
    const ppm = Math.round(d / 0.0254);
    const chunk = new Uint8Array(21);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, 9);
    chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
    view.setUint32(8, ppm);
    view.setUint32(12, ppm);
    chunk[16] = 1; // metres
    view.setUint32(17, crc32(chunk.subarray(4, 17)));
    return new Blob([bytes.subarray(0, ihdrEnd), chunk, bytes.subarray(ihdrEnd)], { type: blob.type });
  }

  return blob;
}

let CRC_TABLE: Uint32Array | undefined;
function crc32(data: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of data) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
