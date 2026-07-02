import questions from "../../output/questions_v2.json";
import { Question } from "../types";

type ImportedQuestion = {
  id: string;
  subject: string;
  stem: string;
  options?: string[] | Record<string, string> | null;
  answer: string;
  explanation: string;
  tags?: string[];
  difficulty?: number;
  frequencyScore?: number;
  errorRate?: number;
  source?: Question["source"];
  year?: number;
  type?: string;
  isCaseQuestion?: boolean;
};

const optionKeys = ["A", "B", "C", "D", "E", "F"];

const normalizeOptions = (options: ImportedQuestion["options"]) => {
  if (Array.isArray(options)) {
    return options.filter((option) => option.trim().length > 0);
  }

  if (options && typeof options === "object") {
    return optionKeys
      .filter((key) => typeof options[key] === "string")
      .map((key) => `${key}. ${options[key]}`);
  }

  return [];
};

const normalizeAnswer = (
  answer: string,
  options: ImportedQuestion["options"]
) => {
  if (options && typeof options === "object" && !Array.isArray(options)) {
    const normalizedKey = answer.trim().toUpperCase();
    const matched = options[normalizedKey];
    if (matched) return `${normalizedKey}. ${matched}`;
  }

  return answer;
};

const toDifficulty = (question: ImportedQuestion) => {
  if (typeof question.difficulty === "number") return question.difficulty;
  if ((question.frequencyScore ?? 0) >= 80) return 72;
  if ((question.frequencyScore ?? 0) >= 60) return 60;
  return 48;
};

export const initialQuestions: Question[] = (
  questions as unknown as ImportedQuestion[]
).map((question) => {
  const options = normalizeOptions(question.options);

  return {
    id: question.id,
    subject: question.subject,
    stem: question.stem,
    options,
    answer: normalizeAnswer(question.answer, question.options),
    explanation: question.explanation,
    tags: question.tags ?? [
      question.subject,
      question.type ?? (question.isCaseQuestion ? "case" : "imported"),
      question.year ? String(question.year) : "unknown-year"
    ],
    difficulty: toDifficulty(question),
    frequencyScore: question.frequencyScore ?? 50,
    errorRate: question.errorRate ?? 0,
    source: question.source ?? "past_exam"
  };
});
