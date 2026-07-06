import { LearningProgress } from "../types/progress";
import { Question, Subject, subjects } from "../types/question";
import { canUseInLevel } from "./questionBank";

const unique = (ids: string[]) => Array.from(new Set(ids));

export function getAnsweredQuestionIds(progress: LearningProgress) {
  return unique(progress.answeredQuestionIds);
}

export function getNewQuestionCursor(
  questions: Question[],
  progress: LearningProgress,
  subject?: Subject
) {
  const pool = questions.filter(
    (question) => canUseInLevel(question) && (!subject || question.subject === subject)
  );
  const answered = new Set(progress.answeredQuestionIds);
  const completed = pool.filter((question) => answered.has(question.id)).length;

  return {
    subject,
    completed,
    total: pool.length,
    remaining: Math.max(0, pool.length - completed)
  };
}

function getLowestProgressSubject(questions: Question[], progress: LearningProgress) {
  const candidates = subjects.filter(
    (subject): subject is Exclude<Subject, "case" | "unknown"> =>
      subject !== "case" && subject !== "unknown"
  );

  return candidates
    .map((subject) => getNewQuestionCursor(questions, progress, subject))
    .filter((item) => item.remaining > 0)
    .sort((a, b) => {
      const rateA = a.total ? a.completed / a.total : 1;
      const rateB = b.total ? b.completed / b.total : 1;
      if (rateA !== rateB) return rateA - rateB;
      return b.remaining - a.remaining;
    })[0]?.subject;
}

export function getNextNewQuestions({
  questions,
  progress,
  subject,
  limit
}: {
  questions: Question[];
  progress: LearningProgress;
  subject?: Subject;
  limit: number;
}) {
  const targetSubject = subject ?? getLowestProgressSubject(questions, progress);
  const answered = new Set(progress.answeredQuestionIds);
  const seen = new Set(progress.seenQuestionIds);

  return questions
    .filter((question) => {
      if (!canUseInLevel(question)) return false;
      if (targetSubject && question.subject !== targetSubject) return false;
      if (answered.has(question.id)) return false;
      if (seen.has(question.id)) return false;
      return true;
    })
    .sort((a, b) => {
      const scoreDiff = b.frequencyScore - a.frequencyScore;
      if (scoreDiff !== 0) return scoreDiff;
      return (b.year ?? 0) - (a.year ?? 0);
    })
    .slice(0, limit);
}

export function markQuestionsAsSeen(
  progress: LearningProgress,
  questionIds: string[]
): LearningProgress {
  return {
    ...progress,
    seenQuestionIds: unique([...progress.seenQuestionIds, ...questionIds])
  };
}

export function markQuestionsAsAnswered(
  progress: LearningProgress,
  questionIds: string[]
): LearningProgress {
  return {
    ...progress,
    answeredQuestionIds: unique([...progress.answeredQuestionIds, ...questionIds])
  };
}
