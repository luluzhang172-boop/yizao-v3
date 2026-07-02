const SUBJECT_PATTERNS = [
  { subject: "case", pattern: /(\u5EFA\u8BBE\u5DE5\u7A0B\u9020\u4EF7\u6848\u4F8B\u5206\u6790|\u6848\u4F8B\u5206\u6790|\u6848\u4F8B\s*\u771F\u9898)/ },
  { subject: "management", pattern: /(\u5EFA\u8BBE\u5DE5\u7A0B\u9020\u4EF7\u7BA1\u7406|\u9020\u4EF7\u7BA1\u7406|\u7BA1\u7406\s*\u771F\u9898)/ },
  { subject: "pricing", pattern: /(\u5EFA\u8BBE\u5DE5\u7A0B\u8BA1\u4EF7|\u5DE5\u7A0B\u8BA1\u4EF7|\u8BA1\u4EF7\s*\u771F\u9898)/ },
  { subject: "measurement", pattern: /(\u5EFA\u8BBE\u5DE5\u7A0B\u6280\u672F\u4E0E\u8BA1\u91CF|\u6280\u672F\u4E0E\u8BA1\u91CF|\u571F\u5EFA|\u5DE5\u7A0B\u8BA1\u91CF|\u8BA1\u91CF\s*\u771F\u9898)/ }
];

const QUESTION_MARKER_RE = /(?:^|\n)\s*(?:\u7B2C\s*)?((?:\d{1,3})|(?:[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u767E]+))\s*[.\u3001\uFF0E]|(?:^|\n)\s*[\uFF08(]\s*(\d{1,3})\s*[\uFF09)]/g;
const CASE_MARKER_RE = /(?:^|\n)\s*(?:\u8BD5\u9898|[\u7B2C]?[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341]{1,3}\u9898)[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341]?\s*[:\uFF1A\u3001.]?/g;

const HEADER_FOOTER_PATTERNS = [
  /^\s*\u7B2C\s*\d+\s*\u9875\s*(?:\u5171\s*\d+\s*\u9875)?\s*$/i,
  /^\s*\d+\s*\/\s*\d+\s*$/,
  /^\s*-+\s*\d+\s*-+\s*$/,
  /\u5B66\u5458\u4E13\u7528|\u8BF7\u52FF\u5916\u6CC4/,
  /\u73AF\u7403\u7F51\u6821|233\u7F51\u6821|\u5EFA\u8BBE\u5DE5\u7A0B\u6559\u80B2\u7F51|\u4F18\u8DEF\u6559\u80B2|\u4E2D\u5927\u7F51\u6821|\u5B66\u5929\u6559\u80B2/,
  /\u7248\u6743\u6240\u6709|\u4EC5\u4F9B\u5B66\u4E60|\u5185\u90E8\u8D44\u6599|\u626B\u7801|\u516C\u4F17\u53F7|www\.|http/i
];

function cleanPdfText(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/([A-D])\s*[.\u3001\uFF0E\uFF09)]/g, "\n$1. ")
    .replace(/\u3010\s*\u7B54\u6848\s*\u3011/g, "\n\u3010\u7B54\u6848\u3011")
    .replace(/\u6B63\u786E\s*\u7B54\u6848\s*[:\uFF1A]/g, "\n\u6B63\u786E\u7B54\u6848:")
    .replace(/\u7B54\u6848\s*[:\uFF1A]/g, "\n\u7B54\u6848:")
    .replace(/\u3010\s*\u89E3\u6790\s*\u3011/g, "\n\u89E3\u6790:")
    .replace(/\u53C2\u8003\u89E3\u6790\s*[:\uFF1A]/g, "\n\u89E3\u6790:")
    .replace(/\u89E3\u6790\s*[:\uFF1A]/g, "\n\u89E3\u6790:")
    .replace(/\u3010\s*\u95EE\u9898\s*\u3011/g, "\n\u3010\u95EE\u9898\u3011")
    .replace(/\u3010\s*\u53C2\u8003\u7B54\u6848\s*\u3011/g, "\n\u3010\u53C2\u8003\u7B54\u6848\u3011");

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !HEADER_FOOTER_PATTERNS.some((pattern) => pattern.test(line)));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function splitQuestions(text, context = {}) {
  const cleaned = cleanPdfText(text);
  const fallbackSubject = inferSubjectFromFileName(context.fileName);
  const subject = detectSubject(cleaned, fallbackSubject);

  if (subject === "case") {
    return splitByMarkers(cleaned, CASE_MARKER_RE, subject, context, true);
  }

  const blocks = splitByMarkers(cleaned, QUESTION_MARKER_RE, subject, context, false)
    .filter((block) => !isLikelySectionHeading(block.raw))
    .filter((block) => block.raw.length > 8);

  return mergeNoisyChoiceBlocks(blocks, context).filter(isLikelyChoiceBlock);
}

