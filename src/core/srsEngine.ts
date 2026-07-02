import { SRSRecord } from "../types/progress";

const dayMs = 24 * 60 * 60 * 1000;

export function updateSRSRecord(
  records: Record<string, SRSRecord>,
  questionId: string,
  correct: boolean,
  now = Date.now()
) {
  const current = records[questionId] ?? {
    questionId,
    interval: 1,
    nextReviewAt: now,
    wrongCount: 0,
    correctCount: 0
  };

  const interval = correct ? Math.max(1, current.interval * 2) : 1;

  return {
    ...records,
    [questionId]: {
      questionId,
      interval,
      nextReviewAt: now + interval * dayMs,
      wrongCount: current.wrongCount + (correct ? 0 : 1),
      correctCount: current.correctCount + (correct ? 1 : 0)
    }
  };
}

export function getDueSRSQuestionIds(
  records: Record<string, SRSRecord>,
  now = Date.now()
) {
  return Object.values(records)
    .filter((record) => record.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
    .map((record) => record.questionId);
}
