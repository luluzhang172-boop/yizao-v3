const fs = require("fs/promises");
const path = require("path");
const { parsePdf } = require("./parser/pdfParser");
const { cleanPdfText, splitQuestions } = require("./parser/questionSplitter");
const { buildRepeatIndex } = require("./core/frequencyEngine");
const { buildQuestionDraft, finalizeQuestions } = require("./core/v2Builder");

const ROOT = __dirname;
const INPUT_DIR = path.join(ROOT, "input");
const OUTPUT_DIR = path.join(ROOT, "output");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "questions_v2.json");
const OUTPUT_TXT_DIR = path.join(OUTPUT_DIR, "txt");

async function main() {
  await ensureDirs();
  const files = await getPdfFiles();

  if (files.length === 0) {
    console.log("No PDF found. Put exam PDFs into input/ and run node run.js again.");
    await fs.writeFile(OUTPUT_JSON, "[]\n", "utf8");
    return;
  }

  const allDrafts = [];
  const fileReports = [];

  for (const filePath of files) {
    const report = await processPdf(filePath);
    allDrafts.push(...report.drafts);
    fileReports.push(report);
  }

  const repeatIndex = buildRepeatIndex(allDrafts);
  const questions = finalizeQuestions(allDrafts, repeatIndex);
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(questions, null, 2)}\n`, "utf8");

  printReports(fileReports, questions);
  printSelfCheck(questions);
  console.log(`\nOutput written: ${OUTPUT_JSON}`);
}

async function processPdf(filePath) {
  const fileName = path.basename(filePath);
  const year = inferYear(fileName);
  const parsed = await parsePdf(filePath);
  const cleanedText = cleanPdfText(parsed.text);
  const txtPath = path.join(OUTPUT_TXT_DIR, fileName.replace(/\.pdf$/i, ".txt"));
  await fs.writeFile(txtPath, cleanedText, "utf8");

  const blocks = splitQuestions(cleanedText, { year, fileName });
  const drafts = blocks.map(buildQuestionDraft).filter(isExportableQuestion);
  const stats = buildStats(drafts);

  return {
    fileName,
    total: drafts.length,
    drafts,
    stats
  };
}

function buildStats(questions) {
  const totalQuestions = questions.length;
  const missingOptionsCount = questions.filter(hasMissingChoiceOptions).length;
  const caseCount = questions.filter((item) => item.isCaseQuestion).length;
  const avgConfidence = average(questions.map((item) => item.confidence));
  const successCount = questions.filter((item) => isStructurallyUsable(item)).length;
  const successRate = totalQuestions ? Number((successCount / totalQuestions).toFixed(2)) : 0;

  return {
    totalQuestions,
    successRate,
    missingOptionsCount,
    caseCount,
    avgConfidence
  };
}

function hasMissingChoiceOptions(question) {
  if (question.type !== "single_choice") return false;
  const options = question.options || {};
  return ["A", "B", "C", "D"].some((letter) => typeof options[letter] !== "string");
}

function isStructurallyUsable(question) {
  if (!question.id || !question.stem || !question.rawText) return false;
  if (!["management", "pricing", "measurement", "case"].includes(question.subject)) return false;
  if (!["single_choice", "case", "judgement"].includes(question.type)) return false;

  if (question.type === "case") {
    return question.isCaseQuestion && Array.isArray(question.subQuestions) && question.subQuestions.length > 0;
  }

  if (question.type === "single_choice") {
    return question.options && !hasMissingChoiceOptions(question);
  }

  return true;
}

function isExportableQuestion(question) {
  if (question.type === "case") {
    return Array.isArray(question.subQuestions) && question.subQuestions.length > 0;
  }

  if (question.type === "single_choice") {
    if (!question.options || hasMissingChoiceOptions(question)) return false;
    return ["A", "B", "C", "D"].every((letter) => question.options[letter].trim() !== "");
  }

  return Boolean(question.stem);
}

async function ensureDirs() {
  await fs.mkdir(INPUT_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_TXT_DIR, { recursive: true });
}

async function getPdfFiles() {
  const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
    .map((entry) => path.join(INPUT_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function inferYear(fileName) {
  const match = String(fileName || "").match(/20\d{2}/);
  return match ? Number(match[0]) : 0;
}

function average(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function printReports(fileReports) {
  console.log("\nPDF parsing report");
  console.log("=".repeat(60));

  for (const report of fileReports) {
    const payload = {
      file: report.fileName,
      totalQuestions: report.stats.totalQuestions,
      successRate: report.stats.successRate,
      missingOptionsCount: report.stats.missingOptionsCount,
      caseCount: report.stats.caseCount,
      avgConfidence: report.stats.avgConfidence
    };
    console.log(JSON.stringify(payload, null, 2));
  }
}

function printSelfCheck(questions) {
  const sample = deterministicSample(questions, 10);
  const issues = [];

  for (const question of sample) {
    if (question.type === "single_choice" && hasMissingChoiceOptions(question)) {
      issues.push({ id: question.id, issue: "missing_option_keys" });
    }
    if (question.type === "case" && (!Array.isArray(question.subQuestions) || question.subQuestions.length === 0)) {
      issues.push({ id: question.id, issue: "missing_subQuestions" });
    }
    if (typeof question.options === "undefined") {
      issues.push({ id: question.id, issue: "options_field_undefined" });
    }
  }

  const uiRenderable = questions.every((question) => {
    if (typeof question.options === "undefined") return false;
    if (question.type === "single_choice") return question.options && !hasMissingChoiceOptions(question);
    if (question.type === "case") return Array.isArray(question.subQuestions);
    return true;
  });

  console.log("\nSelf check");
  console.log(JSON.stringify({
    sampled: sample.map((item) => ({
      id: item.id,
      type: item.type,
      subject: item.subject,
      optionKeys: item.options ? Object.keys(item.options) : null,
      subQuestionCount: Array.isArray(item.subQuestions) ? item.subQuestions.length : 0,
      confidence: item.confidence
    })),
    sampleIssues: issues,
    uiRenderable
  }, null, 2));
}

function deterministicSample(items, count) {
  if (items.length <= count) return items.slice();
  const step = Math.max(1, Math.floor(items.length / count));
  const sample = [];
  for (let index = 0; index < items.length && sample.length < count; index += step) {
    sample.push(items[index]);
  }
  return sample;
}

main().catch((error) => {
  console.error("Processing failed:", error);
  process.exitCode = 1;
});
