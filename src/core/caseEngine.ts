import { LearningProgress } from "../types/progress";
import { Question } from "../types/question";
import { isCaseQuestion } from "./questionBank";

export function getCaseQuestions(questions: Question[]) {
  return questions.filter(isCaseQuestion);
}

export function getNextCaseQuestion(
  questions: Question[],
  progress: LearningProgress
) {
  const mastered = new Set(progress.caseProgress.masteredCaseIds);
  const weak = new Set(progress.caseProgress.weakCaseIds);
  return (
    getCaseQuestions(questions).find(
      (question) => !mastered.has(question.id) && !weak.has(question.id)
    ) ?? getCaseQuestions(questions)[0]
  );
}

export function getCaseStats(questions: Question[], progress: LearningProgress) {
  const total = getCaseQuestions(questions).length;
  return {
    total,
    mastered: progress.caseProgress.masteredCaseIds.length,
    weak: progress.caseProgress.weakCaseIds.length
  };
}
