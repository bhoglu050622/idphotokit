import { useEffect, useMemo, useRef, useState } from "react";
import type { PaperId, Unit } from "../../types";
import { useAppStore } from "../../state/store";
import { useFeedback } from "../../state/feedback";
import { sizeToPx } from "../../utils/units";
import { getCroppedCanvas } from "../../utils/cropper";
import { applyAdjustmentsToImageData } from "../../utils/image";
import { personMatte } from "../../utils/personMatte";
import { compositeWithMask } from "../../utils/background";
import { planSheet, renderSheet } from "../../utils/sheet";
import ComplianceReport from "../ui/ComplianceReport";
import MeasuredPreview from "../ui/MeasuredPreview";
import LikeCard from "../ui/LikeCard";
import { useComplianceReport } from "../../state/useComplianceReport";
import { encodeJpegWithin, formatBytes, withDpi } from "../../utils/encode";
import { documentLabel, documentsFor, formatFileKB, formatSize, presetTitle, slugsFor, type Preset } from "../../utils/presets";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** "IMG_2041.HEIC" → "IMG_2041", without characters a file system refuses. */
function baseName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]*$/, "");
  // eslint-disable-next-line no-control-regex
  const safe = stem.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").trim();
  return safe || "photo";
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: "image/png" | "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), format, quality);
  });
}

const PAPER_LABELS: Record<string, string> = {
  A4: "A4",
  A3: "A3",
  P4x6: "4 × 6 inch",
  CUSTOM: "Custom"
};

