const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER_FILE = path.join(ROOT, "output", "questions_master.json");
const APP_FILE = path.join(ROOT, "src", "data", "questions_master.json");

async function main() {
  await fs.mkdir(path.dirname(APP_FILE), { recursive: true });
  const content = await fs.readFile(MASTER_FILE, "utf8");
  JSON.parse(content);
  await fs.writeFile(APP_FILE, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  console.log(`Synced question bank to ${APP_FILE}`);
}

main().catch((error) => {
  console.error("Question bank sync failed:", error.message || error);
  process.exitCode = 1;
});
