import { create } from "zustand";
import type { FeedbackTopic, SpecProblem } from "../utils/feedback";

export type FeedbackOpening = { topic?: FeedbackTopic; problem?: SpecProblem };

type FeedbackState = {
  open: boolean;
  /** What the form starts on, from whichever link opened it. */
  opening: FeedbackOpening;
  /** Bumped on every open, so the form remounts empty rather than showing the last report. */
  session: number;
  show: (opening?: FeedbackOpening) => void;
  close: () => void;
};

export const useFeedback = create<FeedbackState>(set => ({
  open: false,
  opening: {},
  session: 0,
  show: (opening = {}) => set(s => ({ open: true, opening, session: s.session + 1 })),
  close: () => set({ open: false })
}));
