const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");

async function parsePdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);

  return {
    fileName: path.basename(filePath),
    text: data.text || "",
    pages: data.numpages || 0,
    info: data.info || {}
  };
}

module.exports = {
  parsePdf
};
