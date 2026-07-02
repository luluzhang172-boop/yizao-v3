const ANSWER_PATTERNS = [
  /(?:\u3010\s*\u7B54\u6848\s*\u3011)\s*([A-D]{1,4}|[\u5BF9\u9519\u6B63\u786E\u9519\u8BEF\u221A\u00D7])/i,
  /(?:\u6B63\u786E\u7B54\u6848|\u53C2\u8003\u7B54\u6848|\u7B54\u6848)\s*[:\uFF1A]\s*([A-D]{1,4}|[\u5BF9\u9519\u6B63\u786E\u9519\u8BEF\u221A\u00D7])/i
];

function parseAnswer(blockText) {
  const text = String(blockText || "");

  for (const pattern of ANSWER_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    const answer = normalizeAnswer(match[1]);
    return {
      answer,
      answerLetter: /^[A-D]+$/.test(answer) ? answer : "",
      hasAnswer: Boolean(answer)
    };
  }

  return { answer: "", answerLetter: "", hasAnswer: false };
}

function normalizeAnswer(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  if (/^[A-D]{1,4}$/.test(raw)) return raw;

  const map = {
    "\u5BF9": "\u6B63\u786E",
    "\u9519": "\u9519\u8BEF",
    "\u221A": "\u6B63\u786E",
    "\u00D7": "\u9519\u8BEF",
    "\u6B63\u786E": "\u6B63\u786E",
    "\u9519\u8BEF": "\u9519\u8BEF"
  };

  return map[raw] || raw;
}

module.exports = {
  parseAnswer,
  normalizeAnswer
};