export default function StepDownload() {
  const setStep = useAppStore(s => s.setStep);
  const imageBitmap = useAppStore(s => s.imageBitmap);
  const photo = useAppStore(s => s.photo);
  const crop = useAppStore(s => s.crop);
  const croppedAreaPixels = useAppStore(s => s.croppedAreaPixels);
  const adj = useAppStore(s => s.adj);
  const bg = useAppStore(s => s.bg);
  const sheet = useAppStore(s => s.sheet);
  const setSheet = useAppStore(s => s.setSheet);
  const showFeedback = useFeedback(s => s.show);

  const [busy, setBusy] = useState<string | null>(null);
  const [showMarks, setShowMarks] = useState(true);
  /**
   * The single-photo files, encoded along with the preview so their sizes show before the
   * download — and the download is these exact bytes, not a fresh encode that could differ.
   * Null while a render is under way.
   */
  const [files, setFiles] = useState<{ jpeg: Blob; png?: Blob; fits: boolean } | null>(null);
  const renderRun = useRef(0);

  const { report, preset, measuring } = useComplianceReport();
  const fileKB = preset?.fileKB;
  const filePrefix = preset ? slugsFor(preset).join("_") : "photo";
  const imageFile = useAppStore(s => s.imageFile);
  const keepFileName = useAppStore(s => s.keepFileName);
  /** The chosen photo's own name, when downloads should keep it; the extension follows the format. */
  const ownName = keepFileName && imageFile ? baseName(imageFile.name) : undefined;

  const setPhoto = useAppStore(s => s.setPhoto);
  const syncToUrl = useAppStore(s => s.syncToUrl);
  /**
   * The printed version of an upload-only document, offered from it: the same document first
   * ("Passport · printed" from "Passport · online"), else others in its category.
   */
  const printable = useMemo(() => {
    if (!preset?.digitalOnly) return [];
    const prints = documentsFor(preset.country).filter(p => !p.digitalOnly);
    const same = prints.filter(p => p.doc === preset.doc);
    return (same.length ? same : prints.filter(p => p.category === preset.category)).slice(0, 4);
  }, [preset]);
  /** A different size needs a new crop, so switching goes back to step 2, which re-frames. */
  const switchTo = (p: Preset) => {
    setPhoto({ presetId: p.id });
    syncToUrl();
    setStep(2);
  };

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const sheetRef = useRef<HTMLCanvasElement | null>(null);

  const outPx = useMemo(() => sizeToPx(photo.width, photo.height, photo.unit, photo.dpi), [photo]);

  /** How many photos will fit — known without rendering anything. */
  const layout = useMemo(
    () => planSheet(sheet, photo.dpi, outPx.w, outPx.h),
    [sheet, photo.dpi, outPx.w, outPx.h]
  );

  /** Must match the key used on the background step so the matte is computed once. */
  const matteKey = useMemo(
    () =>
      JSON.stringify([
        croppedAreaPixels,
        crop.rotation,
        outPx.w,
        outPx.h,
        adj.brightness,
        adj.contrast,
        adj.saturation
      ]),
    [croppedAreaPixels, crop.rotation, outPx.w, outPx.h, adj]
  );

  const buildFinalTile = async (): Promise<HTMLCanvasElement> => {
    if (!imageBitmap || !croppedAreaPixels) throw new Error("Missing image/crop");

    // 1) Crop & rotate to target size
    const cropped = await getCroppedCanvas(
      imageBitmap,
      croppedAreaPixels,
      crop.rotation,
      outPx.w,
      outPx.h
    );

    // 2) Apply adjustments
    const ctx = cropped.getContext("2d", { willReadFrequently: true })!;
    const img = ctx.getImageData(0, 0, cropped.width, cropped.height);
    applyAdjustmentsToImageData(img, adj);
    ctx.putImageData(img, 0, 0);

    // 3) Background removal (optional)
    if (bg.mode !== "REMOVED") return cropped;

    const { mask } = await personMatte(cropped, matteKey);
    return compositeWithMask(
      cropped,
      mask.data,
      mask.width,
      mask.height,
      bg.color,
      bg.featherPx,
      bg.edgeTighten
    );
  };

  const drawInto = (target: HTMLCanvasElement | null, source: HTMLCanvasElement) => {
    if (!target) return;
    target.width = source.width;
    target.height = source.height;
    const ctx = target.getContext("2d")!;
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(source, 0, 0);
  };

  /**
   * A size-limited document gets the best JPEG quality that fits. Anything else gets full
   * quality: an ID photo is small, and every compression artefact on a face is a reason to
   * reject it. Both carry the DPI, so they print at the size they were made for.
   */
  const encodeSingle = async (tile: HTMLCanvasElement) => {
    if (fileKB) {
      const result = await encodeJpegWithin(tile, fileKB);
      return { jpeg: await withDpi(result.blob, photo.dpi), fits: result.fits };
    }
    const [jpeg, png] = await Promise.all([
      canvasToBlob(tile, "image/jpeg", 1),
      canvasToBlob(tile, "image/png")
    ]);
    return { jpeg: await withDpi(jpeg, photo.dpi), png: await withDpi(png, photo.dpi), fits: true };
  };

  /** Renders both previews from one matte, so opening either section costs nothing extra. */
  const renderPreviews = async () => {
    const run = ++renderRun.current;
    setFiles(null);
    setBusy("Rendering preview…");
    let tile: HTMLCanvasElement;
    try {
      tile = await buildFinalTile();
      drawInto(previewRef.current, tile);
      if (sheetRef.current) {
        const { sheetCanvas } = renderSheet(tile, sheet, photo.dpi);
        drawInto(sheetRef.current, sheetCanvas);
      }
    } finally {
      setBusy(null);
    }
    const encoded = await encodeSingle(tile);
    if (run === renderRun.current) setFiles(encoded);
  };

  const downloadSingle = async (fmt: "png" | "jpeg") => {
    setBusy("Building photo…");
    try {
      const ready = files ?? (await encodeSingle(await buildFinalTile()));
      const blob = fmt === "png" ? ready.png : ready.jpeg;
      if (!blob) return;
      const name = `${filePrefix}_${outPx.w}x${outPx.h}`;
      const ext = fmt === "jpeg" ? "jpg" : "png";
      downloadBlob(
        blob,
        ownName
          ? `${ownName}.${ext}`
          : fileKB || photo.unit === "px" ? `${name}.${ext}` : `${name}_${photo.dpi}dpi.${ext}`
      );
    } finally {
      setBusy(null);
    }
  };

  const downloadSheet = async (fmt: "png" | "jpeg") => {
    setBusy("Building print sheet…");
    try {
      const tile = await buildFinalTile();
      const { sheetCanvas } = renderSheet(tile, sheet, photo.dpi);
      const mime = fmt === "png" ? "image/png" : "image/jpeg";
      const blob = await withDpi(await canvasToBlob(sheetCanvas, mime, 0.92), photo.dpi);
      downloadBlob(
        blob,
        // "_sheet" so it doesn't land on top of the single photo saved under the same name.
        ownName
          ? `${ownName}_sheet.${fmt === "jpeg" ? "jpg" : "png"}`
          : `sheet_${sheet.paper}_${layout.count}up_${photo.dpi}dpi.${fmt}`
      );
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (imageBitmap && croppedAreaPixels) void renderPreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBitmap, croppedAreaPixels, bg, adj, crop, sheet, photo.dpi, photo.presetId]);

  if (!imageBitmap) {
    return <div className="small">Upload an image in Step 1 first.</div>;
  }

  const paperName = PAPER_LABELS[sheet.paper] ?? sheet.paper;

  return (
    <div className="row">
      <div className="col grow">
        <ComplianceReport report={report} preset={preset} measuring={measuring} />

        <details className="panel" open>
          <summary className="panelHead">
            <span className="panelTitle">{preset?.digitalOnly ? "Upload photo" : "Single photo"}</span>
            <span className="panelMeta mono">
              {outPx.w} × {outPx.h}px · {fileKB ? formatFileKB(fileKB) : `${photo.dpi} DPI`}
            </span>
          </summary>

          <div className="panelBody">
            <div className="previewBox measuredBox">
              <MeasuredPreview
                canvasRef={previewRef}
                photo={photo}
                preset={preset}
                report={report}
                show={showMarks}
              />
            </div>

            <label className="checkToggle">
              <input type="checkbox" checked={showMarks} onChange={e => setShowMarks(e.target.checked)} />
              Show measurements
              <span className="small"> — on screen only, never in the download</span>
            </label>

            <div className="row wrap" style={{ marginTop: 12 }}>
              {fileKB ? (
                <button className="btn primary" onClick={() => void downloadSingle("jpeg")} disabled={!!busy}>
                  Download JPEG ({files ? formatBytes(files.jpeg.size) : formatFileKB(fileKB)})
                </button>
              ) : (
                <>
                  <button className="btn primary" onClick={() => void downloadSingle("png")} disabled={!!busy}>
                    Download PNG{files?.png ? ` (${formatBytes(files.png.size)})` : ""}
                  </button>
                  <button className="btn primary" onClick={() => void downloadSingle("jpeg")} disabled={!!busy}>
                    Download JPEG{files ? ` (${formatBytes(files.jpeg.size)})` : ""}
                  </button>
                </>
              )}
            </div>

            <div className="small" style={{ marginTop: 8 }}>
              {fileKB ? (
                files ? (
                  files.fits ? (
                    <>Saves at {formatBytes(files.jpeg.size)}, within the {formatFileKB(fileKB)} the form accepts.</>
                  ) : (
                    <span style={{ color: "var(--redline)" }}>
                      Comes out at {formatBytes(files.jpeg.size)}, outside the {formatFileKB(fileKB)} the
                      form accepts. A plainer background usually compresses smaller.
                    </span>
                  )
                ) : (
                  <>Compressed to fit the {formatFileKB(fileKB)} limit the upload form sets.</>
                )
              ) : (
                <>
                  Use this for online applications that ask you to upload one photo. JPEG at full
                  quality; both files are saved at {photo.dpi} DPI.
                </>
              )}
            </div>
          </div>
        </details>

        {/* An upload-only document has no paper size, so there is nothing to print — but the
            panel stays, saying so, rather than vanishing and reading as a bug. */}
        {preset?.digitalOnly && (
          <details className="panel">
            <summary className="panelHead">
              <span className="panelTitle">Print sheet</span>
              <span className="panelMeta mono">upload only</span>
            </summary>
            <div className="panelBody">
              <div className="small">
                {presetTitle(preset)} is submitted as a file, so it has no print size.
                {printable.length > 0 ? " For printed photos, switch to:" : ""}
              </div>
              {printable.length > 0 && (
                <div className="row wrap" style={{ marginTop: 10 }}>
                  {printable.map(p => (
                    <button key={p.id} className="btn" onClick={() => switchTo(p)}>
                      {documentLabel(p)} · {formatSize(p)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}

        {!preset?.digitalOnly && <details className="panel">
          <summary className="panelHead">
            <span className="panelTitle">Print sheet</span>
            <span className="panelMeta mono">
              {layout.count} photos · {paperName}
            </span>
          </summary>

          <div className="panelBody">
            <div className="row wrap" style={{ alignItems: "flex-end" }}>
              <div style={{ flex: "0 1 200px" }}>
                <label htmlFor="paper">Paper</label>
                <select
                  id="paper"
                  value={sheet.paper}
                  onChange={(e) => setSheet({ paper: e.target.value as PaperId })}
                >
                  <option value="P4x6">4 × 6 inch</option>
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              {sheet.paper === "CUSTOM" && (
                <>
                  <div style={{ flex: "0 1 130px" }}>
                    <label htmlFor="cw">Width</label>
                    <input
                      id="cw"
                      className="input"
                      type="number"
                      value={sheet.customWidth ?? 210}
                      onChange={(e) => setSheet({ customWidth: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ flex: "0 1 130px" }}>
                    <label htmlFor="ch">Height</label>
                    <input
                      id="ch"
                      className="input"
                      type="number"
                      value={sheet.customHeight ?? 297}
                      onChange={(e) => setSheet({ customHeight: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ flex: "0 1 110px" }}>
                    <label htmlFor="cu">Unit</label>
                    <select
                      id="cu"
                      value={sheet.customUnit ?? "mm"}
                      onChange={(e) => setSheet({ customUnit: e.target.value as Unit })}
                    >
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="in">inch</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="previewBox sheetPreview" style={{ marginTop: 12 }}>
              <canvas ref={sheetRef} className="previewCanvas" />
            </div>

            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={() => void downloadSheet("png")} disabled={!!busy}>
                Download sheet PNG
              </button>
              <button className="btn primary" onClick={() => void downloadSheet("jpeg")} disabled={!!busy}>
                Download sheet JPEG
              </button>
            </div>

            <div className="small" style={{ marginTop: 8 }}>
              {layout.count > 0 ? (
                <>
                  {layout.count} photos ({layout.cols} × {layout.rows}) at {photo.dpi} DPI, with cut
                  lines down the middle of each gap. Print at 100% — no “fit to page” — or the
                  photos come out the wrong size.
                </>
              ) : (
                <>This photo is larger than the chosen paper. Pick a bigger sheet.</>
              )}
            </div>
          </div>
        </details>}

        <div className="actionRow" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => setStep(3)}>Back</button>
          <button className="btn danger" onClick={() => setStep(1)}>Start over</button>
        </div>

        {busy && <div className="small" style={{ marginTop: 8 }}>{busy}</div>}
      </div>

      <div className="col sidebar" style={{ width: 320 }}>
        <LikeCard />

        <div className="card">
          <div className="sectionTitle">If something looks off</div>
          <div className="small">
            Blurry output:
            <br />– use a higher DPI (300 is usually fine)
            <br />– use a higher-resolution source photo
            <br /><br />
            Rough background edges:
            <br />– increase Soften edge
            <br />– increase Trim edge a little
          </div>
        </div>

        <div className="card">
          <div className="sectionTitle">Photo rejected?</div>
          <div className="small">
            If an authority turned down a photo made here, the reason they gave helps fix the
            requirements for everyone.{" "}
            <button
              type="button"
              className="linkish"
              onClick={() => showFeedback({ topic: "spec", problem: "rejected" })}
            >
              Tell us what they said
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
