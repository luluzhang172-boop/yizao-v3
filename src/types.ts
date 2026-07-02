export type ErrorType = "concept" | "memory" | "calculation" | "careless";

export type ErrorRecord = {
  questionId: string;
  wrongCount: number;
  correctCount: number;
  lastWrongTime: number;
  errorType: ErrorType;
  errorWeight: number;
};

export type Question = {
  id: string;
  subject: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  tags: string[];
  difficulty: number;
  frequencyScore: number;
  errorRate: number;
  source: "past_exam" | "mock" | "textbook";
};

export type SRSState = {
  questionId: string;
  interval: number;
  nextReview: number;
  easeFactor: number;
};

export type DailySchedule = {
  date: string;
  reviewQuestionIds: string[];
  srsQuestionIds: string[];
  newQuestionIds: string[];
};

export type AttemptRecord = {
  questionId: string;
  correct: boolean;
  mode: "review" | "quiz";
  timestamp: number;
};

export type UserStats = {
  totalAnswered: number;
  totalCorrect: number;
  streakDays: number;
  attempts: AttemptRecord[];
};
