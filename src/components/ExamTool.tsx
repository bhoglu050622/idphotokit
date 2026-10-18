import { useEffect, useRef, useState, type PointerEvent } from "react";
import { EXAMS, type Exam, type UploadSpec } from "../data/exams";
import { fitImageToSpec, type FitResult } from "../utils/fitJpeg";
import { examFromPath } from "../utils/examRoute";

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export default function ExamTool() {
  const [slug, setSlug] = useState(() => examFromPath()?.slug);
  useEffect(() => {
    const sync = () => setSlug(examFromPath()?.slug);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const exam = EXAMS.find(e => e.slug === slug);

  return (
    <section className="examTool">
      <p className="examKicker mono">Exam photo and signature · in this browser</p>
      <h1 className="heroTitle">
        {exam ? exam.name : "Exam photos"}
        <span className="heroPromise">Exact file size. Nothing uploaded.</span>
      </h1>
      <p className="heroSub">
        Pick the exam, add the photograph and the signature, and download JPEGs that land in the
        kilobyte range printed in that exam’s notice. The resize runs here. The files are not sent
        anywhere.
      </p>

      <div className="examPick" role="navigation" aria-label="Exams">
        {EXAMS.map(e => (
          <a key={e.slug} href={`/exam/${e.slug}`} className={e.slug === slug ? "active" : ""} aria-current={e.slug === slug ? "page" : undefined}>
            {e.shortName}
          </a>
        ))}
      </div>

      {exam ? <ExamWorkspace exam={exam} /> : <ExamIndex />}
    </section>
  );
}

function ExamIndex() {
  return (
    <div className="examIndex">
      {EXAMS.map(e => (
        <a key={e.slug} className="examIndexCard" href={`/exam/${e.slug}`}>
          <strong>{e.name}</strong>
          <span>{e.cycle}</span>
        </a>
      ))}
    </div>
  );
}

function ExamWorkspace({ exam }: { exam: Exam }) {
  return (
    <div className="examGrid">
      {exam.photo.kind === "live" ? (
        <article className="card examCard">
          <h2>Photograph</h2>
          <p className="examLive">{exam.photo.guidance}</p>
          <p className="small">There is no photograph file to download for this notice.</p>
        </article>
      ) : (
        <FileCard exam={exam} spec={exam.photo} />
      )}
      <FileCard exam={exam} spec={exam.signature} />
    </div>
  );
}

function FileCard({ exam, spec }: { exam: Exam; spec: UploadSpec }) {
  const [file, setFile] = useState<File>();
  const [image, setImage] = useState<HTMLImageElement>();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<FitResult>();
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!file) {
      setImage(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setError("That image could not be read.");
    img.src = url;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setResult(undefined);
    setError(undefined);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fixed = spec.width !== undefined && spec.height !== undefined;
  const previewW = spec.width ?? 360;
  const previewH = spec.height ?? 480;

  const make = async () => {
    if (!image) return;
    setBusy(true);
    setError(undefined);
    try {
      const fit = await fitImageToSpec({
        image,
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight,
        outWidth: spec.width,
        outHeight: spec.height,
        fit: spec.fit,
        zoom,
        panX: pan.x,
        panY: pan.y,
        minKB: spec.minKB,
        maxKB: spec.maxKB,
        dimensionMode: spec.label === "Signature" ? spec.dimensionMode : "fixed"
      });
      setResult(fit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make the file.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exam.slug}-${spec.label.toLowerCase()}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!fixed) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const scale = previewW / rect.width;
    setPan({
      x: drag.current.panX + (e.clientX - drag.current.x) * scale,
      y: drag.current.panY + (e.clientY - drag.current.y) * scale
    });
  };

  return (
    <article className="card examCard">
      <h2>{spec.label}</h2>
      <dl className="examSpec">
        <div>
          <dt>File size</dt>
          <dd className="mono">{spec.minKB}–{spec.maxKB} KB</dd>
        </div>
        <div>
          <dt>Pixels</dt>
          <dd className="mono">
            {fixed ? `${spec.width} × ${spec.height}` : "Not stated"}
            {fixed && !spec.pixelsVerified ? " · unverified" : ""}
          </dd>
        </div>
      </dl>
      <p className="small">{spec.pixelNote}</p>
      <p className="small">{spec.background}</p>

      <label className="examFile">
        <span>Choose {spec.label.toLowerCase()}</span>
        <input
          data-slot={spec.label === "Photograph" ? "photo" : "signature"}
          type="file"
          accept="image/*"
          aria-label={`Upload ${exam.name} ${spec.label.toLowerCase()}`}
          onChange={e => setFile(e.target.files?.[0])}
        />
      </label>

      {image && fixed && (
        <>
          <div
            className="examFrame"
            ref={frame}
            style={{ aspectRatio: `${previewW} / ${previewH}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
          >
            <Preview image={image} spec={spec} zoom={zoom} pan={pan} />
          </div>
          <label className="examZoom">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
            />
          </label>
          <p className="small">Drag to move the {spec.fit === "contain" ? "signature" : "face"} inside the frame.</p>
        </>
      )}

      {image && !fixed && (
        <p className="small">
          Loaded {image.naturalWidth} × {image.naturalHeight} px. The notice does not set a pixel
          size, so the file keeps this crop and only the JPEG quality is searched. A very large
          photo is limited to a 1600 px long edge, and scaled further only if that is what it
          takes to get under {spec.maxKB} KB.
        </p>
      )}

      <div className="actionRow">
        <button type="button" className="btn primary" disabled={!image || busy} onClick={() => void make()}>
          {busy ? "Fitting…" : "Make JPEG"}
        </button>
        {result && (
          <button type="button" className="btn" onClick={download}>
            Download
          </button>
        )}
      </div>

      {error && <p className="examMiss">{error}</p>}

      {result && (
        <div
          className={`examResult ${result.fits && !result.padded ? "ok" : result.padded ? "warn" : "bad"}`}
          role="status"
          data-result-fits={result.fits ? "yes" : "no"}
          data-result-bytes={result.bytes}
          data-result-width={result.width}
          data-result-height={result.height}
          data-slot-result={spec.label === "Photograph" ? "photo" : "signature"}
        >
          <strong>
            {result.padded
              ? "KB range reached with metadata fallback"
              : result.fits
                ? "Inside the published range"
                : "Outside the published range"}
          </strong>
          <span className="mono">
            {result.width} × {result.height} px · {kb(result.bytes)} · quality {result.quality.toFixed(2)}
          </span>
          {result.padded && (
            <span className="small">
              Real image data at the highest quality and allowed dimensions was still under
              {` ${spec.minKB} KB`}, so a JPEG comment was added as a last resort. Some exam
              portals strip or reject metadata. Prefer rescanning at higher resolution or
              crop more of the handwritten signature into the frame before using this file.
            </span>
          )}
          {result.grew && !result.padded && (
            <span className="small">
              The signature was increased to {result.width} × {result.height} px to reach the
              minimum with real image data. The notice describes its pixel size as{" "}
              {spec.dimensionMode === "minimum" ? "a minimum" : spec.dimensionMode === "preferred" ? "preferred" : "unverified"}.
            </span>
          )}
          {result.scaled && (
            <span className="small">
              The long edge was reduced. This notice does not publish a pixel size, and the
              original was too large to land under {spec.maxKB} KB by quality alone.
            </span>
          )}
          {!result.fits && (
            <span className="small">
              JPEG quality could not place this image between {spec.minKB} and {spec.maxKB} KB
              at the required size. Try a tighter crop or a scan with more ink in the frame.
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function Preview({
  image,
  spec,
  zoom,
  pan
}: {
  image: HTMLImageElement;
  spec: UploadSpec;
  zoom: number;
  pan: { x: number; y: number };
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el || spec.width === undefined || spec.height === undefined) return;
    el.width = spec.width;
    el.height = spec.height;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, spec.width, spec.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const base =
      spec.fit === "cover"
        ? Math.max(spec.width / image.naturalWidth, spec.height / image.naturalHeight)
        : Math.min(spec.width / image.naturalWidth, spec.height / image.naturalHeight);
    const scale = base * zoom;
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.drawImage(image, (spec.width - dw) / 2 + pan.x, (spec.height - dh) / 2 + pan.y, dw, dh);
  }, [image, spec, zoom, pan]);

  return <canvas ref={canvas} className="examCanvas" />;
}
