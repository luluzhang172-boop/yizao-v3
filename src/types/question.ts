export type Subject =
  | "management"
  | "pricing"
  | "measurement"
  | "case"
  | "unknown";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "judgement"
  | "case"
  | "unknown";

export interface Question {
  id: string;
  year?: number;
  subject: Subject;
  type: QuestionType;
  stem: string;
  options: Record<string, string> | null;
  answer: string;
  normalizedAnswer: string[];
  explanation: string;
  frequencyScore: number;
  errorWeight: number;
  confidence: number;
  rawText?: string;
  sourceFile?: string;
  sourceFiles?: string[];
  sourceHash?: string;
  importBatchId?: string;
  examAppearCount?: number;
  subQuestions?: string[];
}

export type QuestionBankStats = {
  total: number;
  validChoice: number;
  singleChoice: number;
  multipleChoice: number;
  judgement: number;
  case: number;
  noOptions: number;
  hasEOption: number;
  deMergedFixCount: number;
  lowConfidence: number;
  bySubject: Record<string, number>;
  byYear: Record<string, number>;
  avgConfidence: number;
  duplicateCount: number;
};

export const subjectLabels: Record<Subject, string> = {
  management: "管理",
  pricing: "计价",
  measurement: "计量",
  case: "案例",
  unknown: "未分类"
};

export const subjects: Subject[] = [
  "management",
  "pricing",
  "measurement",
  "case",
  "unknown"
];
