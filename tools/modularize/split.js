#!/usr/bin/env node
/* ============================================================
   QRyby: MODULARYZATOR qryby.html
   ------------------------------------------------------------
   Tnie monolit qryby.html na pliki CSS/JS wedlug planu (plan.js)
   i sklada plik wejsciowy (domyslnie qryby-modular.html).

   Zasady, ktorych narzedzie pilnuje samo:
   - kopiuje DOKLADNE zakresy znakow, nic nie przepisuje,
   - JS tnie tylko miedzy instrukcjami najwyzszego poziomu
     (granice liczy parser acorn), nigdy w srodku funkcji, komentarza
     ani wyrazenia,
   - CSS tnie tylko miedzy regulami najwyzszego poziomu (tokenizer
     zgodny z CSS Syntax: komentarze, stringi, bad-string na nowej linii),
   - nie tnie bloku z dyrektywa 'use strict' (kazdy plik mialby wtedy
     inny tryb),
   - nie zaczyna pliku od samotnego stringa (stalby sie dyrektywa),
   - po zapisie sklada wszystko z powrotem z dysku i porownuje SHA-256
     z oryginalem. Inna suma = blad, zero zmian przyjetych.

   Uzycie:
     node tools/modularize/split.js              # pelny plan
     node tools/modularize/split.js --stage 3    # tylko etapy 1..3
     node tools/modularize/split.js --verify     # tylko weryfikacja
   Wymaga: Node 18+, pakiet acorn (npm i acorn albo NODE_PATH).
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let acorn;
try {
  acorn = require('acorn');
} catch (e) {
  console.error('Brak pakietu acorn. Uruchom: npm i acorn  (albo ustaw NODE_PATH).');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN = require('./plan.js');
const MANIFEST = path.join(__dirname, 'manifest.json');

const args = process.argv.slice(2);
const onlyVerify = args.includes('--verify');
const stageArg = args.indexOf('--stage');
const STAGE = stageArg >= 0 ? Number(args[stageArg + 1]) : Infinity;

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const abs = (p) => path.join(ROOT, p);
const read = (p) => fs.readFileSync(abs(p), 'utf8');
const kb = (s) => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1) + ' KB';

function fail(msg) {
  console.error('BLAD: ' + msg);
  process.exit(1);
}

/* ---------- Wyszukanie blokow <script> i <style> w HTML ---------- */
function findBlocks(html) {
  const out = [];
  const re = /<script>([\s\S]*?)<\/script>|<style([^>]*)>([\s\S]*?)<\/style>/g;
  let m;
  let si = 0;
  let ci = 0;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<script>')) {
      const content = m[1];
      out.push({ kind: 'script', index: si++, start: m.index, end: m.index + m[0].length,
        open: '<script>', close: '</script>', contentStart: m.index + 8, content });
    } else {
      const open = '<style' + m[2] + '>';
      out.push({ kind: 'style', index: ci++, start: m.index, end: m.index + m[0].length,
        open, close: '</style>', contentStart: m.index + open.length, content: m[3] });
    }
  }
  // Zaden blok nie moze lezec w komentarzu HTML (przegladarka by go pominela).
  const masked = html.split('');
  for (const b of out) for (let i = b.start; i < b.end; i++) masked[i] = ' ';
  const text = masked.join('');
  const cre = /<!--[\s\S]*?-->/g;
  let c;
  while ((c = cre.exec(text))) {
    for (const b of out) {
      if (b.start > c.index && b.start < c.index + c[0].length) {
        fail(`blok ${b.kind} #${b.index} lezy wewnatrz komentarza HTML`);
      }
    }
  }
  // '<!--' w skrypcie przelacza tokenizer HTML w stan "escaped"; wtedy granice
  // bloku moglyby byc inne niz te z wyrazenia regularnego. Samo '<script'
  // w komentarzu JS (bez '<!--') niczego nie zmienia.
  for (const b of out) {
    if (b.kind === 'script' && b.content.includes('<!--')) {
      fail(`blok script #${b.index} zawiera <!--; tokenizer HTML moglby go czytac inaczej`);
    }
  }
  return out;
}

function lineIndex(html) {
  const nl = [];
  for (let i = 0; i < html.length; i++) if (html.charCodeAt(i) === 10) nl.push(i);
  return (pos) => {
    let lo = 0;
    let hi = nl.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (nl[mid] < pos) lo = mid + 1; else hi = mid;
    }
    return lo + 1;
  };
}

function uniqueIndex(hay, needle, where) {
  const first = hay.indexOf(needle);
  if (first < 0) fail(`${where}: nie znaleziono kotwicy ${JSON.stringify(needle.slice(0, 80))}`);
  const second = hay.indexOf(needle, first + 1);
  if (second >= 0) fail(`${where}: kotwica wystepuje wiecej niz raz: ${JSON.stringify(needle.slice(0, 80))}`);
  return first;
}

