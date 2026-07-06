import { ErrorRecord, LearningMode } from "../types/progress";
import { Question, Subject } from "../types/question";
import { canUseInLevel } from "./questionBank";

type CreateSessionInput = {
  questions: Question[];
  mode: LearningMode;
  subject?: Subject;
  levelId?: string;
  dailyStepId?: string;
  questionIds?: string[];
  limit?: number;
  answeredQuestionIds?: string[];
  wrongQuestionIds?: string[];
  errorRecords?: Record<string, ErrorRecord>;
  srsDueQuestionIds?: string[];
};

const defaultLimit = 30;

const uniqueById = (questions: Question[]) => {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
};

const preferUnanswered = (questions: Question[], answeredIds: Set<string>) => [
  ...questions.filter((question) => !answeredIds.has(question.id)),
  ...questions.filter((question) => answeredIds.has(question.id))
];

export function createSession({
  questions,
  mode,
  subject,
  levelId,
  dailyStepId,
  questionIds: fixedQuestionIds,
  limit = defaultLimit,
  answeredQuestionIds = [],
  wrongQuestionIds = [],
  errorRecords = {},
  srsDueQuestionIds = []
}: CreateSessionInput) {
  if (fixedQuestionIds?.length) {
    const objectiveIds = new Set(questions.filter(canUseInLevel).map((question) => question.id));
    return {
      id: `${mode}-${levelId ?? subject ?? "fixed"}-${Date.now()}`,
      mode,
      subject,
      levelId,
      dailyStepId,
      questionIds: Array.from(new Set(fixedQuestionIds))
        .filter((id) => objectiveIds.has(id))
        .slice(0, limit),
      currentIndex: 0,
      startedAt: Date.now()
    };
  }

  const answeredIds = new Set(answeredQuestionIds);
  let pool = uniqueById(questions).filter(canUseInLevel);

  if (mode === "subject" && subject) {
    pool = pool.filter((question) => question.subject === subject);
    pool = preferUnanswered(pool, answeredIds);
  }

  if (mode === "frequency") {
    pool = pool
      .filter((question) => question.frequencyScore >= 70)
      .sort((a, b) => b.frequencyScore - a.frequencyScore);
    pool = preferUnanswered(pool, answeredIds);
  }

  if (mode === "wrong" || mode === "weak_drill") {
    const wrongIds = new Set([...wrongQuestionIds, ...srsDueQuestionIds]);
    pool = pool
      .filter((question) => wrongIds.has(question.id))
      .sort(
        (a, b) =>
          (errorRecords[b.id]?.errorWeight ?? b.errorWeight) -
          (errorRecords[a.id]?.errorWeight ?? a.errorWeight)
      );
  }

  if (mode === "daily") {
    const dueIds = new Set(srsDueQuestionIds);
    const due = pool.filter((question) => dueIds.has(question.id));
    const highFrequency = pool
      .filter((question) => question.frequencyScore >= 70 && !dueIds.has(question.id))
      .sort((a, b) => b.frequencyScore - a.frequencyScore);
    const normal = preferUnanswered(
      pool.filter(
        (question) => !dueIds.has(question.id) && question.frequencyScore < 70
      ),
      answeredIds
    );
    pool = [...due, ...highFrequency, ...normal];
  }

  const questionIds = uniqueById(pool)
    .slice(0, Math.max(1, limit))
    .map((question) => question.id);

  return {
    id: `${mode}-${subject ?? "all"}-${Date.now()}`,
    mode,
      subject,
      levelId,
      dailyStepId,
      questionIds,
    currentIndex: 0,
    startedAt: Date.now()
  };
}