function splitByMarkers(cleaned, regex, subject, context, isCase) {
  const matches = [];
  let match;
  regex.lastIndex = 0;

  while ((match = regex.exec(cleaned)) !== null) {
    const marker = match[0];
    const index = match.index + (marker.startsWith("\n") ? marker.indexOf(marker.trimStart()) : 0);
    matches.push({ index, marker: marker.trim() });
  }

  if (matches.length === 0) {
    return cleaned
      .split(/\n{2,}/)
      .map((block, index) => makeBlock(block, index + 1, subject, context, "", isCase))
      .filter((block) => block.raw.length > 10);
  }

  return matches.map((item, index) => {
    const next = matches[index + 1];
    const raw = cleaned.slice(item.index, next ? next.index : cleaned.length).trim();
    return makeBlock(raw, index + 1, subject, context, item.marker, isCase);
  });
}

function mergeNoisyChoiceBlocks(blocks, context) {
  const year = Number(context.year) || 0;
  if (year >= 2024) return blocks;

  const merged = [];
  for (const block of blocks) {
    const hasOption = /(?:^|\n|\s)(?:[\uFF08(]\s*)?[A-D]\s*(?:[.\uFF0E\u3001\uFF09)]|\))/.test(block.raw);
    const hasAnswer = /(\u3010\s*\u7B54\u6848\s*\u3011|\u7B54\u6848\s*[:\uFF1A]|\u6B63\u786E\u7B54\u6848)/.test(block.raw);
    const previous = merged[merged.length - 1];

    if (previous && !hasOption && !hasAnswer && block.raw.length < 80) {
      previous.raw = `${previous.raw}\n${block.raw}`;
    } else {
      merged.push(block);
    }
  }
  return merged;
}

function detectSubject(text, fallbackSubject) {
  const sample = text.slice(0, 2000);
  const found = SUBJECT_PATTERNS.find((item) => item.pattern.test(sample));
  return found ? found.subject : fallbackSubject || "management";
}

function inferSubjectFromFileName(fileName) {
  const name = String(fileName || "").toLowerCase();
  if (/\u6848\u4F8B|case/.test(name)) return "case";
  if (/\u571F\u5EFA|\u8BA1\u91CF|measurement|measure/.test(name)) return "measurement";
  if (/\u8BA1\u4EF7|pricing|price/.test(name)) return "pricing";
  if (/\u7BA1\u7406|management|manage/.test(name)) return "management";
  return null;
}

function makeBlock(raw, ordinal, subject, context, marker = "", isCase = false) {
  return {
    raw,
    ordinal,
    marker,
    subject,
    isCase,
    year: context.year || null,
    fileName: context.fileName || ""
  };
}

function isLikelySectionHeading(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (text.length > 45) return false;
  if (/[A-D]\s*[.\u3001\uFF0E\uFF09)]/.test(text)) return false;
  if (/(\u7B54\u6848|\u6B63\u786E\u7B54\u6848|\u89E3\u6790)/.test(text)) return false;
  return /(\u5355\u9879\u9009\u62E9|\u591A\u9879\u9009\u62E9|\u6848\u4F8B\u5206\u6790|\u5EFA\u8BBE\u5DE5\u7A0B|\u9020\u4EF7\u7BA1\u7406|\u5DE5\u7A0B\u8BA1\u4EF7|\u6280\u672F\u4E0E\u8BA1\u91CF|\u8003\u8BD5\u771F\u9898|\u771F\u9898)/.test(text);
}

function isLikelyChoiceBlock(block) {
  const text = String(block.raw || "");
  const hasOptionMarker = /(?:^|\n|\s)(?:[\uFF08(]\s*)?[A-D]\s*(?:[.\uFF0E\u3001\uFF09)]|\))/.test(text);
  if (hasOptionMarker) return true;

  const hasAnswerMarker = /(\u3010\s*\u7B54\u6848\s*\u3011|\u7B54\u6848\s*[:\uFF1A]|\u6B63\u786E\u7B54\u6848)/.test(text);
  if (hasAnswerMarker && text.length > 40) return true;

  return false;
}

module.exports = {
  cleanPdfText,
  splitQuestions,
  detectSubject,
  inferSubjectFromFileName
};
