const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(process.cwd(), "dist");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

http
  .createServer((req, res) => {
    const urlPath = decodeURI((req.url || "/").split("?")[0]);
    let file = path.join(root, urlPath === "/" ? "index.html" : urlPath);

    if (
      !file.startsWith(root) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      file = path.join(root, "index.html");
    }

    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Static preview: http://localhost:${port}`);
  });
