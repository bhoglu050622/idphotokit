import { useEffect, useRef, useState } from "react";
import { REPO_URL } from "./GitHubStar";
import { turnstileToken } from "../../utils/turnstile";

/** Below this the count reads as "hardly anyone uses it", so it isn't shown. */
const SHOW_COUNT_FROM = 10;

/** This browser's own vote, so the button stays pressed and nobody counts twice by accident. */
const LIKED_KEY = "rightidphoto:liked";

function readLiked(): boolean {
  try {
    return localStorage.getItem(LIKED_KEY) === "1";
  } catch {
    return false;
  }
}

function ThumbIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7 10v11H3V10h4zm2 11h8.2a2 2 0 0 0 1.96-1.6l1.3-6.5A2 2 0 0 0 18.5 10H14l.72-3.6a1.8 1.8 0 0 0-3.38-1.17L9 10v11z"
        fill="currentColor"
      />
    </svg>
  );
}

const people = (n: number) => n.toLocaleString("en");

/**
 * "It worked for me": a one-tap thanks that needs no account, shown once the photo is
 * downloadable — the only honest moment to ask. Most people here have no GitHub account, so
 * this replaces asking for a star; the star stays as a link for those who do.
 */
export default function LikeCard() {
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(readLiked);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const widgetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/likes")
      .then(r => (r.ok ? r.json() : null))
      .then((out: { count?: number } | null) => {
        if (!cancelled && typeof out?.count === "number") setCount(out.count);
      })
      .catch(() => { /* No count is fine: the button still works. */ });
    return () => { cancelled = true; };
  }, []);

  const like = async () => {
    if (liked || state === "sending" || !widgetRef.current) return;
    setState("sending");
    try {
      const token = await turnstileToken(widgetRef.current);
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      if (!res.ok) throw new Error(String(res.status));
      const out = (await res.json()) as { count?: number };
      if (typeof out.count === "number") setCount(out.count);
      setLiked(true);
      setState("idle");
      try { localStorage.setItem(LIKED_KEY, "1"); } catch { /* remembered for this visit only */ }
    } catch {
      setState("error");
    }
  };

  const showCount = count !== null && count >= SHOW_COUNT_FROM;

  return (
    <div className="card likeCard">
      <div className="sectionTitle">Did it work?</div>
      <div className="small">
        This tool is free and always will be — no account, no watermark, no upsell. One tap
        tells the next person it does the job.
      </div>

      {liked ? (
        <div className="likeThanks" role="status">
          <ThumbIcon />
          {showCount ? `Thanks — you're one of ${people(count)}` : "Thanks for letting us know"}
        </div>
      ) : (
        <button type="button" className="btn primary likeBtn" onClick={() => void like()} disabled={state === "sending"}>
          {state === "sending" ? <span className="spinner" /> : <ThumbIcon />}
          It worked for me
        </button>
      )}

      <div ref={widgetRef} className="likeTurnstile" />

      {state === "error" && <div className="small likeError">That didn't go through. Try again in a moment.</div>}
      {showCount && !liked && (
        <div className="small likeCount">{people(count)} people say it worked for them.</div>
      )}

      <div className="small likeStar">
        On GitHub? <a href={REPO_URL} target="_blank" rel="noreferrer">Star it there</a> too.
      </div>
    </div>
  );
}
