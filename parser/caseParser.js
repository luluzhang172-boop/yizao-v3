const { cleanExplanation } = require("./explanationParser");

function parseCaseQuestion(blockText) {
  const raw = String(blockText || "").trim();
  const answerStart = findAnswerStart(raw);
  const questionPart = answerStart >= 0 ? raw.slice(0, answerStart).trim() : raw;
  const answerPart = answerStart >= 0 ? raw.slice(answerStart).trim() : "";
  const problemStart = findProblemStart(questionPart);

  const stem = cleanCaseText(problemStart >= 0 ? questionPart.slice(0, problemStart) : questionPart);
  const problemPart = problemStart >= 0 ? questionPart.slice(problemStart) : "";
  const subQuestions = buildSubQuestions(problemPart, answerPart);
  const explanation = cleanExplanation(answerPart.replace(/^.*?[\u3011:：]/, ""));

  return {
    stem,
    subQuestions,
    answer: summarizeCaseAnswer(subQuestions, explanation),
    explanation,
    hasAnswer: Boolean(explanation || subQuestions.some((item) => item.answer)),
    hasSubQuestions: subQuestions.length > 0
  };
}

function buildSubQuestions(problemPart, answerPart) {
  const questions = splitSubQuestionText(problemPart);
  const answers = splitAnswerText(answerPart);

  if (questions.length === 0 && problemPart.trim()) {
    questions.push(cleanCaseText(problemPart));
  }

  return questions.map((stem, index) => ({
    stem,
    answer: answers[index] || "",
    options: null
  }));
}

function splitSubQuestionText(value) {
  const text = String(value || "")
    .replace(/^\s*\u3010?\u95EE\u9898\u3011?\s*[:\uFF1A]?/, "")
    .trim();

  return splitNumberedItems(text)
    .map(cleanCaseText)
    .filter(Boolean);
}

function splitAnswerText(value) {
  const text = String(value || "")
    .replace(/^\s*(?:\u3010\s*\u53C2\u8003\u7B54\u6848\s*\u3011|\u53C2\u8003\u7B54\u6848|\u7B54\u6848|\u89E3\u6790)\s*[:\uFF1A]?/, "")
    .trim();

  const byQuestion = text.split(/(?:^|\n|\s|[;；。])\u95EE\u9898\s*\d+\s*[:\uFF1A]/).map(cleanCaseText).filter(Boolean);
  if (byQuestion.length > 1) return byQuestion;

  return splitNumberedItems(text).map(cleanCaseText).filter(Boolean);
}

function splitNumberedItems(text) {
  const source = String(text || "").trim();
  if (!source) return [];

  const markerRe = /(?:^|\n|\s|[;；。])(?:[\uFF08(]\s*(\d{1,2})\s*[\uFF09)]|(\d{1,2})\s*[.\uFF0E\u3001])/g;
  const matches = [];
  let match;

  while ((match = markerRe.exec(source)) !== null) {
    matches.push({ index: match.index, end: markerRe.lastIndex });
  }

  if (matches.length === 0) return source ? [source] : [];

  return matches.map((item, index) => {
    const next = matches[index + 1];
    return source.slice(item.end, next ? next.index : source.length);
  });
}

function findProblemStart(text) {
  const patterns = [/\u3010\s*\u95EE\u9898\s*\u3011/, /\u95EE\u9898\s*[:\uFF1A]/, /\u95EE\u9898\s*1\s*[:\uFF1A]/];
  const indexes = patterns.map((pattern) => String(text || "").search(pattern)).filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

function findAnswerStart(text) {
  const patterns = [/\u3010\s*\u53C2\u8003\u7B54\u6848\s*\u3011/, /\u53C2\u8003\u7B54\u6848\s*[:\uFF1A]/, /\u3010\s*\u7B54\u6848\s*\u3011/, /\u7B54\u6848\s*[:\uFF1A]/, /\u89E3\u6790\s*[:\uFF1A]/];
  const indexes = patterns.map((pattern) => String(text || "").search(pattern)).filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

function summarizeCaseAnswer(subQuestions, explanation) {
  const answered = subQuestions.filter((item) => item.answer).length;
  if (answered > 0) return `subQuestions:${answered}`;
  return explanation ? "see_explanation" : "";
}

function cleanCaseText(value) {
  return String(value || "")
    .replace(/\u5B66\u5458\u4E13\u7528\s*\u8BF7\u52FF\u5916\u6CC4/g, " ")
    .replace(/\u7B2C\s*\d+\s*\u9875\s*\u5171\s*\d+\s*\u9875/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  parseCaseQuestion
};
