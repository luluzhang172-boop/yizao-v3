function parseExplanation(blockText) {
  const text = String(blockText || "");
  const match = text.match(/(?:\u3010\s*\u89E3\u6790\s*\u3011|\u53C2\u8003\u89E3\u6790|\u89E3\u6790)\s*[:\uFF1A]?\s*([\s\S]*)$/);

  if (!match) {
    return { explanation: "", hasExplanation: false };
  }

  const explanation = cleanExplanation(match[1]);
  return {
    explanation,
    hasExplanation: explanation.length >= 8
  };
}

function cleanExplanation(value) {
  return String(value || "")
    .replace(/^\s*[:\uFF1A]\s*/, "")
    .replace(/(?:\u4E0B\u4E00\u9898|\u4E0A\u4E00\u9898|\u8FD4\u56DE\u76EE\u5F55|\u626B\u7801\u67E5\u770B|\u5173\u6CE8\u516C\u4F17\u53F7|\u70B9\u51FB\u67E5\u770B).*$/s, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  parseExplanation,
  cleanExplanation
};