const lineStart = (text, pos) => text.lastIndexOf('\n', pos - 1) + 1;

/* ---------- JS: granice instrukcji najwyzszego poziomu ---------- */
function parseJs(code, where) {
  const comments = [];
  let ast;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest', sourceType: 'script', ranges: true,
      onComment: (isBlock, text, start, end) => comments.push({ start, end })
    });
  } catch (e) {
    fail(`${where}: parser nie przyjal kodu: ${e.message}`);
  }
  return { ast, comments };
}

function jsCuts(block, chunks, where) {
  const { ast, comments } = parseJs(block.content, where);
  const body = ast.body;
  const cuts = [0];
  if (chunks.length > 1 && body.length && body[0].directive) {
    fail(`${where}: blok zaczyna sie dyrektywa '${body[0].directive}'; ciecie zmieniloby tryb scisly czesci plikow`);
  }
  for (let k = 1; k < chunks.length; k++) {
    const anchor = chunks[k].anchor;
    const w = `${where} -> ${chunks[k].path || '(inline)'}`;
    let pos = uniqueIndex(block.content, anchor, w);
    if (anchor.startsWith('\n')) pos += 1; // wiodacy \n tylko wymusza poczatek linii
    let at = pos;
    const cm = comments.find((c) => c.start <= pos && pos < c.end);
    if (cm) at = cm.start;
    const cut = lineStart(block.content, at);
    if (block.content.slice(cut, at).trim()) fail(`${w}: przed kotwica w tej samej linii stoi kod`);
    if (cut <= cuts[cuts.length - 1]) fail(`${w}: ciecia nie sa rosnace (kolejnosc w planie?)`);
    const inside = body.find((s) => s.start < cut && cut < s.end);
    if (inside) fail(`${w}: ciecie wypada wewnatrz instrukcji (znaki ${inside.start}-${inside.end})`);
    if (comments.some((c) => c.start < cut && cut < c.end)) fail(`${w}: ciecie wypada wewnatrz komentarza`);
    const next = body.find((s) => s.start >= cut);
    if (next && next.type === 'ExpressionStatement' && next.expression.type === 'Literal' &&
        typeof next.expression.value === 'string') {
      fail(`${w}: plik zaczynalby sie od samotnego stringa (stalby sie dyrektywa)`);
    }
    cuts.push(cut);
  }
  // Dowod strukturalny: kazdy kawalek parsuje sie osobno do tych samych instrukcji.
  const bounds = cuts.concat([block.content.length]);
  const flat = [];
  for (let k = 0; k < cuts.length; k++) {
    const piece = block.content.slice(bounds[k], bounds[k + 1]);
    const { ast: pa } = parseJs(piece, `${where} kawalek ${k}`);
    for (const s of pa.body) flat.push([s.start + bounds[k], s.end + bounds[k], s.type]);
  }
  const orig = body.map((s) => [s.start, s.end, s.type]);
  if (JSON.stringify(flat) !== JSON.stringify(orig)) {
    fail(`${where}: kawalki po cieciu nie odtwarzaja tych samych instrukcji co oryginal`);
  }
  return cuts;
}

/* ---------- CSS: granice regul najwyzszego poziomu ---------- */
function cssScan(css) {
  // Zwraca pozycje komentarzy najwyzszego poziomu, przed ktorymi wolno ciac
  // (poprzedni znaczacy token na glebokosci 0 to '}' albo ';' albo poczatek).
  let i = 0;
  const n = css.length;
  let depth = 0;
  let last = null;
  const cutOk = [];
  const comments = [];
  while (i < n) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      const e = css.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      comments.push({ start: i, end });
      if (depth === 0 && (last === null || last === '}' || last === ';')) cutOk.push(i);
      i = end;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      for (; j < n; j++) {
        const d = css[j];
        if (d === '\\') { j++; continue; }
        if (d === ch) { j++; break; }
        if (d === '\n') break; // bad-string: konczy sie PRZED nowa linia
      }
      i = j;
      if (depth === 0) last = 'x';
      continue;
    }
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; if (depth === 0) last = '}'; continue; }
    if (ch === ';') { if (depth === 0) last = ';'; i++; continue; }
    if (!/\s/.test(ch) && depth === 0) last = 'x';
    i++;
  }
  return { cutOk, comments, depth };
}

