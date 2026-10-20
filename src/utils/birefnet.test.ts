import assert from "node:assert/strict";
import test from "node:test";
import { MODEL_BYTES, MODEL_SIZE_LABEL, MODEL_URL } from "./birefnet.ts";

test("BiRefNet weights stay on the Hugging Face CDN", () => {
  assert.equal(
    MODEL_URL,
    "https://huggingface.co/studioludens/birefnet-lite-512/resolve/main/onnx/model_fp16.onnx"
  );
  assert.equal(MODEL_BYTES, 98_484_532);
  assert.equal(MODEL_SIZE_LABEL, "94 MB");
  assert.equal(MODEL_URL.startsWith("https://huggingface.co/"), true);
});
