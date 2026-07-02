export type Subject =
  | "management"
  | "pricing"
  | "measurement"
  | "case"
  | "unknown";

export type QuestionType = "single_choice" | "case" | "judgement" | "unknown";

export interface Question {
  id: string;
  year?: number;
  subject: Subject;
  type: QuestionType;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  } | null;
  answer: string;
  explanation: string;
  frequencyScore: number;
  errorWeight: number;
  confidence: number;
  rawText?: string;
}

export type QuestionBankStats = {
  total: number;
  validChoice: number;
  noOptions: number;
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
