/**
 * Cloudflare Turnstile, shared by everything that posts to the Worker: the feedback form and
 * the "it worked" button. The script is fetched on first use, never on page load, so a visitor
 * who doesn't send anything never loads it.
 */

/**
 * Turnstile's always-passes key, for localhost. The Worker checks tokens against its own
 * secret, so a test token never counts or files anything for real.
 */
const TEST_KEY = "1x00000000000000000000AA";
/**
 * The site's widget, "Right ID Photo feedback" (rightidphoto.com and the workers.dev
 * address). Public by design; its secret lives in the Worker.
 */
const SITE_KEY = "0x4AAAAAAFVjzMqHKRmoy3d3";

export type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: Turnstile }
}

let load: Promise<Turnstile> | null = null;

export function loadTurnstile(): Promise<Turnstile> {
  load ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  load.catch(() => { load = null; });
  return load;
}

export function turnstileSiteKey(): string {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  return local ? TEST_KEY : SITE_KEY;
}

/**
 * One token for one request: renders a widget into `el` (seen only if Cloudflare wants a
 * click), resolves with its token, and removes the widget once it has one.
 */
export async function turnstileToken(el: HTMLElement): Promise<string> {
  const ts = await loadTurnstile();
  return new Promise((resolve, reject) => {
    const id = ts.render(el, {
      sitekey: turnstileSiteKey(),
      appearance: "interaction-only",
      callback: (token: string) => {
        resolve(token);
        // After this tick: removing the widget inside its own callback trips Turnstile up.
        setTimeout(() => ts.remove(id), 0);
      },
      "error-callback": () => {
        reject(new Error("The spam check failed"));
        setTimeout(() => ts.remove(id), 0);
      }
    });
  });
}
