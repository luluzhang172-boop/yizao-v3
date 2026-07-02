import { ErrorRecord, ErrorType } from "../../types";

const inferErrorType = (selected: string, answer: string): ErrorType => {
  if (!selected) return "memory";
  if (/\d/.test(selected) || /\d/.test(answer)) return "calculation";
  return "concept";
};

export function updateErrorRecord(
  records: Record<string, ErrorRecord>,
  questionId: string,
  correct: boolean,
  selected: string,
  answer: string,
  now = Date.now()
) {
  const existing = records[questionId] ?? {
    questionId,
    wrongCount: 0,
    correctCount: 0,
    lastWrongTime: 0,
    errorType: inferErrorType(selected, answer),
    errorWeight: 1
  };

  const next: ErrorRecord = correct
    ? {
        ...existing,
        correctCount: existing.correctCount + 1,
        errorWeight: Math.max(1, existing.errorWeight - 1)
      }
    : {
        ...existing,
        wrongCount: existing.wrongCount + 1,
        lastWrongTime: now,
        errorType: inferErrorType(selected, answer),
        errorWeight: Math.min(10, existing.errorWeight + 1)
      };

  if (next.wrongCount === 0 && next.errorWeight <= 1) {
    const { [questionId]: _ignored, ...rest } = records;
    return rest;
  }

  return {
    ...records,
    [questionId]: next
  };
}
