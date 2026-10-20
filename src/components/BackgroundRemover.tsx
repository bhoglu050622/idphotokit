import { useMemo, useRef, useState } from "react";
import { backgroundPath } from "../utils/backgroundRoute";
import { birefnetAlpha, MODEL_SIZE_LABEL } from "../utils/birefnet";
import { FREE_LONG_SIDE, limitLongSide, marketplaceFrame, subjectBox } from "../utils/cutout";
import { repairSubjectAlpha } from "../utils/matting";

type Mode = "person" | "product";
type Output = "transparent" | "white" | "color" | "marketplace";

const ACCEPT = "image/jpeg,image/png,image/webp";

export default function BackgroundRemover() {
  const path = backgroundPath();
  const [mode, setMode] = useState<Mode>(path === "/white-background-for-meesho-amazon" ? "product" : "person");
  const [output, setOutput] = useState<Output>(path === "/white-background-for-meesho-amazon" ? "marketplace" : "transparent");
  const [color, setColor] = useState("#ffffff");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [fileName, setFileName] = useState("cutout");
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const alphaRef = useRef<Float32Array | null>(null);
  const lowMemory = useMemo(() => {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return typeof memory === "number" && memory > 0 && memory <= 2;
  }, []);

  const run = async (file: File) => {
    setError(undefined);
    setPreview(undefined);
    setProgress(0);
    setFileName(file.name.replace(/\.[^.]+$/, "") || "cutout");
    try {
      const bitmap = await createImageBitmap(file);
      const limited = limitLongSide(bitmap.width, bitmap.height);
      const working = document.createElement("canvas");
      working.width = limited.width;
      working.height = limited.height;
      const ctx = working.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas is not available");
      ctx.drawImage(bitmap, 0, 0, limited.width, limited.height);
      bitmap.close();
      const alpha = await birefnetAlpha(working, limited.width, limited.height, setProgress);
      sourceRef.current = working;
      alphaRef.current = alpha;
      publish(working, alpha, mode, output, color);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The background could not be removed on this device.");
    } finally {
      setProgress(null);
    }
  };

  const publish = (source: HTMLCanvasElement, alpha: Float32Array, nextMode: Mode, nextOutput: Output, nextColor: string) => {
    const shaped = shapeAlpha(alpha, source.width, source.height, nextMode);
    const box = subjectBox(shaped, source.width, source.height);
    if (!box) throw new Error("No subject was found. Use a photo where the person or product is clearly separate from the background.");
    const rendered = renderOutput(source, shaped, nextOutput === "marketplace" || nextOutput === "white" ? "#ffffff" : nextColor, nextOutput, box);
    canvasRef.current = rendered;
    setPreview(rendered.toDataURL("image/png"));
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const suffix = output === "transparent" ? "transparent" : output === "marketplace" ? "white-square" : output;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}-${suffix}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <section className="bgTool">
      <p className="examKicker mono">In this browser · nothing is uploaded</p>
      <h1 className="heroTitle">
        Remove a background
        <span className="heroPromise">Free, up to {FREE_LONG_SIDE}px. No watermark.</span>
      </h1>
      <p className="heroSub">
        The photo stays on this device. Starting a cutout downloads the model once
        ({MODEL_SIZE_LABEL}) and the browser caches it. Later cutouts do not download it again.
        People and products use that same model.
      </p>

      <div className="modeSwitch" role="tablist" aria-label="What is in the photo">
        {([
          ["person", "People / portrait"],
          ["product", "Product / object"]
        ] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} className={`modeTab ${mode === id ? "active" : ""}`} onClick={() => {
            setMode(id);
            if (sourceRef.current && alphaRef.current) publish(sourceRef.current, alphaRef.current, id, output, color);
          }}>
            {label}
          </button>
        ))}
      </div>

      <div
        className="bgDrop"
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) void run(file);
        }}
      >
        <p>Drop a JPG, PNG or WebP here, or choose a file.</p>
        <p className="small">The first cutout downloads {MODEL_SIZE_LABEL}. Nothing starts until you add a photo.</p>
        <div className="actionRow">
          <label className="btn primary">
            Choose a photo
            <input className="visuallyHidden" type="file" accept={ACCEPT} aria-label="Upload a JPG, PNG or WebP" onChange={event => {
              const file = event.target.files?.[0];
              if (file) void run(file);
            }} />
          </label>
          <label className="btn">
            Use camera
            <input className="visuallyHidden" type="file" accept={ACCEPT} capture="environment" aria-label="Take a photo with the camera" onChange={event => {
              const file = event.target.files?.[0];
              if (file) void run(file);
            }} />
          </label>
        </div>
        {lowMemory && <p className="small">This phone reports 2 GB of memory or less. The cutout may be slow, and it can fail if other tabs are open.</p>}
      </div>

      {progress !== null && (
        <div className="bgProgress">
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Model and cutout progress">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="small">{progress < 0.85 ? `Downloading the model (${MODEL_SIZE_LABEL})…` : "Removing the background…"}</p>
        </div>
      )}
      {error && <p className="examMiss" role="alert">{error}</p>}

      {preview && (
        <div className="bgResult">
          <img src={preview} alt="Cutout preview" />
          <fieldset>
            <legend>Background</legend>
            {([
              ["transparent", "Transparent PNG"],
              ["white", "White"],
              ["color", "Custom colour"],
              ["marketplace", "Meesho / Amazon / Flipkart square"]
            ] as const).map(([id, label]) => (
              <label key={id}>
                <input type="radio" name="output" checked={output === id} onChange={() => {
                setOutput(id);
                if (sourceRef.current && alphaRef.current) publish(sourceRef.current, alphaRef.current, mode, id, color);
              }} /> {label}
              </label>
            ))}
            {output === "color" && (
              <label>
                Colour
                <input type="color" value={color} aria-label="Custom background colour" onChange={event => {
                setColor(event.target.value);
                if (sourceRef.current && alphaRef.current) publish(sourceRef.current, alphaRef.current, mode, output, event.target.value);
              }} />
              </label>
            )}
            {output === "marketplace" && <p className="small">Square, white #FFFFFF, product centred with padding. This is PhotoJhat’s listing preset, not an official marketplace size.</p>}
            <button type="button" className="btn" onClick={download}>Download free PNG</button>
            <p className="small">Long side is at most {FREE_LONG_SIDE} pixels. There is no watermark.</p>
          </fieldset>
        </div>
      )}

      <aside className="card hdCard">
        <h2>HD / batch: coming soon</h2>
        <p>There is no paid download today and no checkout on this page. Full-resolution and multi-file export are not available yet. The free file above is the only download.</p>
      </aside>
    </section>
  );
}

