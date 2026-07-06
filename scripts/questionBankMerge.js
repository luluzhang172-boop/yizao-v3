const crypto = require("crypto");

const SUBJECTS = ["management", "pricing", "measurement", "case", "unknown"];
const TYPES = ["single_choice", "multiple_choice", "judgement", "case", "unknown"];
const OPTION_KEYS = ["A", "B", "C", "D", "E"];

function toV31Question(raw, context = {}) {
  const subject = SUBJECTS.includes(raw.subject) ? raw.subject : "unknown";
  const options = normalizeOptions(raw.options);
  const answer = String(raw.answer || "").trim();
  const normalizedAnswer = normalizeAnswer(answer);
  const type = normalizeType(raw.type, subject, options, normalizedAnswer, raw);
  const stem = cleanText(raw.stem);
  const year = Number(raw.year || context.year || 0) || undefined;
  const sourceFile = String(raw.sourceFile || context.sourceFile || "");
  const sourceHash = String(raw.sourceHash || context.sourceHash || "");
  const importBatchId = String(raw.importBatchId || context.importBatchId || "");
  const stableId = makeStableId({ subject, year, stem, options });

  return {
    id: String(raw.id || stableId),
    year,
    subject,
    type,
    stem,
    options: type === "case" ? null : options,
    answer,
    normalizedAnswer,
    explanation: cleanText(raw.explanation),
    frequencyScore: numberOr(raw.frequencyScore, 50),
    errorWeight: numberOr(raw.errorWeight, 1),
    confidence: clamp01(raw.confidence ?? raw.rawConfidence ?? 0),
    rawText: typeof raw.rawText === "string" ? raw.rawText : undefined,
    sourceFile,
    sourceFiles: normalizeSourceFiles(raw.sourceFiles, sourceFile),
    sourceHash,
    importBatchId,
    examAppearCount: numberOr(raw.examAppearCount, 1)
  };
}

function assignStableId(raw, context, legacyIndex) {
  const normalized = toV31Question({ ...raw, id: "" }, context);
  const stableId = makeStableId(normalized);
  const legacyMatch = legacyIndex && findDuplicate(legacyIndex, normalized);
  return {
    ...toV31Question({ ...raw, id: legacyMatch ? legacyMatch.id : stableId }, context),
    id: legacyMatch ? legacyMatch.id : stableId
  };
}

function mergeQuestionBank(existingQuestions, newQuestions) {
  const index = createQuestionIndex(existingQuestions.map((item) => toV31Question(item)));
  const merged = [...index.questions];
  let newQuestionCount = 0;
  let duplicateQuestionCount = 0;
  let mergedQuestionCount = 0;

  for (const incomingRaw of newQuestions) {
    const incoming = toV31Question(incomingRaw);
    const duplicate = findDuplicate(index, incoming);

    if (!duplicate) {
      merged.push(incoming);
      addToIndex(index, incoming);
      newQuestionCount += 1;
      continue;
    }

    duplicateQuestionCount += 1;
    mergedQuestionCount += 1;
    const updated = mergeDuplicateQuestion(duplicate, incoming);
    const position = merged.findIndex((item) => item.id === duplicate.id);
    if (position >= 0) merged[position] = updated;
    replaceInIndex(index, duplicate, updated);
  }

  return {
    questions: merged,
    newQuestionCount,
    duplicateQuestionCount,
    mergedQuestionCount
  };
}

function createQuestionIndex(questions) {
  const index = {
    questions: [],
    byId: new Map(),
    byStem: new Map(),
    byAnswerOptions: new Map()
  };

  questions.forEach((question) => addToIndex(index, question));
  return index;
}

function addToIndex(index, question) {
  index.questions.push(question);
  index.byId.set(question.id, question);
  const stemKey = normalizeStem(question.stem);
  if (stemKey) index.byStem.set(stemKey, question);
  const comboKey = answerOptionsKey(question);
  if (comboKey) index.byAnswerOptions.set(comboKey, question);
}

function replaceInIndex(index, oldQuestion, newQuestion) {
  index.byId.delete(oldQuestion.id);
  index.byId.set(newQuestion.id, newQuestion);
  index.byStem.set(normalizeStem(newQuestion.stem), newQuestion);
  const comboKey = answerOptionsKey(newQuestion);
  if (comboKey) index.byAnswerOptions.set(comboKey, newQuestion);
  const position = index.questions.findIndex((item) => item.id === oldQuestion.id);
  if (position >= 0) index.questions[position] = newQuestion;
}

function findDuplicate(index, question) {
  if (index.byId.has(question.id)) return index.byId.get(question.id);

  const stemKey = normalizeStem(question.stem);
  const exactStem = index.byStem.get(stemKey);
  if (exactStem) return exactStem;

  const comboKey = answerOptionsKey(question);
  const combo = comboKey ? index.byAnswerOptions.get(comboKey) : null;
  if (combo && stemSimilarity(combo.stem, question.stem) >= 0.86) return combo;

  for (const existing of index.questions) {
    if (existing.subject !== question.subject) continue;
    if (stemSimilarity(existing.stem, question.stem) >= 0.92) return existing;
  }

  return null;
}

