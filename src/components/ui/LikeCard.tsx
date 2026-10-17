import { useState } from "react";
import { REPO_URL } from "./GitHubStar";

/** This browser's own note. Nothing is sent — the static site has no counter. */
const LIKED_KEY = "photojhat:liked";

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

/**
 * A local "it worked" mark. PhotoJhat is a static site, so the tap is remembered only in
 * this browser. There is no counter and no request.
 */
export default function LikeCard() {
  const [liked, setLiked] = useState(readLiked);

  const like = () => {
    setLiked(true);
    try { localStorage.setItem(LIKED_KEY, "1"); } catch { /* this visit only */ }
  };

  return (
    <div className="card likeCard">
      <div className="sectionTitle">Did it work?</div>
      <div className="small">
        Free, with no account and no watermark. The tap stays on this device — nothing is sent.
      </div>

      {liked ? (
        <div className="likeThanks" role="status">
          <ThumbIcon />
          Thanks for letting us know
        </div>
      ) : (
        <button type="button" className="btn primary likeBtn" onClick={like}>
          <ThumbIcon />
          It worked for me
        </button>
      )}

      <div className="small likeStar">
        On GitHub? <a href={REPO_URL} target="_blank" rel="noreferrer">Star it there</a> too.
      </div>
    </div>
  );
}
