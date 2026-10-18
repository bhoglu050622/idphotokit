import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:4174";
const artifacts = process.env.QA_ARTIFACTS || "/opt/cursor/artifacts";
const portrait = process.env.QA_PORTRAIT || "/tmp/lincoln.jpg";
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

async function makerChecks() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Force the detailed landmarker to fail. BlazeFace remains available, proving that its
  // eye keypoints now supply the head-level measurement used by framing.
  await context.route("**/*face_landmarker*", route => route.abort());
  const page = await context.newPage();
  await page.goto(`${base}/photo/india`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(portrait);
  await page.getByText(/Head is level|tilted \d+\.\d+°/i).waitFor({ timeout: 20_000 });
  await page.locator(".cropBusy").waitFor({ state: "hidden", timeout: 20_000 });
  await page.screenshot({ path: `${artifacts}/qa_after_crop_no_grey_strip.png` });

  await page.getByRole("button", { name: /Save.*next/ }).click();
  await page.getByText("Background removed").waitFor();
  await page.getByRole("button", { name: "Refresh preview" }).click();
  await page.getByText(/Rendering previews|Preparing the matting model/).waitFor({ state: "hidden", timeout: 30_000 });
  await page.screenshot({ path: `${artifacts}/qa_after_greyscale_matting.png` });

  await page.getByRole("button", { name: /Save.*next/ }).click();
  const headStraight = page.locator(".checkRow").filter({ hasText: "Head straight" });
  await headStraight.waitFor({ timeout: 20_000 });
  const poseText = await headStraight.innerText();
  assert.doesNotMatch(poseText, /Not measured|No face could be measured/);
  await headStraight.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifacts}/qa_after_pose_fallback.png` });
  await context.close();
}

async function examChecks() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${base}/exam/ibps-po`, { waitUntil: "networkidle" });
  const signature = page.locator('input[data-slot="signature"]');
  assert.equal(await signature.getAttribute("aria-label"), "Upload IBPS PO signature");

  await signature.evaluate(async input => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // A real paper scan is not mathematically flat. Add subtle scanner texture so this
    // fixture exercises dimension growth with real image data rather than metadata.
    const paper = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let seed = 17;
    for (let by = 0; by < canvas.height; by += 4) {
      for (let bx = 0; bx < canvas.width; bx += 4) {
        seed = (seed * 48271) % 0x7fffffff;
        const grain = (seed % 17) - 8;
        for (let y = by; y < Math.min(canvas.height, by + 4); y++) {
          for (let x = bx; x < Math.min(canvas.width, bx + 4); x++) {
            const i = (y * canvas.width + x) * 4;
            paper.data[i] += grain;
            paper.data[i + 1] += grain;
            paper.data[i + 2] += grain;
          }
        }
      }
    }
    ctx.putImageData(paper, 0, 0);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(35, 170);
    ctx.bezierCurveTo(170, 20, 270, 220, 410, 80);
    ctx.bezierCurveTo(480, 25, 550, 200, 665, 105);
    ctx.stroke();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "signature.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const card = page.locator("article.examCard").filter({ hasText: /^Signature/ });
  await card.getByRole("button", { name: "Make JPEG" }).click();
  const result = card.locator('[data-slot-result="signature"]');
  await result.waitFor({ timeout: 15_000 });
  assert.equal(await result.getAttribute("data-result-fits"), "yes");
  const resultText = await result.innerText();
  console.log(resultText);
  assert.doesNotMatch(resultText, /metadata fallback|JPEG comment/i);
  assert.match(resultText, /increased to \d+ × \d+ px/);
  assert.ok(
    Number(await result.getAttribute("data-result-width")) <= 224,
    "preferred 140 px signature should not need more than modest dimension growth"
  );
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifacts}/qa_after_signature_real_pixels.png` });

  // A mathematically flat digital signature may be impossible to bring above 10 KB with
  // honest pixels. Verify that the final metadata fallback is explicit and cautionary.
  await signature.evaluate(async input => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(35, 170);
    ctx.bezierCurveTo(170, 20, 270, 220, 665, 105);
    ctx.stroke();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "flat-signature.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await card.getByRole("button", { name: "Make JPEG" }).click();
  await result.waitFor({ timeout: 15_000 });
  const fallbackText = await result.innerText();
  assert.match(fallbackText, /metadata fallback/i);
  assert.match(fallbackText, /portals strip or reject metadata/i);
  await page.screenshot({ path: `${artifacts}/qa_after_signature_fallback_warning.png` });
  await page.close();
}

async function seoChecks() {
  const page = await browser.newPage();
  const sitemap = await (await page.request.get(`${base}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>/g)].length;
  assert.ok(urls < 100, `sitemap should be India-focused; found ${urls}`);
  await page.goto(`${base}/photo/united-states`, { waitUntil: "domcontentloaded" });
  assert.equal(
    await page.locator('meta[name="robots"]').getAttribute("content"),
    "noindex,follow"
  );
  await page.close();
}

await makerChecks();
await examChecks();
await seoChecks();
await browser.close();
console.log("browser QA passed");
