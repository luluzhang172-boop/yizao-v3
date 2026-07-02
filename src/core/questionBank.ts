import rawQuestions from "../../output/questions_v2.json";
import {
  Question,
  QuestionBankStats,
  QuestionType,
  Subject
} from "../types/question";

type RawQuestion = Record<string, unknown>;

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

const normalizeType = (value: unknown, subject: Subject): QuestionType => {
  const raw = String(value ?? "").trim();
  if (raw === "single_choice") return "single_choice";
  if (raw === "case" || subject === "case") return "case";
  if (raw === "judgement") return "judgement";
  return "unknown";
};

const normalizeOptions = (value: unknown): Question["options"] => {
  if (Array.isArray(value)) {
    const [A, B, C, D] = value.map((item) => String(item ?? "").trim());
    if (A && B && C && D) return { A, B, C, D };
    return null;
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const A = String(source.A ?? "").trim();
    const B = String(source.B ?? "").trim();
    const C = String(source.C ?? "").trim();
    const D = String(source.D ?? "").trim();
    if (A && B && C && D) return { A, B, C, D };
  }

  return null;
};

const normalizeAnswer = (value: unknown, options: Question["options"]) => {
  const answer = String(value ?? "").trim().toUpperCase();
  if (options && ["A", "B", "C", "D"].includes(answer)) return answer;
  return String(value ?? "").trim();
};

const numberOr = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const makeFallbackId = (question: Pick<Question, "subject" | "year" | "stem">) => {
  const stemHash = Array.from(question.stem).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0
  );
  return `${question.subject}-${question.year ?? "unknown"}-${stemHash.toString(16)}`;
};

export function normalizeQuestion(raw: RawQuestion, index = 0): Question | null {
  const stem = String(raw.stem ?? "").trim();
  if (!stem) return null;

  const subject = normalizeSubject(raw.subject);
  const options = normalizeOptions(raw.options);
  const year = raw.year == null ? undefined : numberOr(raw.year, 0);
  const question: Question = {
    id: String(raw.id ?? "").trim(),
    year: year || undefined,
    subject,
    type: normalizeType(raw.type, subject),
    stem,
    options,
    answer: normalizeAnswer(raw.answer, options),
    explanation: String(raw.explanation ?? "").trim(),
    frequencyScore: numberOr(raw.frequencyScore, 50),
    errorWeight: numberOr(raw.errorWeight, 1),
    confidence: numberOr(raw.confidence ?? raw.rawConfidence, 0),
    rawText: typeof raw.rawText === "string" ? raw.rawText : undefined
  };

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
  questions: Question[],
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
    noOptions: questions.filter((question) => !question.options).length,
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
    .filter((question): question is Question => Boolean(question));
  const valid = validateQuestions(normalized);
  const deduped = dedupeQuestions(valid);

  return {
    questions: deduped.questions,
    stats: getQuestionStats(deduped.questions, deduped.duplicateCount)
  };
}
