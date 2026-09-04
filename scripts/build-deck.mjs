// Inlines real screenshots (docs/deck/img/*) into docs/deck/deck.template.html
// as data: URIs, producing a standalone docs/deck/deck.html for the Artifact.
// No base64 is ever hand-transcribed; the bytes come straight off disk.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dir = (p) => fileURLToPath(new URL(p, import.meta.url));
const IMG = dir("../docs/deck/img/");
const template = await readFile(dir("../docs/deck/deck.template.html"), "utf8");

const mime = (name) =>
  name.endsWith(".jpg") || name.endsWith(".jpeg")
    ? "image/jpeg"
    : name.endsWith(".svg")
      ? "image/svg+xml"
      : "image/png";

async function dataUri(file) {
  const bytes = await readFile(file);
  return `data:${mime(file)};base64,${bytes.toString("base64")}`;
}

// Special token {{IMG:favicon}} -> the real app favicon.svg.
const faviconUri = await dataUri(dir("../public/favicon.svg"));

let missing = 0;
const out = await replaceAsync(template, /\{\{IMG:([^}]+)\}\}/g, async (_, name) => {
  if (name === "favicon") return faviconUri;
  try {
    return await dataUri(IMG + name);
  } catch {
    missing += 1;
    console.error("  ! missing image:", name);
    return "";
  }
});

async function replaceAsync(str, regex, fn) {
  const parts = [];
  let last = 0;
  for (const m of str.matchAll(regex)) {
    parts.push(str.slice(last, m.index));
    parts.push(await fn(...m));
    last = m.index + m[0].length;
  }
  parts.push(str.slice(last));
  return parts.join("");
}

await writeFile(dir("../docs/deck/deck.html"), out);
const kb = Math.round(Buffer.byteLength(out) / 1024);
console.log(`Built docs/deck/deck.html (${kb} KB, ${missing} missing images).`);
