const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const pathname = decodeURIComponent(
        url.pathname === "/" ? "/options.html" : url.pathname,
      );
      const relative = pathname.replace(/^\/+/, "");
      if (
        !/^(options\.html|popup\.html|assets\/[\w.-]+|styles\/[\w.-]+\.css|src\/[\w.-]+\.js)$/.test(
          relative,
        )
      ) {
        response.writeHead(404).end("Not found");
        return;
      }
      const data = await fs.readFile(path.join(root, relative));
      response.writeHead(200, {
        "Content-Type":
          types[path.extname(relative)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  const server = createServer();
  server.listen(port, "127.0.0.1", () =>
    console.log(`Binance Studio preview: http://127.0.0.1:${port}`),
  );
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { createServer };