function cssCuts(block, chunks, where) {
  const { cutOk, comments, depth } = cssScan(block.content);
  if (depth !== 0) fail(`${where}: niezbalansowane nawiasy klamrowe w CSS`);
  const cuts = [0];
  for (let k = 1; k < chunks.length; k++) {
    const w = `${where} -> ${chunks[k].path || '(inline)'}`;
    let pos = uniqueIndex(block.content, chunks[k].anchor, w);
    if (chunks[k].anchor.startsWith('\n')) pos += 1;
    const cm = comments.find((c) => c.start <= pos && pos < c.end);
    if (!cm) fail(`${w}: kotwica CSS musi lezec w komentarzu-naglowku`);
    if (!cutOk.includes(cm.start)) fail(`${w}: komentarz nie stoi na granicy reguly najwyzszego poziomu`);
    const cut = lineStart(block.content, cm.start);
    if (block.content.slice(cut, cm.start).trim()) fail(`${w}: przed komentarzem w tej samej linii stoi CSS`);
    if (cut <= cuts[cuts.length - 1]) fail(`${w}: ciecia nie sa rosnace`);
    cuts.push(cut);
  }
  const bounds = cuts.concat([block.content.length]);
  for (let k = 0; k < cuts.length; k++) {
    const piece = block.content.slice(bounds[k], bounds[k + 1]);
    if (cssScan(piece).depth !== 0) fail(`${where}: kawalek ${k} CSS nie domyka regul`);
  }
  return cuts;
}

/* ---------- Plan -> kawalki ---------- */
function resolvePlan(html) {
  const blocks = findBlocks(html);
  const lineOf = lineIndex(html);
  const resolved = [];
  const seenPaths = new Set();
  for (const pb of PLAN.blocks) {
    const b = blocks.find((x) => x.kind === pb.kind && x.index === pb.index);
    const where = `${pb.kind} #${pb.index}`;
    if (!b) fail(`${where}: brak takiego bloku w ${PLAN.source}`);
    if (pb.expect && !b.content.includes(pb.expect)) {
      fail(`${where}: blok nie zawiera oczekiwanego tekstu ${JSON.stringify(pb.expect)} (plik zrodlowy sie zmienil?)`);
    }
    const chunks = pb.files.map((f) => ({ path: f[0], anchor: f[1] || null, stage: f[2] || pb.stage || 1 }));
    for (const c of chunks) {
      if (!c.path) fail(`${where}: kazdy kawalek planu musi miec sciezke`);
      if (seenPaths.has(c.path)) fail(`sciezka ${c.path} wystepuje w planie dwa razy`);
      seenPaths.add(c.path);
      if ((PLAN.protect || []).some((p) => c.path === p || c.path.startsWith(p))) {
        fail(`sciezka ${c.path} jest chroniona (istniejacy modul)`);
      }
    }
    const cuts = b.kind === 'script' ? jsCuts(b, chunks, where) : cssCuts(b, chunks, where);
    const bounds = cuts.concat([b.content.length]);
    chunks.forEach((c, k) => {
      c.text = b.content.slice(bounds[k], bounds[k + 1]);
      c.fromLine = lineOf(b.contentStart + bounds[k]);
      c.toLine = lineOf(b.contentStart + Math.max(bounds[k], bounds[k + 1] - 1));
      c.active = c.stage <= STAGE;
    });
    resolved.push({ block: b, plan: pb, chunks });
  }
  return { blocks, resolved };
}

/* ---------- Emisja: tagi zamiast blokow ---------- */
function tagFor(kind, p) {
  const url = `${p}?v=${PLAN.version}`;
  return kind === 'script' ? `<script src="${url}"></script>` : `<link rel="stylesheet" href="${url}">`;
}

function emitBlock(r, withGateScript) {
  // Kawalki nieaktywne (etap pozniejszy) zostaja inline; sasiednie scala.
  const parts = [];
  let inlineBuf = null;
  for (const c of r.chunks) {
    if (c.active) {
      if (inlineBuf !== null) { parts.push(r.block.open + inlineBuf + r.block.close); inlineBuf = null; }
      parts.push(tagFor(r.block.kind, c.path));
    } else {
      inlineBuf = (inlineBuf || '') + c.text;
    }
  }
  if (inlineBuf !== null) parts.push(r.block.open + inlineBuf + r.block.close);
  // Dawny jeden blok <script> rozbity na kilka czesci: bramka ladowania
  // przywraca jego niepodzielnosc (patrz src/core/load-gate.js).
  if (r.block.kind === 'script' && parts.length > 1) {
    parts.unshift(PLAN.gate.open);
    parts.push(PLAN.gate.close);
  }
  if (withGateScript) parts.unshift(tagFor('script', PLAN.gate.script));
  return parts.join('\n');
}

