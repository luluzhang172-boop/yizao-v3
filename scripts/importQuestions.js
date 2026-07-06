const fs = require("fs/promises");
const fssync = require("fs");
const path = require("path");
const crypto = require("crypto");
const { parsePdf } = require("../parser/pdfParser");
const { cleanPdfText, splitQuestions } = require("../parser/questionSplitter");
const { buildQuestionDraft, finalizeQuestions } = require("../core/v2Builder");
const { buildRepeatIndex } = require("../core/frequencyEngine");
const {
  assignStableId,
  createQuestionIndex,
  mergeQuestionBank,
  toV31Question
} = require("./questionBankMerge");

const ROOT = path.resolve(__dirname, "..");
const INPUT_DIR = path.join(ROOT, "input");
const OUTPUT_DIR = path.join(ROOT, "output");
const PIPELINE_DIR = path.join(ROOT, "data-pipeline");
const CACHE_DIR = path.join(PIPELINE_DIR, "cache");
const PROCESSED_DIR = path.join(PIPELINE_DIR, "processed");
const MANIFEST_FILE = path.join(PIPELINE_DIR, "manifest.json");
const MASTER_FILE = path.join(OUTPUT_DIR, "questions_master.json");
const LEGACY_V2_FILE = path.join(OUTPUT_DIR, "questions_v2.json");
const LATEST_FILE = path.join(OUTPUT_DIR, "questions_latest.json");
const REPORT_FILE = path.join(OUTPUT_DIR, "import_report.json");
const TXT_DIR = path.join(OUTPUT_DIR, "txt");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  const batchId = makeBatchId(startedAt);

  await ensureDirs();
  const manifest = await readJson(MANIFEST_FILE, { version: 1, files: {} });
  const existingQuestions = await loadExistingMaster(args.all);
  const legacyIndex = createQuestionIndex(existingQuestions.map((item) => toV31Question(item)));
  const pdfFiles = await scanPdfFiles(args.file);
  const plan = await buildImportPlan(pdfFiles, manifest, args);

  if (args.dryRun) {
    const report = buildReport({
      batchId,
      startedAt,
      finishedAt: new Date(),
      scannedFiles: plan.scannedFiles,
      skippedFiles: plan.skippedFiles,
      processedFiles: plan.toProcess.map((item) => item.fileName),
      changedFiles: plan.changedFiles,
      failedFiles: [],
      latestQuestions: [],
      mergeResult: { questions: existingQuestions, newQuestionCount: 0, duplicateQuestionCount: 0, mergedQuestionCount: 0 },
      warnings: plan.warnings,
      dryRun: true
    });
    console.log(JSON.stringify(report, null, 2));
    printConsoleReport(report);
    return;
  }

  if (plan.toProcess.length === 0 && !args.all) {
    const report = buildReport({
      batchId,
      startedAt,
      finishedAt: new Date(),
      scannedFiles: plan.scannedFiles,
      skippedFiles: plan.skippedFiles,
      processedFiles: [],
      changedFiles: [],
      failedFiles: [],
      latestQuestions: [],
      mergeResult: { questions: existingQuestions, newQuestionCount: 0, duplicateQuestionCount: 0, mergedQuestionCount: 0 },
      warnings: ["No new or changed PDFs detected."],
      dryRun: false
    });
    await writeJson(LATEST_FILE, []);
    await writeJson(REPORT_FILE, report);
    console.log("没有检测到新增或变更 PDF，题库无需更新。");
    printConsoleReport(report);
    return;
  }

  const processedFiles = [];
  const failedFiles = [];
  const latestQuestions = [];

  for (const item of plan.toProcess) {
    try {
      const parsed = await processPdf(item, batchId, legacyIndex);
      processedFiles.push(item.fileName);
      latestQuestions.push(...parsed.questions);
      await writeJson(parsed.cacheFileAbs, parsed.questions);
      manifest.files[item.fileName] = {
        fileName: item.fileName,
        fileHash: item.fileHash,
        size: item.size,
        lastModified: item.lastModified,
        processedAt: Date.now(),
        questionCount: parsed.questions.length,
        status: "processed",
        outputCacheFile: toPosix(path.relative(ROOT, parsed.cacheFileAbs))
      };
    } catch (error) {
      failedFiles.push({ fileName: item.fileName, error: String(error.message || error) });
      manifest.files[item.fileName] = {
        fileName: item.fileName,
        fileHash: item.fileHash,
        size: item.size,
        lastModified: item.lastModified,
        processedAt: Date.now(),
        questionCount: 0,
        status: "failed",
        error: String(error.message || error),
        outputCacheFile: ""
      };
      console.error(`PDF 解析失败: ${item.fileName}`);
      console.error(error);
    }
  }

  const baseQuestions = args.all ? [] : existingQuestions;
  const mergeResult = mergeQuestionBank(baseQuestions, latestQuestions);
  const report = buildReport({
    batchId,
    startedAt,
    finishedAt: new Date(),
    scannedFiles: plan.scannedFiles,
    skippedFiles: plan.skippedFiles,
    processedFiles,
    changedFiles: plan.changedFiles,
    failedFiles,
    latestQuestions,
    mergeResult,
    warnings: plan.warnings,
    dryRun: false
  });

  await writeJson(MASTER_FILE, mergeResult.questions);
  await writeJson(LATEST_FILE, latestQuestions);
  await writeJson(REPORT_FILE, report);
  await writeJson(MANIFEST_FILE, manifest);
  printConsoleReport(report);
}