function shapeAlpha(alpha: Float32Array, width: number, height: number, mode: Mode) {
  const shaped = new Float32Array(alpha);
  for (let i = 0; i < shaped.length; i++) {
    const value = shaped[i];
    shaped[i] = mode === "product" ? (value < 0.2 ? 0 : value > 0.85 ? 1 : value) : value;
  }
  if (mode === "product") repairSubjectAlpha(shaped, width, height);
  return shaped;
}

function renderOutput(
  source: HTMLCanvasElement,
  alpha: Float32Array,
  color: string,
  output: Output,
  box: NonNullable<ReturnType<typeof subjectBox>>
) {
  const cut = document.createElement("canvas");
  cut.width = source.width;
  cut.height = source.height;
  const ctx = cut.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, cut.width, cut.height);
  const rgb = hex(color);
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    const offset = i * 4;
    if (output === "transparent") pixels.data[offset + 3] = Math.round(a * 255);
    else {
      pixels.data[offset] = Math.round(pixels.data[offset] * a + rgb[0] * (1 - a));
      pixels.data[offset + 1] = Math.round(pixels.data[offset + 1] * a + rgb[1] * (1 - a));
      pixels.data[offset + 2] = Math.round(pixels.data[offset + 2] * a + rgb[2] * (1 - a));
      pixels.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  if (output !== "marketplace") return cut;
  const frame = marketplaceFrame(box, cut.width, cut.height);
  const square = document.createElement("canvas");
  const side = limitLongSide(frame.side, frame.side).width;
  const scale = side / frame.side;
  square.width = side;
  square.height = side;
  const out = square.getContext("2d");
  if (!out) throw new Error("Canvas is not available");
  out.fillStyle = "#ffffff";
  out.fillRect(0, 0, side, side);
  out.drawImage(
    cut,
    frame.crop.x,
    frame.crop.y,
    frame.crop.width,
    frame.crop.height,
    Math.round(frame.offsetX * scale),
    Math.round(frame.offsetY * scale),
    Math.round(frame.crop.width * scale),
    Math.round(frame.crop.height * scale)
  );
  return square;
}

function hex(color: string): [number, number, number] {
  const value = color.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}
