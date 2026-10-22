// Builds the verse-by-verse quiz list, one file a book: vendor/quiz/<NN>.json, plus vendor/quiz/index.json.
//   node tools/quizgen/build_full.js [generated dir, default /home/claude/qgen/out]
// Input: <dir>/<NN-Book>/<chapter>.txt, lines `ch:v | en q | en a | ta q | ta a | ml q | ml a` (see BRIEF.md).
const fs = require('fs'), path = require('path');
const SRC = process.argv[2] || '/home/claude/qgen/out', OUT = path.join(__dirname, '../../vendor/quiz');
fs.mkdirSync(OUT, { recursive: true });
const index = []; let total = 0, skipped = 0;
for (const b of fs.readdirSync(SRC).filter(d => /^\d\d-/.test(d)).sort()) {
  const bi = +b.slice(0, 2) - 1, list = [], seen = new Set();
  const chs = fs.readdirSync(path.join(SRC, b)).filter(f => /^\d+\.txt$/.test(f)).sort((x, y) => parseInt(x) - parseInt(y));
  for (const f of chs) for (const line of fs.readFileSync(path.join(SRC, b, f), 'utf8').split('\n')) {
    const p = line.split('|').map(s => s.trim()); if (p.length !== 7 || !p.every(Boolean)) { if (line.trim()) skipped++; continue; }
    const m = p[0].match(/^(\d+):(\d+)$/); if (!m) { skipped++; continue; }
    const k = p[1].toLowerCase(); if (seen.has(k)) continue; seen.add(k);
    list.push({ q: { en: p[1], ta: p[3], ml: p[5] }, a: { en: p[2], ta: p[4], ml: p[6] }, ref: [bi, +m[1], +m[2]] });
  }
  if (!list.length) continue;
  const file = String(bi + 1).padStart(2, '0') + '.json';
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(list));
  index.push({ book: bi, file, n: list.length }); total += list.length;
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
console.log(`books ${index.length}, questions ${total}, skipped lines ${skipped}`);