async function processPdf(item, batchId, legacyIndex) {
  const parsed = await parsePdf(item.filePath);
  const cleanedText = cleanPdfText(parsed.text);
  await fs.writeFile(path.join(TXT_DIR, item.fileName.replace(/\.pdf$/i, ".txt")), cleanedText, "utf8");

  const blocks = splitQuestions(cleanedText, { year: item.year, fileName: item.fileName });
  const drafts = blocks.map(buildQuestionDraft).filter(isExportableQuestion);
  const finalized = finalizeQuestions(drafts, buildRepeatIndex(drafts));
  const questions = finalized.map((question) =>
    assignStableId(question, {
      year: item.year,
      sourceFile: item.fileName,
      sourceHash: item.fileHash,
      importBatchId: batchId
    }, legacyIndex)
  );

  return {
    questions,
    cacheFileAbs: path.join(CACHE_DIR, `${safeCacheName(item.fileName)}-${item.fileHash.slice(0, 12)}.json`)
  };
}

async function buildImportPlan(pdfFiles, manifest, args) {
  const scannedFiles = [];
  const skippedFiles = [];
  const changedFiles = [];
  const toProcess = [];
  const warnings = [];
  const processedHashes = new Map();

  for (const record of Object.values(manifest.files || {})) {
    if (record && record.fileHash && record.status === "processed") {
      processedHashes.set(record.fileHash, record);
    }
  }

  for (const filePath of pdfFiles) {
    const stat = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const fileHash = await hashFile(filePath);
    const year = inferYear(fileName);
    const existing = manifest.files[fileName];
    const duplicateHash = processedHashes.get(fileHash);
    const item = {
      filePath,
      fileName,
      fileHash,
      size: stat.size,
      lastModified: stat.mtimeMs,
      year
    };

    scannedFiles.push(fileName);

    if (args.all) {
      toProcess.push(item);
      changedFiles.push(fileName);
      continue;
    }

    if (existing && existing.fileHash === fileHash && existing.status === "processed") {
      skippedFiles.push(fileName);
      continue;
    }

    if (!existing && duplicateHash) {
      skippedFiles.push(fileName);
      warnings.push(`${fileName} has the same sha256 as ${duplicateHash.fileName}; skipped duplicate content.`);
      continue;
    }

    if (existing && existing.fileHash !== fileHash) changedFiles.push(fileName);
    toProcess.push(item);
  }

  return { scannedFiles, skippedFiles, changedFiles, toProcess, warnings };
}

async function scanPdfFiles(fileName) {
  const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
    .map((entry) => path.join(INPUT_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  if (!fileName) return files;

  const target = files.find((filePath) => path.basename(filePath) === fileName);
  if (!target) throw new Error(`File not found in input/: ${fileName}`);
  return [target];
}

async function loadExistingMaster(ignoreMaster) {
  if (!ignoreMaster && fssync.existsSync(MASTER_FILE)) {
    return readJson(MASTER_FILE, []);
  }
  if (fssync.existsSync(MASTER_FILE)) return readJson(MASTER_FILE, []);
  if (fssync.existsSync(LEGACY_V2_FILE)) return readJson(LEGACY_V2_FILE, []);
  return [];
}

function isExportableQuestion(question) {
  if (question.type === "case") {
    return Array.isArray(question.subQuestions) && question.subQuestions.length > 0;
  }
  if (question.type === "single_choice" || question.type === "multiple_choice") {
    if (!question.options) return false;
    return ["A", "B", "C", "D"].every((letter) => String(question.options[letter] || "").trim());
  }
  return Boolean(question.stem);
}

function buildReport(input) {
  const questions = input.mergeResult.questions || [];
  return {
    batchId: input.batchId,
    startedAt: input.startedAt.toISOString(),
    finishedAt: input.finishedAt.toISOString(),
    scannedFiles: input.scannedFiles,
    skippedFiles: input.skippedFiles,
    processedFiles: input.processedFiles,
    changedFiles: input.changedFiles,
    failedFiles: input.failedFiles,
    newQuestionCount: input.mergeResult.newQuestionCount,
    duplicateQuestionCount: input.mergeResult.duplicateQuestionCount,
    mergedQuestionCount: input.mergeResult.mergedQuestionCount,
    masterTotalCount: questions.length,
    bySubject: countBy(questions, "subject"),
    byType: countBy(questions, "type"),
    warnings: input.warnings,
    dryRun: input.dryRun
  };
}

function printConsoleReport(report) {
  console.log(`本次扫描 PDF：${report.scannedFiles.length} 个`);
  console.log(`跳过未变化：${report.skippedFiles.length} 个`);
  console.log(`新增/变更处理：${report.processedFiles.length} 个`);
  console.log(`新增题：${report.newQuestionCount}`);
  console.log(`重复题：${report.duplicateQuestionCount}`);
  console.log(`合并后总题量：${report.masterTotalCount}`);
  if (report.failedFiles.length) console.log(`失败文件：${report.failedFiles.map((item) => item.fileName).join(", ")}`);
  console.log("输出文件：output/questions_master.json");
}

function parseArgs(argv) {
  const args = { all: false, dryRun: false, file: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") args.all = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--file") args.file = argv[index + 1] || "";
  }
  return args;
}

async function ensureDirs() {
  await fs.mkdir(INPUT_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(PIPELINE_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  await fs.mkdir(TXT_DIR, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const value = await fs.readFile(filePath, "utf8");
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function hashFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = String(item[key] || "unknown");
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function inferYear(fileName) {
  const match = String(fileName || "").match(/20\d{2}/);
  return match ? Number(match[0]) : 0;
}

function makeBatchId(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `import_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function safeCacheName(fileName) {
  return fileName.replace(/\.pdf$/i, "").replace(/[^\w\u4E00-\u9FFF.-]+/g, "_");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
