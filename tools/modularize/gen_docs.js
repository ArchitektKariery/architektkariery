#!/usr/bin/env node
/* ============================================================
   GENERATOR FAKTOW DO DOKUMENTACJI MODULOW
   ------------------------------------------------------------
   Czyta qryby-modular.html (albo qryby.html po przelaczeniu) i pliki
   modulow, a potem wypisuje:
     - docs/SYMBOL_INDEX.md: kazda globalna nazwa -> plik:linia,
     - tools/modularize/out/facts.json: surowe fakty per plik
       (deklaracje, naglowki sekcji, Supabase, id DOM, zdarzenia),
   z ktorych powstaja docs/MODULARIZATION_MAP.md i docs/ARCHITECTURE.md.
   Uzycie: node tools/modularize/gen_docs.js [plik_wejsciowy]
   Wymaga: acorn.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..', '..');
const ENTRY = process.argv[2] || (fs.existsSync(path.join(ROOT, 'qryby-modular.html')) ? 'qryby-modular.html' : 'qryby.html');
const html = fs.readFileSync(path.join(ROOT, ENTRY), 'utf8');
let manifest = { files: [] };
try { manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')); } catch (e) { /* brak */ }
const fromLine = Object.fromEntries(manifest.files.map((f) => [f.path, f.fromLine]));

// Kolejnosc ladowania: tagi w pliku wejsciowym.
const order = [];
const re = /<script src="([^"?]+)[^"]*"><\/script>|<link rel="stylesheet" href="([^"?]+)[^"]*">|<script>(QRybyGate\.(?:open|close)\(\))<\/script>/g;
let m;
while ((m = re.exec(html))) {
  if (m[3]) order.push({ gate: m[3] });
  else order.push({ path: m[1] || m[2], kind: m[1] ? 'js' : 'css' });
}

const lineAt = (text, pos) => text.slice(0, pos).split('\n').length;

function jsFacts(p) {
  const code = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const out = { path: p, bytes: Buffer.byteLength(code), lines: code.split('\n').length, decls: [], exports: [], headers: [],
    supabase: [], dom: [], events: [], origLine: fromLine[p] || null };
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', ranges: true }); } catch (e) { out.parseError = e.message; return out; }
  for (const st of ast.body) {
    const ln = lineAt(code, st.range[0]);
    if (st.type === 'FunctionDeclaration') out.decls.push({ name: st.id.name, kind: 'function', line: ln });
    if (st.type === 'ClassDeclaration') out.decls.push({ name: st.id.name, kind: 'class', line: ln });
    if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') out.decls.push({ name: d.id.name, kind: st.kind, line: ln });
  }
  for (const w of code.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) {
    if (!out.exports.some((e) => e.name === w[1])) out.exports.push({ name: w[1], line: lineAt(code, w.index) });
  }
  for (const h of code.matchAll(/^\s*\/\*\s*=+\s*\n\s*([^\n]+)/gm)) out.headers.push({ title: h[1].trim().replace(/\s+/g, ' ').slice(0, 90), line: lineAt(code, h.index) + 1 });
  for (const h of code.matchAll(/^\s*\/\* -{3,} ([^-\n][^\n]*?) -{3,} \*\//gm)) out.headers.push({ title: h[1].trim(), line: lineAt(code, h.index), sub: true });
  out.headers.sort((a, b) => a.line - b.line);
  const sup = new Set();
  for (const s of code.matchAll(/['"`](\/(?:rest|auth)\/v1\/[A-Za-z_\/]+)/g)) if (!/\/rpc\/?$/.test(s[1])) sup.add(s[1].replace(/\?.*$/, ''));
  for (const s of code.matchAll(/wolajRpc\(\s*['"]([\w]+)['"]/g)) sup.add('/rest/v1/rpc/' + s[1]);
  for (const s of code.matchAll(/['"`]\/rest\/v1\/rpc\/([a-z_]{3,})['"`]/g)) sup.add('/rest/v1/rpc/' + s[1]);
  out.supabase = [...sup].sort();
  const dom = new Set();
  for (const s of code.matchAll(/getElementById\(\s*['"]([\w-]+)['"]\s*\)/g)) dom.add('#' + s[1]);
  out.dom = [...dom].sort();
  const ev = new Set();
  for (const s of code.matchAll(/addEventListener\(\s*['"]([\w]+)['"]/g)) ev.add(s[1]);
  out.events = [...ev].sort();
  return out;
}

function cssFacts(p) {
  const css = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const headers = [];
  for (const h of css.matchAll(/\/\*\s*(?:=+\s*\n\s*)?([^\n*]{4,})/g)) {
    const t = h[1].trim(); if (/^[=\-]+$/.test(t)) continue;
    headers.push({ title: t.slice(0, 80), line: lineAt(css, h.index) });
  }
  return { path: p, bytes: Buffer.byteLength(css), lines: css.split('\n').length, headers: headers.slice(0, 400), origLine: fromLine[p] || null };
}

const facts = order.filter((o) => o.path && fs.existsSync(path.join(ROOT, o.path))).map((o) => (o.kind === 'css' ? cssFacts(o.path) : jsFacts(o.path)));
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'facts.json'), JSON.stringify({ entry: ENTRY, order, facts }, null, 1));

/* ---------- docs/SYMBOL_INDEX.md ---------- */
const rows = [];
for (const f of facts) {
  if (!f.decls) continue;
  if (f.path.startsWith('assets/')) continue;
  for (const d of f.decls) rows.push([d.name, d.kind, f.path, d.line]);
  for (const e of f.exports) if (!f.decls.some((d) => d.name === e.name)) rows.push([e.name, 'window.' + e.name + ' =', f.path, e.line]);
}
rows.sort((a, b) => a[0].localeCompare(b[0], 'pl') || a[2].localeCompare(b[2]));
let md = '# Indeks symboli QRyby\n\n';
md += '> Plik generowany: `node tools/modularize/gen_docs.js`. Nie edytuj recznie.\n';
md += '> Kazda globalna nazwa gry (funkcja, stala, zmienna, eksport `window.X`) i miejsce jej definicji.\n';
md += '> Linia liczy sie od poczatku pliku modulu.\n\n';
md += `Liczba wpisow: ${rows.length}\n\n`;
md += '| Nazwa | Rodzaj | Plik | Linia |\n|---|---|---|---|\n';
for (const r of rows) md += `| \`${r[0]}\` | ${r[1]} | \`${r[2]}\` | ${r[3]} |\n`;
fs.writeFileSync(path.join(ROOT, 'docs', 'SYMBOL_INDEX.md'), md);

console.log(`Pliki: ${facts.length}, symbole: ${rows.length}, wejscie: ${ENTRY}`);
