/**
 * The site is static files; this Worker only answers /api/* (wrangler.jsonc sends nothing
 * else here, so pages and assets never run it).
 *
 * POST /api/feedback files the feedback form as a GitHub issue. Reports come from people
 * without GitHub accounts, so the issue is created with the project's own token, kept as a
 * Worker secret. In front of it: a same-origin check, Cloudflare Turnstile, and a per-IP rate
 * limit — the form is public, and the issues it makes are too.
 *
 * GET /api/likes returns how many people said the tool worked for them; POST adds one, behind
 * the same origin check, Turnstile and its own rate limit. The count lives in one Durable
 * Object (LikeCounter), which applies every vote in turn, so none is lost to a race.
 * Nothing about the voter is stored: the page remembers its own vote, the counter only a
 * number.
 *
 * Secrets (`npx wrangler secret put <NAME>`): GITHUB_TOKEN, a fine-grained token with
 * Issues: read and write on the repository; TURNSTILE_SECRET, the widget's secret key.
 * Locally, put them in .dev.vars; FEEDBACK_DRY_RUN=1 there returns the issue instead of
 * filing it.
 */

import { buildIssue, parseFeedback } from "../src/utils/feedback";

type RateLimit = { limit(options: { key: string }): Promise<{ success: boolean }> };
type DurableStub = { fetch(input: string, init?: RequestInit): Promise<Response> };

type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  FEEDBACK_LIMIT?: RateLimit;
  LIKE_LIMIT?: RateLimit;
  LIKES: { idFromName(name: string): unknown; get(id: unknown): DurableStub };
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
  // Trimmed: a secret pasted into `wrangler secret put` can pick up a trailing newline.
  form.append("secret", secret.trim());
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const out = (await res.json().catch(() => ({}))) as { success?: boolean; "error-codes"?: string[]; hostname?: string };
  // The codes say which side is wrong: invalid-input-secret (HTTP 400) is the Worker's
  // secret, invalid-input-response / timeout-or-duplicate is the visitor's token.
  if (out.success !== true) console.error("Turnstile rejected", res.status, out["error-codes"], out.hostname);
  return res.ok && out.success === true;
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
      "User-Agent": "photojhat-feedback",
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

/** The one counter every vote goes to. */
const likeCounter = (env: Env) => env.LIKES.get(env.LIKES.idFromName("site"));

async function likes(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const res = await likeCounter(env).fetch("https://counter/");
    return json(200, await res.json());
  }
  if (request.method !== "POST") return json(405, { error: "Use GET or POST." });

  const site = new URL(request.url).origin;
  if (request.headers.get("Origin") !== site) return json(403, { error: "Cross-origin requests aren't accepted." });

  const ip = request.headers.get("CF-Connecting-IP");
  if (env.LIKE_LIMIT && ip) {
    const { success } = await env.LIKE_LIMIT.limit({ key: ip });
    if (!success) return json(429, { error: "Too many in a short time." });
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.slice(0, 4096) : "";
  } catch {
    return json(400, { error: "The request couldn't be read." });
  }
  if (!token) return json(400, { error: "The spam check didn't finish." });
  if (!env.TURNSTILE_SECRET) return json(503, { error: "Counting isn't set up yet." });
  if (!(await turnstileOk(token, env.TURNSTILE_SECRET, ip))) return json(403, { error: "The spam check failed." });

  const res = await likeCounter(env).fetch("https://counter/", { method: "POST" });
  return json(200, await res.json());
}

type DurableState = {
  storage: { get<T>(key: string): Promise<T | undefined>; put<T>(key: string, value: T): Promise<void> };
};

/**
 * The like count. A single instance (named "site") holds one number; Durable Objects run one
 * request at a time, so read-then-write can't lose a vote the way a key-value store would.
 */
export class LikeCounter {
  private storage: DurableState["storage"];

  constructor(state: DurableState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    let count = (await this.storage.get<number>("count")) ?? 0;
    if (request.method === "POST") {
      count += 1;
      await this.storage.put("count", count);
    }
    return Response.json({ count });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/feedback") return feedback(request, env);
    if (pathname === "/api/likes") return likes(request, env);
    if (pathname.startsWith("/api/")) return json(404, { error: "Not found." });
    return env.ASSETS.fetch(request);
  }
};
