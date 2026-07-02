const EMPTY_OPTIONS = Object.freeze({ A: "", B: "", C: "", D: "" });
const OPTION_LETTERS = ["A", "B", "C", "D"];

const OPTION_BOUNDARY = "(^|\\n|\\s|[;；。])";
const OPTION_MARKER = "(?:[\\uFF08(]\\s*)?([A-D])\\s*(?:[.\\uFF0E\\u3001\\uFF09)]|\\))";
const PRIMARY_OPTION_RE = new RegExp(`${OPTION_BOUNDARY}${OPTION_MARKER}`, "g");
const SECONDARY_OPTION_RE = /([A-D])\s*(?:[.\uFF0E\u3001\uFF09)]|\))/g;

function parseOptions(blockText) {
  const text = normalizeText(blockText);
  const primary = extractWithRegex(text, PRIMARY_OPTION_RE);
  const primaryResult = buildResult(text, primary, "primary");
  if (primaryResult.optionCompleteness >= 0.75) return primaryResult;

  const secondary = extractWithRegex(text, SECONDARY_OPTION_RE);
  const secondaryResult = buildResult(text, secondary, "secondary");
  if (secondaryResult.optionCompleteness > primaryResult.optionCompleteness) {
    return secondaryResult;
  }

  return {
    ...primaryResult,
    options: fillOptions(primaryResult.options),
    optionMap: fillOptions(primaryResult.optionMap),
    parserPass: primaryResult.parserPass || "empty-fallback"
  };
}

function extractWithRegex(text, regex) {
  const matches = [];
  let match;
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const letter = match[2] || match[1];
    if (!OPTION_LETTERS.includes(letter)) continue;

    const markerOffset = match[2] ? String(match[1] || "").length : match[0].lastIndexOf(letter);
    matches.push({
      letter,
      index: match.index + Math.max(0, markerOffset),
      end: regex.lastIndex
    });
  }

  return dedupeOptionMarkers(matches);
}

function buildResult(text, matches, parserPass) {
  if (matches.length === 0) {
    const stem = stripQuestionNumber(removeAnswerAndExplanation(text));
    return {
      stem,
      options: emptyOptions(),
      optionMap: emptyOptions(),
      optionCompleteness: 0,
      missingLetters: OPTION_LETTERS.slice(),
      parserPass: "empty-fallback"
    };
  }

  const firstOption = matches[0];
  const stem = stripQuestionNumber(text.slice(0, firstOption.index)).trim();
  const optionMap = emptyOptions();

  matches.forEach((item, index) => {
    const next = matches[index + 1];
    const rawValue = text.slice(item.end, next ? next.index : text.length);
    optionMap[item.letter] = cleanOption(rawValue);
  });

  const filled = fillOptions(optionMap);
  const presentLetters = OPTION_LETTERS.filter((letter) => filled[letter]);

  return {
    stem: stem || stripQuestionNumber(removeAnswerAndExplanation(text)),
    options: filled,
    optionMap: filled,
    optionCompleteness: presentLetters.length / OPTION_LETTERS.length,
    missingLetters: OPTION_LETTERS.filter((letter) => !filled[letter]),
    parserPass
  };
}

function dedupeOptionMarkers(matches) {
  const result = [];
  const seen = new Set();

  for (const item of matches.sort((a, b) => a.index - b.index)) {
    if (seen.has(item.letter)) continue;
    seen.add(item.letter);
    result.push(item);
  }

  return result;
}

function cleanOption(value) {
  return removeAnswerAndExplanation(value)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\uFF08(]\s*/, "")
    .trim();
}

function stripQuestionNumber(value) {
  return String(value || "")
    .replace(/^\s*(?:\u7B2C\s*)?(?:\d{1,3}|[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u767E]+)\s*[.\u3001\uFF0E]\s*/, "")
    .replace(/^\s*[\uFF08(]\s*\d{1,3}\s*[\uFF09)]\s*/, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeAnswerAndExplanation(value) {
  return String(value || "")
    .replace(/(?:\u3010\s*\u7B54\u6848\s*\u3011|\u7B54\u6848|\u6B63\u786E\u7B54\u6848|\u53C2\u8003\u7B54\u6848)\s*[:\uFF1A]?\s*[\s\S]*$/i, "")
    .replace(/(?:\u3010\s*\u89E3\u6790\s*\u3011|\u89E3\u6790|\u53C2\u8003\u89E3\u6790)\s*[:\uFF1A]?\s*[\s\S]*$/i, "");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ");
}

function emptyOptions() {
  return { ...EMPTY_OPTIONS };
}

function fillOptions(options) {
  return OPTION_LETTERS.reduce((acc, letter) => {
    acc[letter] = String((options && options[letter]) || "").trim();
    return acc;
  }, {});
}

module.exports = {
  EMPTY_OPTIONS,
  OPTION_LETTERS,
  parseOptions,
  fillOptions
};
