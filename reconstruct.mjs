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

const autoBackupScript = `<script id="kasir-apotek-auto-daily-backup">
(() => {
  const projectUrl = "https://nsssjvlgqkhppuwvksda.supabase.co";
  const publishableKey = "sb_publishable_3tMpItBWliBc0CPQSw9m4A_J51r7q8d";
  const marker = "kasir-apotek-auto-backup-day";
  const tz = "Asia/Jakarta";
  const dateKey = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return p.year + "-" + p.month + "-" + p.day;
  };
  async function runBackup() {
    const today = dateKey();
    if (localStorage.getItem(marker) === today) return;
    let accessToken = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.endsWith("-auth-token")) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key) || "{}");
        accessToken = value.access_token || value.currentSession?.access_token || null;
        if (accessToken) break;
      } catch (_) {}
    }
    if (!accessToken) return;
    const response = await fetch(projectUrl + "/functions/v1/backup-all-excel", {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    if (!response.ok) throw new Error("Backup harian gagal (HTTP " + response.status + ")");
    const blob = await response.blob();
    if (!blob.size || !blob.type.includes("spreadsheetml")) throw new Error("File backup tidak valid");
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "Backup-Kasir-Apotek-" + today + ".xlsx";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    localStorage.setItem(marker, today);
  }
  function scheduleMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 5, 0);
    setTimeout(() => {
      runBackup().catch(error => console.warn("[Backup otomatis]", error));
      scheduleMidnight();
    }, Math.max(1000, next.getTime() - now.getTime()));
  }
  window.addEventListener("load", () => {
    setTimeout(() => runBackup().catch(error => console.warn("[Backup otomatis]", error)), 5000);
    scheduleMidnight();
  });
})();
</script>`;
if (!html.includes('id="kasir-apotek-auto-daily-backup"')) {
  if (!html.includes("</body>")) throw new Error("Penutup body tidak ditemukan; backup otomatis tidak disisipkan.");
  html = html.replace("</body>", autoBackupScript + "</body>");
}

const out = join(root, "dist", "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html, "utf8");
console.log(`Wrote dist/index.html; applied ${applied} replacements from ${manifest.versions.filter(v => v.kind === "patch").length} patch records.`);