// Lista emisji w kolejnosci dokumentu. Skrypt bramki trafia przed pierwszy
// aktywny blok <script> (w pelnym planie: na poczatek <head>).
function emissions(resolved) {
  const out = [];
  let gateDone = false;
  for (const r of resolved.slice().sort((a, b) => a.block.start - b.block.start)) {
    if (!r.chunks.some((c) => c.active)) continue;
    const withGate = !gateDone && r.block.kind === 'script';
    if (withGate) gateDone = true;
    out.push({ r, emitted: emitBlock(r, withGate) });
  }
  return out;
}

function buildEntry(html, resolved) {
  let out = '';
  let last = 0;
  for (const { r, emitted } of emissions(resolved)) {
    out += html.slice(last, r.block.start) + emitted;
    last = r.block.end;
  }
  return out + html.slice(last);
}

/* ---------- Weryfikacja: skladanie z DYSKU ---------- */
function verify(html, resolved) {
  const entry = read(PLAN.entry);
  let rebuilt = '';
  let cursor = 0;
  for (const { r, emitted } of emissions(resolved)) {
    const at = entry.indexOf(emitted, cursor);
    if (at < 0) fail(`weryfikacja: w ${PLAN.entry} brakuje tagow bloku ${r.block.kind} #${r.block.index} w oczekiwanej postaci`);
    rebuilt += entry.slice(cursor, at);
    const content = r.chunks.map((c) => (c.active ? read(c.path) : c.text)).join('');
    rebuilt += r.block.open + content + r.block.close;
    cursor = at + emitted.length;
  }
  rebuilt += entry.slice(cursor);
  const a = sha256(html);
  const b = sha256(rebuilt);
  // Kazdy lokalny src/href w pliku wejsciowym musi istniec.
  const missing = [];
  const re = /<(?:script[^>]*\ssrc|link[^>]*\shref)="([^"]*)"/g;
  let m;
  while ((m = re.exec(entry))) {
    const url = m[1];
    if (/^[a-z]+:/i.test(url) || url.startsWith('//') || url.startsWith('#')) continue;
    const p = url.split(/[?#]/)[0];
    if (!fs.existsSync(abs(p))) missing.push(p);
  }
  if (missing.length) fail('weryfikacja: brak plikow: ' + missing.join(', '));
  if (a !== b) fail(`weryfikacja: SHA-256 rozne!\n  oryginal ${a}\n  zlozone  ${b}`);
  return { sha: a, entryBytes: Buffer.byteLength(entry, 'utf8') };
}

/* ---------- Main ---------- */
const html = read(PLAN.source);
const { resolved } = resolvePlan(html);

if (!onlyVerify) {
  // Usun pliki wygenerowane poprzednio, ktorych plan juz nie zawiera.
  let old = [];
  try { old = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).files.map((f) => f.path); } catch (e) { /* pierwszy raz */ }
  const now = new Set(resolved.flatMap((r) => r.chunks.filter((c) => c.active).map((c) => c.path)));
  for (const p of old) if (!now.has(p) && fs.existsSync(abs(p))) fs.unlinkSync(abs(p));
  for (const r of resolved) {
    for (const c of r.chunks) {
      if (!c.active) continue;
      fs.mkdirSync(path.dirname(abs(c.path)), { recursive: true });
      fs.writeFileSync(abs(c.path), c.text, 'utf8');
    }
  }
  fs.writeFileSync(abs(PLAN.entry), buildEntry(html, resolved), 'utf8');
}

const v = verify(html, resolved);
const files = [];
for (const r of resolved) {
  for (const c of r.chunks) {
    if (!c.active) continue;
    files.push({
      path: c.path, block: `${r.block.kind}#${r.block.index}`, stage: c.stage,
      fromLine: c.fromLine, toLine: c.toLine,
      bytes: Buffer.byteLength(c.text, 'utf8'), sha256: sha256(c.text)
    });
  }
}
if (!onlyVerify) {
  fs.writeFileSync(MANIFEST, JSON.stringify({
    source: PLAN.source, sourceSha256: v.sha, sourceBytes: Buffer.byteLength(html, 'utf8'),
    entry: PLAN.entry, entryBytes: v.entryBytes, version: PLAN.version,
    stage: Number.isFinite(STAGE) ? STAGE : 'all', files
  }, null, 2) + '\n', 'utf8');
}

console.log(`Zrodlo  : ${PLAN.source} ${kb(html)}  sha256 ${v.sha.slice(0, 16)}...`);
console.log(`Wejscie : ${PLAN.entry} ${(v.entryBytes / 1024).toFixed(1)} KB`);
console.log(`Moduly  : ${files.length} plikow, ${(files.reduce((s, f) => s + f.bytes, 0) / 1024).toFixed(1)} KB`);
console.log('Weryfikacja: OK, zlozenie z dysku daje identyczny SHA-256 jak oryginal.');
