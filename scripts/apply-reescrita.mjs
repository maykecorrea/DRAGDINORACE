import fs from "node:fs";
import path from "node:path";

const rows = JSON.parse(fs.readFileSync("/workspace/attachments/reescrita.json", "utf8"));
const changed = rows.filter((row) => !row.inalterado);
const roots = ["src", "content", "gf-engine"];
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|json|css|md)$/.test(name)) files.push(full);
  }
}
for (const root of roots) if (fs.existsSync(root)) walk(root);

const bodies = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));
const skipExact = new Set(["Normal"]);

function escapeReg(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceQuoted(hay, oldText, newText) {
  const quoted = [JSON.stringify(oldText), `'${oldText.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`];
  const nextQuoted = [JSON.stringify(newText), `'${newText.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`];
  let count = 0;
  let next = hay;
  quoted.forEach((from, index) => {
    if (!from || from === nextQuoted[index]) return;
    const parts = next.split(from);
    if (parts.length > 1) {
      count += parts.length - 1;
      next = parts.join(nextQuoted[index]);
    }
  });
  return { next, count };
}

function replaceLoose(hay, oldText, newText) {
  if (oldText.length < 14) return { next: hay, count: 0 };
  const pattern = oldText
    .trim()
    .split(/\s+/)
    .map(escapeReg)
    .join("\\s+");
  const re = new RegExp(pattern, "g");
  let count = 0;
  const next = hay.replace(re, () => {
    count += 1;
    return newText;
  });
  return { next, count };
}

const report = { applied: [], missing: [], removed: [], skipped: [] };
const specials = changed.filter((row) => row.texto_antigo === "Mutar" || row.texto_antigo === "Girar");
const rest = changed
  .filter((row) => row.texto_antigo !== "Mutar" && row.texto_antigo !== "Girar")
  .sort((a, b) => b.texto_antigo.length - a.texto_antigo.length);

for (const row of rest) {
  if (!String(row.texto_novo ?? "").length) {
    report.removed.push(row);
    continue;
  }
  if (skipExact.has(row.texto_antigo)) {
    report.skipped.push(row.id);
    continue;
  }
  let hits = 0;
  for (const [file, hay] of bodies) {
    const quoted = replaceQuoted(hay, row.texto_antigo, row.texto_novo);
    let next = quoted.next;
    let count = quoted.count;
    if (!count) {
      const loose = replaceLoose(next, row.texto_antigo, row.texto_novo);
      next = loose.next;
      count = loose.count;
    }
    if (count) {
      bodies.set(file, next);
      hits += count;
    }
  }
  if (hits) report.applied.push(`${row.id} ×${hits}`);
  else report.missing.push(row);
}

function replaceIn(fileMatch, oldText, newText) {
  let hits = 0;
  for (const [file, hay] of bodies) {
    if (!fileMatch(file)) continue;
    const quoted = replaceQuoted(hay, oldText, newText);
    if (quoted.count) {
      bodies.set(file, quoted.next);
      hits += quoted.count;
    }
  }
  return hits;
}

const mutarHud = replaceIn((file) => /GameApp|raceHud|hotkey/.test(file), "Mutar", "Desligar som");
const mutarRest = replaceIn(() => true, "Mutar", "Desligar");
const girarBar = replaceIn((file) => file.endsWith("bar.tsx"), "Girar", "Cavar");
const girarRest = replaceIn(() => true, "Girar", "Chocar");
report.applied.push(`Mutar hud ${mutarHud} rest ${mutarRest}`, `Girar bar ${girarBar} rest ${girarRest}`);

let touched = 0;
for (const [file, hay] of bodies) {
  const before = fs.readFileSync(file, "utf8");
  if (before !== hay) {
    fs.writeFileSync(file, hay);
    touched += 1;
  }
}

const missingPath = "/tmp/reescrita-missing.json";
fs.writeFileSync(
  missingPath,
  JSON.stringify(
    report.missing.map((row) => ({ id: row.id, tela: row.tela, antigo: row.texto_antigo, novo: row.texto_novo })),
    null,
    2,
  ),
);
console.log("files touched", touched);
console.log("applied", report.applied.length);
console.log("missing", report.missing.length);
console.log("removed-empty", report.removed.map((row) => row.id).join(" "));
console.log("skipped", report.skipped.join(" "));
console.log("missing file", missingPath);
