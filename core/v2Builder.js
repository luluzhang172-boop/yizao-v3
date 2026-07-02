const crypto = require("crypto");
const { parseOptions, fillOptions } = require("../parser/optionParser");
const { parseAnswer } = require("../parser/answerParser");
const { parseExplanation } = require("../parser/explanationParser");
const { parseCaseQuestion } = require("../parser/caseParser");
const { calculateFrequencyScore } = require("./frequencyEngine");

function buildQuestionDraft(block) {
  if (block.subject === "case" || block.isCase) {
    return buildCaseDraft(block);
  }

  return buildChoiceDraft(block);
}

function buildChoiceDraft(block) {
  const withoutExplanation = removeExplanationTail(block.raw);
  const withoutAnswer = removeAnswerTail(withoutExplanation);
  const optionResult = parseOptions(withoutAnswer);
  const answerResult = parseAnswer(block.raw);
  const explanationResult = parseExplanation(block.raw);
  const type = detectQuestionType(answerResult.answer, optionResult.optionCompleteness);

  return normalizeQuestion({
    id: createId(block),
    year: Number(block.year) || 0,
    subject: block.subject,
    type,
    stem: cleanStem(optionResult.stem),
    options: type === "single_choice" ? fillOptions(optionResult.options) : null,
    answer: answerResult.answer,
    explanation: explanationResult.explanation,
    isCaseQuestion: false,
    subQuestions: undefined,
    frequencyScore: 0,
    errorWeight: 0,
    confidence: calculateConfidence({
      type,
      stem: optionResult.stem,
      optionCompleteness: optionResult.optionCompleteness,
      hasAnswer: answerResult.hasAnswer,
      hasExplanation: explanationResult.hasExplanation,
      subject: block.subject,
      year: block.year
    }),
    rawText: block.raw,
    _meta: {
      fileName: block.fileName,
      ordinal: block.ordinal,
      marker: block.marker,
      missingLetters: optionResult.missingLetters,
      parserPass: optionResult.parserPass
    }
  });
}

function buildCaseDraft(block) {
  const caseResult = parseCaseQuestion(block.raw);

  return normalizeQuestion({
    id: createId(block),
    year: Number(block.year) || 0,
    subject: "case",
    type: "case",
    stem: cleanStem(caseResult.stem),
    options: null,
    answer: caseResult.answer,
    explanation: caseResult.explanation,
    isCaseQuestion: true,
    subQuestions: caseResult.subQuestions,
    frequencyScore: 0,
    errorWeight: 0,
    confidence: calculateConfidence({
      type: "case",
      stem: caseResult.stem,
      hasAnswer: caseResult.hasAnswer,
      hasSubQuestions: caseResult.hasSubQuestions,
      subject: "case",
      year: block.year
    }),
    rawText: block.raw,
    _meta: {
      fileName: block.fileName,
      ordinal: block.ordinal,
      marker: block.marker,
      missingLetters: [],
      parserPass: "case-parser"
    }
  });
}

function finalizeQuestions(drafts, repeatIndex) {
  return drafts.map((draft) => {
    const frequencyScore = calculateFrequencyScore(draft, repeatIndex);
    const errorWeight = calculateErrorWeight(draft, frequencyScore);
    const { _meta, ...question } = draft;

    return normalizeQuestion({
      ...question,
      frequencyScore,
      errorWeight
    });
  });
}

function normalizeQuestion(question) {
  const normalized = {
    id: String(question.id || ""),
    year: Number(question.year) || 0,
    subject: normalizeSubject(question.subject),
    type: normalizeType(question.type),
    stem: cleanStem(question.stem),
    options: question.options === null ? null : fillOptions(question.options),
    answer: String(question.answer || "").trim(),
    explanation: String(question.explanation || "").trim(),
    isCaseQuestion: Boolean(question.isCaseQuestion),
    frequencyScore: Number(question.frequencyScore) || 0,
    errorWeight: Number(question.errorWeight) || 0,
    confidence: clamp01(question.confidence),
    rawText: String(question.rawText || "")
  };

  if (question.isCaseQuestion || question.type === "case") {
    normalized.options = null;
    normalized.subQuestions = normalizeSubQuestions(question.subQuestions);
  }

  if (question._meta) normalized._meta = question._meta;

  return normalized;
}

function normalizeSubQuestions(subQuestions) {
  return (Array.isArray(subQuestions) ? subQuestions : []).map((item) => ({
    stem: String(item && item.stem ? item.stem : "").trim(),
    answer: String(item && item.answer ? item.answer : "").trim(),
    options: item && item.options ? item.options : null
  }));
}

function calculateConfidence(input) {
  let score = 0;

  if (input.stem && input.stem.length >= 8) score += 0.22;
  if (input.subject && input.year) score += 0.1;

  if (input.type === "case") {
    if (input.hasSubQuestions) score += 0.38;
    if (input.hasAnswer) score += 0.3;
    return clamp01(score);
  }

  score += Math.min(0.38, (input.optionCompleteness || 0) * 0.38);
  if (input.hasAnswer) score += 0.18;
  if (input.hasExplanation) score += 0.12;

  return clamp01(score);
}

function calculateErrorWeight(question, frequencyScore) {
  let weight = 1;
  if (question.isCaseQuestion || question.subject === "case") weight += 0.4;
  if (frequencyScore >= 80) weight += 0.3;
  if (question.confidence < 0.7) weight += 0.2;
  return Number(Math.min(2, weight).toFixed(2));
}

function detectQuestionType(answer, optionCompleteness) {
  if (/^(\u6B63\u786E|\u9519\u8BEF)$/.test(String(answer || ""))) return "judgement";
  if (optionCompleteness > 0) return "single_choice";
  return "single_choice";
}

function createId(block) {
  const seed = `${block.year}-${block.subject}-${block.ordinal}-${String(block.raw || "").slice(0, 80)}`;
  const hash = crypto.createHash("sha1").update(seed).digest("hex").slice(0, 8);
  return `${normalizeSubject(block.subject)}-${block.year}-${String(block.ordinal).padStart(3, "0")}-${hash}`;
}

function removeAnswerTail(value) {
  return String(value || "").replace(/(?:\u3010\s*\u7B54\u6848\s*\u3011|\u7B54\u6848|\u6B63\u786E\u7B54\u6848|\u53C2\u8003\u7B54\u6848)\s*[:\uFF1A]?\s*[\s\S]*$/i, "");
}

function removeExplanationTail(value) {
  return String(value || "").replace(/(?:\u3010\s*\u89E3\u6790\s*\u3011|\u89E3\u6790|\u53C2\u8003\u89E3\u6790)\s*[:\uFF1A]?\s*[\s\S]*$/i, "");
}

function cleanStem(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^\s*[:\uFF1A]\s*/, "")
    .trim();
}

function normalizeSubject(subject) {
  return ["management", "pricing", "measurement", "case"].includes(subject) ? subject : "management";
}

function normalizeType(type) {
  return ["single_choice", "case", "judgement"].includes(type) ? type : "single_choice";
}

function clamp01(value) {
  return Number(Math.max(0, Math.min(1, Number(value) || 0)).toFixed(2));
}

module.exports = {
  buildQuestionDraft,
  finalizeQuestions,
  calculateConfidence,
  normalizeQuestion
};
