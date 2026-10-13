import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAppStore } from "../../state/store";
import { useFeedback, type FeedbackOpening } from "../../state/feedback";
import { findPreset, formatSize, presetTitle } from "../../utils/presets";
import {
  LIMITS,
  parseFeedback,
  SPEC_PROBLEMS,
  TOPICS,
  type FeedbackPayload,
  type FeedbackTopic,
  type SpecProblem
} from "../../utils/feedback";
import { REPO_URL } from "./GitHubStar";

/**
 * Cloudflare Turnstile's always-passes key, for localhost and until the real one is set. The
 * Worker checks tokens against its secret, so a test token never files anything for real.
 */
const TURNSTILE_TEST_KEY = "1x00000000000000000000AA";
/**
 * The site's Turnstile widget, "Right ID Photo feedback" (rightidphoto.com and the
 * workers.dev address). Public by design; its secret lives in the Worker.
 */
const TURNSTILE_SITE_KEY = "0x4AAAAAAFVjzMqHKRmoy3d3";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: Turnstile }
}

let turnstileLoad: Promise<Turnstile> | null = null;

/** Turnstile is fetched only when the form opens, so no page carries it otherwise. */
function loadTurnstile(): Promise<Turnstile> {
  turnstileLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  turnstileLoad.catch(() => { turnstileLoad = null; });
  return turnstileLoad;
}

function siteKey(): string {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  return local || !TURNSTILE_SITE_KEY ? TURNSTILE_TEST_KEY : TURNSTILE_SITE_KEY;
}

/** The "what should it be" field, worded for each problem. Absent where it means nothing. */
const EXPECTED_FIELD: Partial<Record<SpecProblem, { label: string; placeholder: string }>> = {
  size: { label: "What should it be?", placeholder: "e.g. 35 × 45 mm" },
  head: { label: "What should it be?", placeholder: "e.g. chin to crown 32–36 mm" },
  background: { label: "What should it be?", placeholder: "e.g. white or off-white" },
  file: { label: "What should it be?", placeholder: "e.g. 20–100 KB, JPEG" },
  rejected: { label: "What reason were you given?", placeholder: "e.g. head too small, shadow behind the head" },
  missing: { label: "Which document is missing?", placeholder: "e.g. Kenya e-visa, 600 × 600 px" }
};

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; number?: number; url?: string }
  /** `fallback`: sending itself failed, so offer GitHub directly. Not for a missing field. */
  | { kind: "error"; message: string; fallback?: boolean };

