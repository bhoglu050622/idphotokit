/**
 * General background removal with BiRefNet lite, 512×512, fp16 ONNX.
 *
 * Weights are not in this repository. Cloudflare Pages rejects a single asset
 * over 25 MiB, and this file is 98,484,532 bytes. The browser downloads it from
 * the same Studio Ludens repo the file was taken from:
 * https://huggingface.co/studioludens/birefnet-lite-512 (onnx/model_fp16.onnx).
 * Source model: ZhengPeng7/BiRefNet_lite.
 * License: MIT — copyright 2024 ZhengPeng and 2026 Studio Ludens V.O.F.
 * The licence text shipped with the site is public/models/birefnet-lite-512-fp16.LICENSE.txt.
 * Commercial use is allowed.
 *
 * MODNet is not used as a lighter portrait path because this general-subject
 * model is selected for the tool. The existing portrait weights in
 * public/models/modnet.onnx are Apache-2.0: the MODNet authors relicensed
 * their code, models, and demos on 28 January 2022:
 * https://github.com/ZHKKKe/MODNet/blob/master/README.md#license
 * The fp16 ONNX conversion is also published as https://huggingface.co/Xenova/modnet.
 *
 * The download runs only when this tool starts, then stays in the Cache API and
 * in memory for the page session. The photo is never uploaded.
 */

import type * as Ort from "onnxruntime-web";

/** Hugging Face resolve URL. One place so the tool, tests, and comments stay aligned. */
export const MODEL_URL =
  "https://huggingface.co/studioludens/birefnet-lite-512/resolve/main/onnx/model_fp16.onnx";
export const MODEL_BYTES = 98_484_532;
/** Shown before a download starts. 98,484,532 bytes is 93.9 MiB. */
export const MODEL_SIZE_LABEL = "94 MB";

const SIZE = 512;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const CACHE = "photojhat-birefnet-v1";

let ortPromise: Promise<typeof Ort> | null = null;
let sessionPromise: Promise<Ort.InferenceSession> | null = null;

function loadOrt(): Promise<typeof Ort> {
  ortPromise ??= import("onnxruntime-web").then(ort => {
    ort.env.wasm.numThreads = 1;
    return ort;
  });
  return ortPromise;
}

const DOWNLOAD_ERROR =
  "The background model could not be downloaded. Check your connection and try again. Your photo was not uploaded.";

async function modelBytes(onProgress: (fraction: number) => void): Promise<ArrayBuffer> {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(MODEL_URL);
  if (cached) {
    onProgress(1);
    return cached.arrayBuffer();
  }
  let response: Response;
  try {
    response = await fetch(MODEL_URL);
  } catch {
    throw new Error(DOWNLOAD_ERROR);
  }
  if (!response.ok || !response.body) {
    const status = response.status ? ` (HTTP ${response.status})` : "";
    throw new Error(
      `The background model could not be downloaded${status}. Try again in a moment. Your photo was not uploaded.`
    );
  }
  const total = Number(response.headers.get("content-length") || MODEL_BYTES);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(Math.min(1, received / total));
  }
  const copy = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    copy.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    await cache.put(
      MODEL_URL,
      new Response(copy.slice(), { headers: { "Content-Type": "application/octet-stream" } })
    );
  } catch {
    // A full browser cache must not block the cutout. The bytes are already in memory.
  }
  return copy.buffer;
}

export function loadBirefnet(onProgress: (fraction: number) => void): Promise<Ort.InferenceSession> {
  sessionPromise ??= (async () => {
    try {
      const [ort, bytes] = await Promise.all([loadOrt(), modelBytes(onProgress)]);
      return await ort.InferenceSession.create(bytes, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all"
      });
    } catch (error) {
      sessionPromise = null;
      if (error instanceof Error && error.message.startsWith("The background model")) throw error;
      throw new Error(
        error instanceof Error && /memory|alloc/i.test(error.message)
          ? "This phone does not have enough memory to run the model. Try a desktop browser or a smaller photo."
          : "The background model could not start on this device."
      );
    }
  })();
  return sessionPromise;
}

function inputTensor(image: CanvasImageSource, width: number, height: number, ort: typeof Ort) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(image, 0, 0, width, height, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const input = new Float32Array(3 * SIZE * SIZE);
  const plane = SIZE * SIZE;
  for (let i = 0; i < plane; i++) {
    const offset = i * 4;
    input[i] = (data[offset] / 255 - MEAN[0]) / STD[0];
    input[plane + i] = (data[offset + 1] / 255 - MEAN[1]) / STD[1];
    input[2 * plane + i] = (data[offset + 2] / 255 - MEAN[2]) / STD[2];
  }
  return new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]);
}

/** Soft person-or-object alpha at the working image size. */
export async function birefnetAlpha(
  image: CanvasImageSource,
  width: number,
  height: number,
  onProgress: (fraction: number) => void
): Promise<Float32Array> {
  onProgress(0);
  const session = await loadBirefnet(fraction => onProgress(fraction * 0.85));
  const ort = await loadOrt();
  onProgress(0.9);
  const inputName = session.inputNames[0] ?? "input_image";
  const outputName = session.outputNames[0] ?? "output_image";
  const result = await session.run({ [inputName]: inputTensor(image, width, height, ort) });
  const output = result[outputName];
  const values = output.data as Float32Array;
  const alpha = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(SIZE - 1, Math.floor(((y + 0.5) / height) * SIZE));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(SIZE - 1, Math.floor(((x + 0.5) / width) * SIZE));
      const value = values[sourceY * SIZE + sourceX];
      alpha[y * width + x] = value < 0 ? 0 : value > 1 ? 1 : value;
    }
  }
  onProgress(1);
  return alpha;
}
