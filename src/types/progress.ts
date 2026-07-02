import { Subject } from "./question";

export type LearningMode = "daily" | "subject" | "frequency" | "wrong";

export type AnswerLog = {
  questionId: string;
  correct: boolean;
  timestamp: number;
  subject: Subject;
  mode: LearningMode;
};

export type LearningProgress = {
  answeredQuestionIds: string[];
  correctQuestionIds: string[];
  wrongQuestionIds: string[];
  answerLogs: AnswerLog[];
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
  questionIds: string[];
  currentIndex: number;
  startedAt: number;
  completedAt?: number;
};
