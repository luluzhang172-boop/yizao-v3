import { addDays } from "date-fns";
import { SRSState } from "../../types";

export function updateSRSState(
  states: Record<string, SRSState>,
  questionId: string,
  correct: boolean,
  now = Date.now()
) {
  const current = states[questionId] ?? {
    questionId,
    interval: 1,
    nextReview: now,
    easeFactor: 2
  };

  const interval = correct
    ? Math.max(1, Math.round(current.interval * current.easeFactor))
    : 1;
  const easeFactor = correct
    ? Math.min(2.8, current.easeFactor + 0.08)
    : Math.max(1.3, current.easeFactor - 0.18);

  return {
    ...states,
    [questionId]: {
      questionId,
      interval,
      easeFactor,
      nextReview: addDays(now, interval).getTime()
    }
  };
}

export function getDueSRSQuestionIds(
  states: Record<string, SRSState>,
  now = Date.now()
) {
  return Object.values(states)
    .filter((state) => state.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview)
    .map((state) => state.questionId);
}
