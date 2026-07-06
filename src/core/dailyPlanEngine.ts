import { format } from "date-fns";
import { DailyPlan, DailyPlanStep } from "../types/progress";
import { ErrorRecord, LearningProgress, SRSRecord } from "../types/progress";
import { Question } from "../types/question";
import { canUseInLevel } from "./questionBank";
import { getNextNewQuestions } from "./progressEngine";
import { getDueSRSQuestionIds } from "./srsEngine";

const todayKey = (now = new Date()) => format(now, "yyyy-MM-dd");

const sumQuestionCount = (steps: DailyPlanStep[]) =>
  steps.reduce((sum, step) => sum + step.questionIds.length, 0);

export function refreshDailyPlanStatus(
  plan: DailyPlan,
  answeredQuestionIds: string[]
): DailyPlan {
  const answered = new Set(answeredQuestionIds);
  const steps = plan.steps.map((step) => {
    if (step.type === "summary") return step;
    if (step.completed) return step;
    if (step.questionIds.length === 0 && !step.required) {
      return { ...step, completed: true };
    }
    const completed =
      step.questionIds.length > 0 &&
      step.questionIds.every((questionId) => answered.has(questionId));
    return { ...step, completed };
  });
  const completedQuestions = steps.reduce(
    (sum, step) =>
      sum + step.questionIds.filter((questionId) => answered.has(questionId)).length,
    0
  );
  const isCompleted = steps.every((step) => step.completed);

  return {
    ...plan,
    steps,
    completedQuestions,
    isCompleted
  };
}

export function createDailyPlan({
  questions,
  progress,
  srsRecords,
  errorRecords,
  now = new Date()
}: {
  questions: Question[];
  progress: LearningProgress;
  srsRecords: Record<string, SRSRecord>;
  errorRecords: Record<string, ErrorRecord>;
  now?: Date;
}): DailyPlan {
  const date = todayKey(now);
  const dueSet = new Set(getDueSRSQuestionIds(srsRecords, now.getTime()));
  const dueReviewIds = questions
    .filter((question) => dueSet.has(question.id) && canUseInLevel(question))
    .slice(0, 10)
    .map((question) => question.id);

  const newQuestionIds = getNextNewQuestions({
    questions,
    progress,
    limit: 10
  }).map((question) => question.id);

  const wrong = new Set(progress.wrongQuestionIds);
  const weakQuestionIds = questions
    .filter((question) => wrong.has(question.id) && canUseInLevel(question))
    .sort((a, b) => {
      const weightDiff =
        (errorRecords[b.id]?.errorWeight ?? b.errorWeight) -
        (errorRecords[a.id]?.errorWeight ?? a.errorWeight);
      if (weightDiff !== 0) return weightDiff;
      return b.frequencyScore - a.frequencyScore;
    })
    .slice(0, 5)
    .map((question) => question.id);

  const steps: DailyPlanStep[] = [
    {
      id: `${date}-review`,
      type: "review",
      title: "到期复习",
      description: dueReviewIds.length
        ? `先清理 ${dueReviewIds.length} 道到期记忆题`
        : "今天没有到期复习，可以直接进入新关卡",
      questionIds: dueReviewIds,
      required: false,
      completed: dueReviewIds.length === 0
    },
    {
      id: `${date}-new-level`,
      type: "new_level",
      title: "今日新关卡",
      description: newQuestionIds.length
        ? `完成 ${newQuestionIds.length} 道未做过的新题`
        : "普通新题已推进完，请进入复习或案例训练",
      questionIds: newQuestionIds,
      required: newQuestionIds.length > 0,
      completed: newQuestionIds.length === 0
    },
    {
      id: `${date}-weak-drill`,
      type: "weak_drill",
      title: "高频错题强化",
      description: weakQuestionIds.length
        ? `修复 ${weakQuestionIds.length} 道高权重错题`
        : "暂无高频错题，今天保持住",
      questionIds: weakQuestionIds,
      required: false,
      completed: weakQuestionIds.length === 0
    },
    {
      id: `${date}-summary`,
      type: "summary",
      title: "今日总结",
      description: "查看今日完成、正确率、XP 和连续学习",
      questionIds: [],
      required: true,
      completed: false
    }
  ];

  return refreshDailyPlanStatus(
    {
      date,
      steps,
      totalQuestions: sumQuestionCount(steps),
      completedQuestions: 0,
      isCompleted: false
    },
    progress.answeredQuestionIds
  );
}

export function getOrCreateDailyPlan({
  questions,
  progress,
  srsRecords,
  errorRecords,
  now = new Date()
}: {
  questions: Question[];
  progress: LearningProgress;
  srsRecords: Record<string, SRSRecord>;
  errorRecords: Record<string, ErrorRecord>;
  now?: Date;
}) {
  const date = todayKey(now);
  const existing = progress.dailyPlans[date];
  if (existing) {
    return refreshDailyPlanStatus(existing, progress.answeredQuestionIds);
  }

  return createDailyPlan({ questions, progress, srsRecords, errorRecords, now });
}

export function getNextDailyStep(plan: DailyPlan) {
  return plan.steps.find((step) => !step.completed);
}
