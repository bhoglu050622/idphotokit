import { findExam, type Exam } from "../data/exams";

/** One page per exam: /exam and /exam/<slug>, written as static files at build time. */
export const EXAM_PATH_PREFIX = "/exam";

export function pathForExam(exam: Exam): string {
  return `${EXAM_PATH_PREFIX}/${exam.slug}`;
}

export function examFromPath(pathname = window.location.pathname): Exam | undefined {
  const match = pathname.replace(/\/+$/, "").toLowerCase().match(/^\/exam\/([a-z0-9-]+)$/);
  return match ? findExam(match[1]) : undefined;
}

export function isExamPath(pathname = window.location.pathname): boolean {
  return /^\/exam(\/|$)/.test(pathname.replace(/\/+$/, "") || "/");
}
