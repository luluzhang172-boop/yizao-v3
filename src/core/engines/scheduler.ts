import { format } from "date-fns";
import { DailySchedule, ErrorRecord, Question, SRSState, UserStats } from "../../types";
import { getDueSRSQuestionIds } from "./srsEngine";

const unique = (ids: string[]) => Array.from(new Set(ids));

function getAccuracy(stats: UserStats) {
  if (stats.totalAnswered === 0) return 0.7;
  return stats.totalCorrect / stats.totalAnswered;
}

export function generateSchedule(
  questions: Question[],
  errorRecords: Record<string, ErrorRecord>,
  srsStates: Record<string, SRSState>,
  stats: UserStats,
  total = 10,
  now = Date.now()
): DailySchedule {
  const accuracy = getAccuracy(stats);
  let reviewRatio = 0.5;
  let srsRatio = 0.3;
  let newRatio = 0.2;

  if (accuracy < 0.6) {
    reviewRatio = 0.65;
    srsRatio = 0.25;
    newRatio = 0.1;
  } else if (accuracy > 0.75) {
    reviewRatio = 0.35;
    srsRatio = 0.25;
    newRatio = 0.4;
  }

  const reviewCount = Math.max(1, Math.round(total * reviewRatio));
  const srsCount = Math.max(1, Math.round(total * srsRatio));
  const newCount = Math.max(1, total - reviewCount - srsCount);

  const highErrorIds = Object.values(errorRecords)
    .filter((record) => record.wrongCount > 0 && record.errorWeight > 1)
    .sort((a, b) => b.errorWeight - a.errorWeight || b.lastWrongTime - a.lastWrongTime)
    .map((record) => record.questionId);

  const srsDueIds = getDueSRSQuestionIds(srsStates, now);
  const seenIds = new Set([
    ...Object.keys(errorRecords),
    ...Object.keys(srsStates),
    ...stats.attempts.map((attempt) => attempt.questionId)
  ]);
  const newIds = questions
    .filter((question) => !seenIds.has(question.id))
    .sort((a, b) => b.frequencyScore - a.frequencyScore)
    .map((question) => question.id);

  const fallbackNewIds = questions
    .slice()
    .sort((a, b) => b.frequencyScore - a.frequencyScore)
    .map((question) => question.id);

  return {
    date: format(now, "yyyy-MM-dd"),
    reviewQuestionIds: unique(highErrorIds).slice(0, reviewCount),
    srsQuestionIds: unique(srsDueIds).slice(0, srsCount),
    newQuestionIds: unique([...newIds, ...fallbackNewIds]).slice(0, newCount)
  };
}
