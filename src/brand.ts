/**
 * The product's name and the one-line promise, in one place.
 *
 * Read by the app header, and by scripts/prerender.mjs for the homepage meta, every document
 * page's title and og:site_name. A rename — say, once the domain is chosen — is this file,
 * plus the hand-drawn share card (scripts/og-card.html → public/og.png) and the dev-only
 * fallback meta in index.html.
 *
 * Deliberately not "passport": the tool covers visas, ID and residence cards, licences and
 * tax cards too. And nothing that suggests a government connection ("official", "gov").
 */
export const BRAND = "PhotoJhat";

/** The public site. Override at build time with SITE_URL when a custom domain is attached. */
export const SITE_ORIGIN = "https://photojhat.pages.dev";

/**
 * The headline, in two beats: what it is, then the promise that sets it apart. Leads with
 * privacy because handing over a photo of your face is where people hesitate.
 */
export const TAGLINE = "Indian ID photos, on your device.";
export const TAGLINE_PROMISE = "Nothing is uploaded.";

export const HOME_DESCRIPTION =
  "Free Indian passport, visa, PAN, Aadhaar and OCI photos, plus exam photo and signature " +
  "files sized to the official notice. Made in your browser — nothing is uploaded.";