function mergeDuplicateQuestion(existing, incoming) {
  const sourceFiles = Array.from(new Set([
    ...(existing.sourceFiles || []),
    existing.sourceFile,
    ...(incoming.sourceFiles || []),
    incoming.sourceFile
  ].filter(Boolean)));

  const better = incoming.confidence > existing.confidence ? incoming : existing;
  const options = chooseOptions(existing.options, incoming.options);
  const explanation = chooseLonger(existing.explanation, incoming.explanation);

  return {
    ...existing,
    stem: existing.stem || incoming.stem,
    options,
    answer: existing.answer || incoming.answer,
    normalizedAnswer: existing.normalizedAnswer.length ? existing.normalizedAnswer : incoming.normalizedAnswer,
    explanation,
    frequencyScore: Math.min(100, Math.max(existing.frequencyScore, incoming.frequencyScore) + 5),
    errorWeight: Math.max(existing.errorWeight, incoming.errorWeight),
    confidence: Math.max(existing.confidence, incoming.confidence),
    rawText: better.rawText || existing.rawText,
    sourceFiles,
    sourceFile: existing.sourceFile || incoming.sourceFile,
    sourceHash: existing.sourceHash || incoming.sourceHash,
    importBatchId: incoming.importBatchId || existing.importBatchId,
    examAppearCount: Math.max(numberOr(existing.examAppearCount, 1) + 1, sourceFiles.length)
  };
}

function makeStableId(question) {
  const subject = question.subject || "unknown";
  const year = question.year || "unknown";
  const normalizedOptions = normalizeOptionText(question.options);
  const seed = `${subject}|${year}|${normalizeStem(question.stem)}|${normalizedOptions}`;
  return `q_${sha256(seed).slice(0, 16)}`;
}

function normalizeStem(stem) {
  return String(stem || "")
    .replace(/^(\u7B2C)?\d{1,3}[\u9898.\u3001\uFF0E\s]+/, "")
    .replace(/^(\u7B2C)?[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u767E]+[\u9898\u3001.\uFF0E\s]+/, "")
    .replace(/20\d{2}\u5E74?/g, "")
    .replace(/[\uFF0C\u3002\u3001\u201C\u201D\u2018\u2019\uFF1A:；;,.!?！？()\uFF08\uFF09\[\]【】\s]/g, "")
    .replace(/\u7B2C.{1,4}\u9898/g, "")
    .trim();
}

function normalizeOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const output = {};
  OPTION_KEYS.forEach((key) => {
    const value = cleanText(options[key]);
    if (value) output[key] = value;
  });
  return Object.keys(output).length ? output : null;
}

function normalizeOptionText(options) {
  if (!options) return "";
  return OPTION_KEYS.map((key) => `${key}:${cleanText(options[key])}`).join("|");
}

function normalizeAnswer(answer) {
  return Array.from(new Set(String(answer || "").toUpperCase().match(/[A-E]/g) || [])).sort();
}

function normalizeType(type, subject, options, normalizedAnswer, raw) {
  if (TYPES.includes(type)) {
    if (type === "single_choice" && normalizedAnswer.length > 1) return "multiple_choice";
    return type;
  }
  if (subject === "case" || raw.isCaseQuestion || raw.subQuestions) return "case";
  if (normalizedAnswer.length > 1) return "multiple_choice";
  if (options) return "single_choice";
  return "unknown";
}

function answerOptionsKey(question) {
  const options = normalizeOptionText(question.options);
  const answer = (question.normalizedAnswer || []).join("");
  if (!options || !answer) return "";
  return `${question.subject}|${answer}|${options}`;
}

function stemSimilarity(a, b) {
  const left = normalizeStem(a);
  const right = normalizeStem(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const shorter = left.length < right.length ? left : right;
  const longer = left.length >= right.length ? left : right;
  if (longer.includes(shorter) && shorter.length >= 20) return shorter.length / longer.length;

  const gramsA = ngrams(left, 3);
  const gramsB = ngrams(right, 3);
  const intersection = [...gramsA].filter((gram) => gramsB.has(gram)).length;
  const union = new Set([...gramsA, ...gramsB]).size;
  return union ? intersection / union : 0;
}

function ngrams(value, size) {
  const result = new Set();
  for (let index = 0; index <= value.length - size; index += 1) {
    result.add(value.slice(index, index + size));
  }
  return result;
}

function chooseOptions(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const existingCount = Object.values(existing).filter(Boolean).length;
  const incomingCount = Object.values(incoming).filter(Boolean).length;
  return incomingCount > existingCount ? incoming : existing;
}

function chooseLonger(existing, incoming) {
  return String(incoming || "").length > String(existing || "").length ? incoming : existing;
}

function normalizeSourceFiles(value, fallback) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(new Set([...list, fallback].filter(Boolean)));
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, numberOr(value, 0)));
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

module.exports = {
  assignStableId,
  createQuestionIndex,
  dedupeQuestions: mergeQuestionBank,
  makeStableId,
  mergeQuestionBank,
  normalizeStem,
  toV31Question
};
