import rawQuestions from "../data/questions_master.json";
import {
  Question,
  QuestionBankStats,
  QuestionType,
  Subject
} from "../types/question";

type RawQuestion = Record<string, unknown>;

const optionKeys = ["A", "B", "C", "D", "E"];

const subjectAliases: Record<string, Subject> = {
  management: "management",
  pricing: "pricing",
  measurement: "measurement",
  case: "case",
  管理: "management",
  造价管理: "management",
  计价: "pricing",
  工程计价: "pricing",
  计量: "measurement",
  技术与计量: "measurement",
  案例: "case",
  案例分析: "case"
};

const normalizeSubject = (value: unknown): Subject => {
  const raw = String(value ?? "").trim();
  return subjectAliases[raw] ?? "unknown";
};

export const normalizeAnswerLetters = (value: unknown) => {
  const raw = String(value ?? "")
    .toUpperCase()
    .replace(/[，,、\s;；/|]+/g, "");
  return Array.from(new Set(raw.match(/[A-E]/g) ?? [])).sort();
};

const isJudgementOptions = (options: Question["options"]) => {
  if (!options) return false;
  const values = Object.values(options).map((value) => value.trim());
  if (values.length !== 2) return false;
  return values.every((value) =>
    ["正确", "错误", "对", "错", "是", "否"].includes(value)
  );
};

const inferType = (
  rawType: unknown,
  subject: Subject,
  options: Question["options"],
  normalizedAnswer: string[],
  raw: RawQuestion
): QuestionType => {
  const type = String(rawType ?? "").trim();
  if (type === "multiple_choice") return "multiple_choice";
  if (type === "single_choice") {
    return normalizedAnswer.length > 1 ? "multiple_choice" : "single_choice";
  }
  if (type === "judgement" || isJudgementOptions(options)) return "judgement";
  if (type === "case" || subject === "case" || raw.subQuestions) return "case";
  if (!options) return "case";
  if (normalizedAnswer.length > 1) return "multiple_choice";
  if (normalizedAnswer.length === 1) return "single_choice";
  return "unknown";
};

const numberOr = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitMergedOptionText = (text: string) => {
  const normalized = text.replace(
    /(^|[ \t\r\n（(])([A-E])[ \t\r\n]*(?:[.)．、:：]|[）)]|[ \t\r\n]+)/g,
    (_match, prefix: string, key: string) => `${prefix}@@${key}@@`
  );
  const marker = /@@([A-E])@@/g;
  const matches = Array.from(normalized.matchAll(marker));
  if (matches.length <= 1) return null;

  const result: Record<string, string> = {};
  matches.forEach((match, index) => {
    const key = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const value = normalized.slice(start, end).trim();
    if (value) result[key] = value;
  });

  return result;
};

export const normalizeOptions = (
  rawOptions: unknown,
  rawText?: unknown
): { options: Question["options"]; deMergedFixCount: number } => {
  const output: Record<string, string> = {};
  let deMergedFixCount = 0;

  if (Array.isArray(rawOptions)) {
    rawOptions.forEach((value, index) => {
      const key = optionKeys[index];
      const text = String(value ?? "").trim();
      if (key && text) output[key] = text;
    });
  } else if (rawOptions && typeof rawOptions === "object") {
    const source = rawOptions as Record<string, unknown>;
    optionKeys.forEach((key) => {
      const value = String(source[key] ?? "").trim();
      if (!value) return;
      const split = splitMergedOptionText(`${key}. ${value}`);
      if (split && Object.keys(split).length > 1) {
        Object.assign(output, split);
        deMergedFixCount += 1;
      } else {
        output[key] = value;
      }
    });
  }

  const textFallback = splitMergedOptionText(String(rawText ?? ""));
  if (textFallback) {
    optionKeys.forEach((key) => {
      if (!output[key] && textFallback[key]) output[key] = textFallback[key];
    });
  }

  return {
    options: Object.keys(output).length >= 2 ? output : null,
    deMergedFixCount
  };
};

const makeFallbackId = (question: Pick<Question, "subject" | "year" | "stem">) => {
  const stemHash = Array.from(question.stem).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0
  );
  return `${question.subject}-${question.year ?? "unknown"}-${stemHash.toString(16)}`;
};

