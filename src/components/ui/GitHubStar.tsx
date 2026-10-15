export const REPO_URL = "https://github.com/vijayanandraj/idphotokit";

function StarIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5 7.3 14.03 2.6 9.45l6.5-.95L12 2.6z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Header affordance: quiet, always available. */
export function GitHubStarLink() {
  return (
    <a className="starLink" href={REPO_URL} target="_blank" rel="noreferrer">
      <StarIcon />
      Star on GitHub
    </a>
  );
}
