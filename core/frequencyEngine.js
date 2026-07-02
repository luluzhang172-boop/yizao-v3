function buildRepeatIndex(questions) {
  const map = new Map();

  for (const question of questions) {
    const key = normalizeStem(question.stem);
    if (!key) continue;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(question.year);
  }

  return map;
}

function calculateFrequencyScore(question, repeatIndex) {
  let score = 30;

  if (question.year >= 2023 && question.year <= 2025) score += 30;
  if (question.subject === "case" || question.isCaseQuestion) score += 20;

  const repeatYears = repeatIndex.get(normalizeStem(question.stem));
  if (repeatYears && repeatYears.size > 1) score += 30;

  if (/(\u91CD\u70B9|\u6838\u5FC3)/.test(question.explanation || "")) score += 20;

  return Math.max(0, Math.min(100, score));
}

function normalizeStem(stem) {
  return String(stem || "")
    .replace(/[\uFF0C\u3002\u3001\u201C\u201D\u2018\u2019\uFF1A:；;,.!?！？\s]/g, "")
    .slice(0, 80);
}

module.exports = {
  buildRepeatIndex,
  calculateFrequencyScore,
  normalizeStem
};
