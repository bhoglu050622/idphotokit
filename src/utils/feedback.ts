/**
 * The feedback form's contract, shared by the page (components/ui/FeedbackDialog.tsx) and the
 * Worker that files it as a GitHub issue (worker/index.ts).
 *
 * The Worker builds the issue itself from these fields — title, body and labels — so a request
 * crafted outside the form can't post arbitrary text under the project's name. Everything
 * here is plain data and string handling, so it runs in both places.
 */

export type FeedbackTopic = "spec" | "bug" | "idea";

export const TOPICS: { id: FeedbackTopic; label: string; hint: string }[] = [
  { id: "spec", label: "A document's requirements", hint: "wrong, out of date or missing" },
  { id: "bug", label: "Something isn't working", hint: "framing, background, download…" },
  { id: "idea", label: "An idea or anything else", hint: "" }
];

/** What can be wrong with a document's spec — each a column in specs/documents.csv, near enough. */
export const SPEC_PROBLEMS = [
  { id: "size", label: "Photo size" },
  { id: "head", label: "Head size or position" },
  { id: "background", label: "Background colour" },
  { id: "file", label: "File size or format limit" },
  { id: "source", label: "Official source is broken or out of date" },
  { id: "rejected", label: "A photo made here was rejected" },
  { id: "missing", label: "A document or country is missing" },
  { id: "other", label: "Something else" }
] as const;

export type SpecProblem = (typeof SPEC_PROBLEMS)[number]["id"];

export type FeedbackPayload = {
  topic: FeedbackTopic;
  /** Spec reports only. */
  problem?: SpecProblem;
  /** The document the page was set to, when there was one. */
  presetId?: string;
  documentTitle?: string;
  /** What the spec should say, or which document is missing. */
  expected?: string;
  /** A link to the authority's own guidance. */
  source?: string;
  details: string;
  /** The path the form was sent from. */
  page: string;
  /** Cloudflare Turnstile token. */
  token: string;
};

export const LIMITS = { details: 2000, expected: 300, source: 500, title: 120, page: 200, presetId: 40 };

export type Issue = { title: string; body: string; labels: string[] };

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";

/** A public URL, or nothing. */
function httpUrl(v: string): string {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Stops "@someone" in a report from pinging a GitHub user, and keeps text inside its quote. */
function quote(text: string): string {
  return text
    .replace(/@(?=[A-Za-z0-9])/g, "@​")
    .split("\n")
    .map(line => `> ${line}`)
    .join("\n");
}

const inline = (text: string) => text.replace(/@(?=[A-Za-z0-9])/g, "@​").replace(/\s+/g, " ");

/** Checks a submission from the page; returns the reason it is refused, or the cleaned payload. */
export function parseFeedback(raw: unknown): { ok: true; value: FeedbackPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Expected a JSON object." };
  const r = raw as Record<string, unknown>;

  const topic = TOPICS.find(t => t.id === r.topic)?.id;
  if (!topic) return { ok: false, error: "Choose what the feedback is about." };

  const problem = topic === "spec" ? SPEC_PROBLEMS.find(p => p.id === r.problem)?.id : undefined;
  if (topic === "spec" && !problem) return { ok: false, error: "Choose what is wrong with the requirements." };

  const value: FeedbackPayload = {
    topic,
    problem,
    presetId: clean(r.presetId, LIMITS.presetId) || undefined,
    documentTitle: clean(r.documentTitle, LIMITS.title) || undefined,
    expected: clean(r.expected, LIMITS.expected) || undefined,
    source: httpUrl(clean(r.source, LIMITS.source)) || undefined,
    details: clean(r.details, LIMITS.details),
    page: clean(r.page, LIMITS.page) || "/",
    token: clean(r.token, 4096)
  };

  if (!value.token) return { ok: false, error: "The spam check didn't finish. Wait a moment and try again." };
  if (problem === "missing" && !value.expected) return { ok: false, error: "Say which document is missing." };
  if (topic !== "spec" && value.details.length < 10) return { ok: false, error: "Add a few words about what happened." };
  if (topic === "spec" && !value.details && !value.expected && !value.source) {
    return { ok: false, error: "Add what it should be, a source, or a few words of detail." };
  }
  return { ok: true, value };
}

const firstLine = (text: string, max: number) => {
  const line = inline(text.split("\n")[0]);
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/** The GitHub issue for a checked submission. */
export function buildIssue(f: FeedbackPayload, site: string): Issue {
  const problem = SPEC_PROBLEMS.find(p => p.id === f.problem);
  const pageUrl = `${site}${f.page.startsWith("/") ? f.page : `/${f.page}`}`;

  let title: string;
  if (f.topic === "spec") {
    title = f.problem === "missing"
      ? `Missing document: ${firstLine(f.expected ?? "", 80)}`
      : `${inline(f.documentTitle ?? "Custom size")}: ${problem?.label ?? "requirements"}`;
  } else {
    title = firstLine(f.details, 80);
  }

  const lines: string[] = [];
  if (f.topic === "spec") {
    if (f.problem !== "missing") {
      lines.push(`**Document:** ${f.documentTitle ? inline(f.documentTitle) : "Custom size"}${f.presetId ? ` (\`${inline(f.presetId)}\`)` : ""}`);
    }
    lines.push(`**Problem:** ${problem?.label ?? "Unspecified"}`);
    if (f.expected) lines.push("", f.problem === "missing" ? "**Missing document**" : "**Should be**", quote(f.expected));
    if (f.source) lines.push("", `**Official source:** ${f.source}`);
  }
  if (f.details) lines.push("", "**Details**", quote(f.details));
  lines.push(
    "",
    "---",
    `<sub>Sent anonymously from the feedback form on ${pageUrl}</sub>`
  );

  const labels = ["feedback", f.topic === "spec" ? "spec" : f.topic === "bug" ? "bug" : "idea"];
  return { title: title.slice(0, LIMITS.title) || "Feedback", body: lines.join("\n"), labels };
}