export function normalizeQuestion(raw: RawQuestion, index = 0): (Question & { deMergedFixCount?: number }) | null {
  const stem = String(raw.stem ?? "").trim();
  if (!stem) return null;

  const subject = normalizeSubject(raw.subject);
  const { options, deMergedFixCount } = normalizeOptions(raw.options, raw.rawText);
  const normalizedAnswer = normalizeAnswerLetters(raw.answer);
  const year = raw.year == null ? undefined : numberOr(raw.year, 0);
  const question: Question & { deMergedFixCount?: number } = {
    id: String(raw.id ?? "").trim(),
    year: year || undefined,
    subject,
    type: inferType(raw.type, subject, options, normalizedAnswer, raw),
    stem,
    options,
    answer: String(raw.answer ?? "").trim(),
    normalizedAnswer,
    explanation: String(raw.explanation ?? "").trim(),
    frequencyScore: numberOr(raw.frequencyScore, 50),
    errorWeight: numberOr(raw.errorWeight, 1),
    confidence: numberOr(raw.confidence ?? raw.rawConfidence, 0),
    rawText: typeof raw.rawText === "string" ? raw.rawText : undefined,
    subQuestions: Array.isArray(raw.subQuestions)
      ? raw.subQuestions.map((item) => String(item).trim()).filter(Boolean)
      : undefined,
    deMergedFixCount
  };

  if (isCaseQuestion(question)) {
    question.type = "case";
    question.options = null;
  }

  question.id = question.id || `${makeFallbackId(question)}-${index}`;
  return question;
}

export function dedupeQuestions(questions: Question[]) {
  const seenIds = new Map<string, number>();
  let duplicateCount = 0;

  return {
    questions: questions.map((question) => {
      const count = seenIds.get(question.id) ?? 0;
      seenIds.set(question.id, count + 1);
      if (count === 0) return question;
      duplicateCount += 1;
      return {
        ...question,
        id: `${question.id}__dup_${count + 1}`
      };
    }),
    duplicateCount
  };
}

export function validateQuestions(questions: Question[]) {
  return questions.filter((question) => question.stem.trim().length > 0);
}

export function getQuestionStats(
  questions: Array<Question & { deMergedFixCount?: number }>,
  duplicateCount = 0
): QuestionBankStats {
  const bySubject: Record<string, number> = {};
  const byYear: Record<string, number> = {};

  questions.forEach((question) => {
    bySubject[question.subject] = (bySubject[question.subject] ?? 0) + 1;
    const yearKey = question.year ? String(question.year) : "unknown";
    byYear[yearKey] = (byYear[yearKey] ?? 0) + 1;
  });

  const confidenceSum = questions.reduce(
    (sum, question) => sum + question.confidence,
    0
  );

  return {
    total: questions.length,
    validChoice: questions.filter((question) => question.options).length,
    singleChoice: questions.filter((question) => question.type === "single_choice").length,
    multipleChoice: questions.filter((question) => question.type === "multiple_choice").length,
    judgement: questions.filter((question) => question.type === "judgement").length,
    case: questions.filter((question) => question.type === "case").length,
    noOptions: questions.filter((question) => !question.options).length,
    hasEOption: questions.filter((question) => Boolean(question.options?.E)).length,
    deMergedFixCount: questions.reduce(
      (sum, question) => sum + (question.deMergedFixCount ?? 0),
      0
    ),
    lowConfidence: questions.filter((question) => question.confidence < 0.7).length,
    bySubject,
    byYear,
    avgConfidence: questions.length
      ? Math.round((confidenceSum / questions.length) * 100) / 100
      : 0,
    duplicateCount
  };
}

export function loadQuestions() {
  const normalized = (rawQuestions as RawQuestion[])
    .map((question, index) => normalizeQuestion(question, index))
    .filter((question): question is Question & { deMergedFixCount?: number } =>
      Boolean(question)
    );
  const valid = validateQuestions(normalized);
  const deduped = dedupeQuestions(valid);

  return {
    questions: deduped.questions,
    stats: getQuestionStats(deduped.questions, deduped.duplicateCount)
  };
}

export function isCaseQuestion(question: Question) {
  return (
    question.type === "case" ||
    question.subject === "case" ||
    !question.options ||
    (question.stem.length > 300 && !question.options)
  );
}

export function isObjectiveQuestion(question: Question) {
  return (
    ["single_choice", "multiple_choice", "judgement"].includes(question.type) &&
    Boolean(question.options) &&
    question.stem.trim().length > 0 &&
    !isCaseQuestion(question)
  );
}

export function canUseInLevel(question: Question) {
  return isObjectiveQuestion(question);
}
