import { Subject } from "./question";

export type LearningMode =
  | "daily"
  | "subject"
  | "frequency"
  | "wrong"
  | "level"
  | "weak_drill";

export type DailyPlanStepType = "review" | "new_level" | "weak_drill" | "summary";

export type DailyPlanStep = {
  id: string;
  type: DailyPlanStepType;
  title: string;
  description: string;
  questionIds: string[];
  required: boolean;
  completed: boolean;
};

export type DailyPlan = {
  date: string;
  steps: DailyPlanStep[];
  totalQuestions: number;
  completedQuestions: number;
  isCompleted: boolean;
};

export type AnswerLog = {
  questionId: string;
  correct: boolean;
  timestamp: number;
  subject: Subject;
  mode: LearningMode;
  questionType?: string;
};

export type LevelResult = {
  levelId: string;
  stars: 0 | 1 | 2 | 3;
  completedAt: number;
  accuracy: number;
};

export type LearningProgress = {
  answeredQuestionIds: string[];
  seenQuestionIds: string[];
  correctQuestionIds: string[];
  wrongQuestionIds: string[];
  answerLogs: AnswerLog[];
  xp: number;
  streak: number;
  lastStreakDate?: string;
  completedLevelIds: string[];
  levelResults: Record<string, LevelResult>;
  dailyPlans: Record<string, DailyPlan>;
  caseProgress: {
    masteredCaseIds: string[];
    weakCaseIds: string[];
  };
};

export type ErrorRecord = {
  questionId: string;
  wrongCount: number;
  correctCount: number;
  lastWrongAt: number;
  errorWeight: number;
};

export type SRSRecord = {
  questionId: string;
  interval: number;
  nextReviewAt: number;
  wrongCount: number;
  correctCount: number;
};

export type QuizSession = {
  id: string;
  mode: LearningMode;
  subject?: Subject;
  levelId?: string;
  dailyStepId?: string;
  questionIds: string[];
  currentIndex: number;
  startedAt: number;
  completedAt?: number;
  rewardGranted?: boolean;
};
