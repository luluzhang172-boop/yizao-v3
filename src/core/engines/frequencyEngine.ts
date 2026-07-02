import { ErrorRecord, Question } from "../../types";

const sourceWeight: Record<Question["source"], number> = {
  past_exam: 100,
  mock: 65,
  textbook: 45
};

export function calculateErrorRate(record?: ErrorRecord) {
  if (!record) return 0;
  const total = record.correctCount + record.wrongCount;
  return total === 0 ? 0 : Math.round((record.wrongCount / total) * 100);
}

export function calculateFrequencyScore(question: Question, errorRate: number) {
  const score =
    sourceWeight[question.source] * 0.5 +
    errorRate * 0.3 +
    question.difficulty * 0.2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function refreshQuestionFrequency(
  questions: Question[],
  records: Record<string, ErrorRecord>
) {
  return questions.map((question) => {
    const errorRate = calculateErrorRate(records[question.id]);
    return {
      ...question,
      errorRate,
      frequencyScore: calculateFrequencyScore(question, errorRate)
    };
  });
}
