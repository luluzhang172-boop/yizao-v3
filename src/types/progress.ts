import { Subject } from "./question";

export type LearningMode = "daily" | "subject" | "frequency" | "wrong" | "level";

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
  correctQuestionIds: string[];
  wrongQuestionIds: string[];
  answerLogs: AnswerLog[];
  xp: number;
  streak: number;
  lastStreakDate?: string;
  completedLevelIds: string[];
  levelResults: Record<string, LevelResult>;
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
  questionIds: string[];
  currentIndex: number;
  startedAt: number;
  completedAt?: number;
  rewardGranted?: boolean;
};
