import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "source-payloads", "manifest.json"), "utf8"));
let html = gunzipSync(Buffer.from(readFileSync(join(root, "source-payloads", "base-v1.html.gz.b64"), "utf8").trim(), "base64")).toString("utf8");
let applied = 0;
for (const item of manifest.versions.filter(v => v.kind === "patch").sort((a,b) => a.id-b.id)) {
  const patch = JSON.parse(readFileSync(join(root, item.payload_file), "utf8"));
  for (let i = 0; i < patch.length; i++) {
    const { o, n } = patch[i];
    const occurrences = html.split(o).length - 1;
    if (occurrences !== 1) {
      throw new Error(`${item.version} (row ${item.id}) patch #${i+1}: expected one match, found ${occurrences}; stopped without writing output.`);
    }
    html = html.replace(o, n);
    applied++;
  }
}
const out = join(root, "dist", "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html, "utf8");
console.log(`Wrote dist/index.html; applied ${applied} replacements from ${manifest.versions.filter(v => v.kind === "patch").length} patch records.`);
