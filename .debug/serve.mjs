import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = "E:/pilot-grow-wise-main/dist/spa";
const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

http
  .createServer(async (req, res) => {
    const urlPath = req.url.split("?")[0];
    let filePath = join(ROOT, urlPath);
    try {
      let body;
      try {
        body = await readFile(filePath);
      } catch {
        // SPA fallback — mirrors the .htaccess rewrite
        filePath = join(ROOT, "index.html");
        body = await readFile(filePath);
      }
      res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
      res.end(body);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  })
  .listen(4517, () => console.log("serving on http://localhost:4517"));
