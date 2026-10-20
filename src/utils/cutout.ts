/** Free cutouts stay at or under this long side. HD is not offered yet. */
export const FREE_LONG_SIDE = 1000;

export function limitLongSide(width: number, height: number, max = FREE_LONG_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export type SubjectBox = { x: number; y: number; width: number; height: number; pixels: number };

/** Bounding box of pixels the matte treats as the subject. */
export function subjectBox(
  alpha: Float32Array,
  width: number,
  height: number,
  threshold = 0.2
): SubjectBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let pixels = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (alpha[row + x] < threshold) continue;
      pixels++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (pixels < 16 || maxX < minX) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels };
}

/**
 * A square white listing frame. The subject is cropped with padding, then centred.
 * This is PhotoJhat's preset, not a marketplace's official pixel specification.
 */
export function marketplaceFrame(
  box: SubjectBox,
  imageWidth: number,
  imageHeight: number,
  pad = 0.12
) {
  const margin = Math.round(Math.max(box.width, box.height) * pad);
  const x = Math.max(0, box.x - margin);
  const y = Math.max(0, box.y - margin);
  const right = Math.min(imageWidth, box.x + box.width + margin);
  const bottom = Math.min(imageHeight, box.y + box.height + margin);
  const crop = { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
  const side = Math.max(crop.width, crop.height);
  return {
    crop,
    side,
    offsetX: Math.round((side - crop.width) / 2),
    offsetY: Math.round((side - crop.height) / 2)
  };
}
