import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../docs/", import.meta.url));

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("../dist/client/", import.meta.url), output, { recursive: true });

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("export", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("https://example.invalid/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`Static render failed with ${response.status}`);

const html = (await response.text())
  .replaceAll('href="/assets/', 'href="./assets/')
  .replaceAll('import("/assets/', 'import("./assets/')
  .replaceAll('"/assets/', '"./assets/')
  .replaceAll("/favicon.svg", "./favicon.svg")
  .replaceAll("/manifest.webmanifest", "./manifest.webmanifest")
  .replace(/<meta[^>]+name="codex-preview"[^>]*>/, "");

await writeFile(new URL("index.html", new URL(`file:///${output.replaceAll("\\", "/")}/`)), html, "utf8");
await writeFile(new URL(".nojekyll", new URL(`file:///${output.replaceAll("\\", "/")}/`)), "", "utf8");

console.log(`GitHub Pages export written to ${output}`);

