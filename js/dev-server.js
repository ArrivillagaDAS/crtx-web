import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 5500;
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function sendText(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const relativePath = pathname === "/" ? "html/index.html" : pathname.slice(1);
  const filePath = resolve(rootDirectory, relativePath);
  const pathFromRoot = relative(rootDirectory, filePath);
  const firstPathSegment = pathFromRoot.split(sep)[0].toLowerCase();

  if (
    pathFromRoot.startsWith(`..${sep}`) ||
    pathFromRoot === ".." ||
    firstPathSegment.startsWith(".") ||
    firstPathSegment === "node_modules" ||
    firstPathSegment === "dist"
  ) {
    return null;
  }

  return filePath;
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed");
    return;
  }

  let filePath;
  try {
    filePath = resolveRequestPath(request.url || "/");
  } catch {
    sendText(response, 400, "Bad request");
    return;
  }

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendText(response, 404, "Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes.get(extname(filePath)) || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CMDB frontend: http://127.0.0.1:${port}`);
});
