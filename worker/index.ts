/**
 * The site is static files; this Worker only answers /api/* (wrangler.jsonc sends nothing
 * else here, so pages and assets never run it).
 *
 * POST /api/feedback files the feedback form as a GitHub issue. Reports come from people
 * without GitHub accounts, so the issue is created with the project's own token, kept as a
 * Worker secret. In front of it: a same-origin check, Cloudflare Turnstile, and a per-IP rate
 * limit — the form is public, and the issues it makes are too.
 *
 * Secrets (`npx wrangler secret put <NAME>`): GITHUB_TOKEN, a fine-grained token with
 * Issues: read and write on the repository; TURNSTILE_SECRET, the widget's secret key.
 * Locally, put them in .dev.vars; FEEDBACK_DRY_RUN=1 there returns the issue instead of
 * filing it.
 */

import { buildIssue, parseFeedback } from "../src/utils/feedback";

type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  FEEDBACK_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  GITHUB_REPO: string;
  GITHUB_TOKEN?: string;
  TURNSTILE_SECRET?: string;
  FEEDBACK_DRY_RUN?: string;
};

/** A request bigger than this is not a feedback form. */
const MAX_BODY_BYTES = 16 * 1024;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

async function turnstileOk(token: string, secret: string, ip: string | null): Promise<boolean> {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!res.ok) return false;
  const out = (await res.json()) as { success?: boolean };
  return out.success === true;
}

async function feedback(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json(405, { error: "Use POST." });

  // Same-origin only: the form is the only intended client.
  const site = new URL(request.url).origin;
  if (request.headers.get("Origin") !== site) return json(403, { error: "Cross-origin requests aren't accepted." });

  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > MAX_BODY_BYTES) return json(413, { error: "That's too long to send." });

  const ip = request.headers.get("CF-Connecting-IP");
  if (env.FEEDBACK_LIMIT && ip) {
    const { success } = await env.FEEDBACK_LIMIT.limit({ key: ip });
    if (!success) return json(429, { error: "Too many reports in a short time. Try again in a minute." });
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json(413, { error: "That's too long to send." });
    raw = JSON.parse(text);
  } catch {
    return json(400, { error: "The form couldn't be read." });
  }

  const parsed = parseFeedback(raw);
  if (!parsed.ok) return json(400, { error: parsed.error });

  if (!env.TURNSTILE_SECRET || (!env.GITHUB_TOKEN && env.FEEDBACK_DRY_RUN !== "1")) {
    return json(503, { error: "Feedback isn't set up yet." });
  }
  if (!(await turnstileOk(parsed.value.token, env.TURNSTILE_SECRET, ip))) {
    return json(403, { error: "The spam check failed. Reload the page and try again." });
  }

  const issue = buildIssue(parsed.value, site);
  if (env.FEEDBACK_DRY_RUN === "1") return json(200, { dryRun: true, issue });

  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "rightidphoto-feedback",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(issue)
  });
  if (!res.ok) {
    console.error("GitHub issue creation failed", res.status, await res.text());
    return json(502, { error: "It couldn't be filed just now. Try again later." });
  }
  const created = (await res.json()) as { number: number; html_url: string };
  return json(201, { number: created.number, url: created.html_url });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/feedback") return feedback(request, env);
    if (pathname.startsWith("/api/")) return json(404, { error: "Not found." });
    return env.ASSETS.fetch(request);
  }
};