function FeedbackForm({ opening, onClose }: { opening: FeedbackOpening; onClose: () => void }) {
  const presetId = useAppStore(s => s.photo.presetId);
  const preset = findPreset(presetId);

  const [topic, setTopic] = useState<FeedbackTopic>(opening.topic ?? "spec");
  const [problem, setProblem] = useState<SpecProblem | "">(opening.problem ?? "");
  const [expected, setExpected] = useState("");
  const [source, setSource] = useState("");
  const [details, setDetails] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then(ts => {
        if (cancelled || !widgetRef.current) return;
        widgetId.current = ts.render(widgetRef.current, {
          sitekey: siteKey(),
          // Shown only when Cloudflare wants a click; otherwise it passes unseen.
          appearance: "interaction-only",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken("")
        });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: "error", message: "The spam check couldn't load.", fallback: true });
      });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    };
  }, []);

  const expectedField = topic === "spec" && problem ? EXPECTED_FIELD[problem] : undefined;
  const aboutDocument = topic === "spec" && problem !== "missing";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload: FeedbackPayload = {
      topic,
      problem: topic === "spec" && problem ? problem : undefined,
      presetId: aboutDocument ? preset?.id : undefined,
      documentTitle: aboutDocument && preset ? `${presetTitle(preset)} (${formatSize(preset)})` : undefined,
      expected: expectedField ? expected : undefined,
      source: topic === "spec" ? source : undefined,
      details,
      page: window.location.pathname,
      token
    };
    // The same checks the Worker makes, so most mistakes are caught without a round trip.
    const checked = parseFeedback({ ...payload, token: token || "pending" });
    if (!checked.ok) return setStatus({ kind: "error", message: checked.error });
    if (!token) return setStatus({ kind: "error", message: "The spam check is still running — try again in a moment." });

    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const out = (await res.json().catch(() => ({}))) as { error?: string; number?: number; url?: string };
      if (!res.ok) throw new Error(out.error ?? `It couldn't be sent (${res.status}).`);
      setStatus({ kind: "sent", number: out.number, url: out.url });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "It couldn't be sent.", fallback: true });
      // A Turnstile token is good for one check; get a fresh one for the retry.
      setToken("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="feedbackDialog"
      aria-labelledby="feedbackTitle"
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) dialogRef.current?.close(); }}
    >
      <div className="feedbackHead">
        <div className="sectionTitle" id="feedbackTitle">Send feedback</div>
        <button type="button" className="linkish" onClick={() => dialogRef.current?.close()}>Close</button>
      </div>

      {status.kind === "sent" ? (
        <div className="feedbackBody">
          <p className="feedbackDone">
            Thanks — it's filed{status.number ? ` as issue #${status.number}` : ""}.
          </p>
          {status.url && (
            <div className="small">
              You can <a href={status.url} target="_blank" rel="noopener noreferrer">follow it on GitHub</a>.
            </div>
          )}
          <div className="actionRow">
            <button type="button" className="btn primary" onClick={() => dialogRef.current?.close()}>Done</button>
          </div>
        </div>
      ) : (
        <form className="feedbackBody" onSubmit={e => void submit(e)} noValidate>
          <div>
            <label>What is it about?</label>
            <div className="pills" role="radiogroup">
              {TOPICS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={topic === t.id}
                  className={`pill ${topic === t.id ? "active" : ""}`}
                  onClick={() => setTopic(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {topic === "spec" && (
            <>
              {aboutDocument && (
                <div className="feedbackAbout">
                  {preset ? (
                    <>
                      About <strong>{presetTitle(preset)}</strong> · {formatSize(preset)}
                      <div className="small">To report a different document, choose it on the page first.</div>
                    </>
                  ) : (
                    <>No document is chosen — say which one below.</>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="fbProblem">What's wrong?</label>
                <select id="fbProblem" value={problem} onChange={e => setProblem(e.target.value as SpecProblem | "")}>
                  <option value="">Choose…</option>
                  {SPEC_PROBLEMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              {expectedField && (
                <div>
                  <label htmlFor="fbExpected">{expectedField.label}</label>
                  <input
                    id="fbExpected"
                    className="input"
                    value={expected}
                    maxLength={LIMITS.expected}
                    placeholder={expectedField.placeholder}
                    onChange={e => setExpected(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label htmlFor="fbSource">
                  {problem === "source" ? "Link to the current official page" : "Link to the official requirements (optional, but it helps most)"}
                </label>
                <input
                  id="fbSource"
                  className="input"
                  type="url"
                  inputMode="url"
                  value={source}
                  maxLength={LIMITS.source}
                  placeholder="https://"
                  onChange={e => setSource(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="fbDetails">
              {topic === "spec" ? "Anything else? (optional)" : topic === "bug" ? "What happened, and what did you expect?" : "Tell us"}
            </label>
            <textarea
              id="fbDetails"
              className="input"
              value={details}
              maxLength={LIMITS.details}
              rows={topic === "spec" ? 3 : 5}
              onChange={e => setDetails(e.target.value)}
            />
          </div>

          <div className="small">
            This is posted publicly as a GitHub issue, with no name attached and never your photo.
            Please leave out personal details.
          </div>

          <div ref={widgetRef} className="feedbackTurnstile" />

          {status.kind === "error" && (
            <div className="small feedbackError" role="alert">
              {status.message}
              {status.fallback && (
                <>
                  {" "}
                  <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer">Open an issue on GitHub instead</a>.
                </>
              )}
            </div>
          )}

          <div className="actionRow">
            <button type="submit" className="btn primary" disabled={status.kind === "sending"}>
              {status.kind === "sending" ? <><span className="spinner" />Sending…</> : "Send"}
            </button>
            <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>Cancel</button>
          </div>
        </form>
      )}
    </dialog>
  );
}

/** Mounted once in App; a fresh form for each opening. */
export default function FeedbackDialog() {
  const { open, opening, session, close } = useFeedback();
  return open ? <FeedbackForm key={session} opening={opening} onClose={close} /> : null;
}
