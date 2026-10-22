// Builds vendor/quiz.json from tools/quiz_src.txt and checks every reference against the loaded Bibles.
// node tools/build_quiz.js   (prints answers whose key word is not found near the cited verse)
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
global.LFCore = require(path.join(ROOT, 'js/core.js'));
const Bible = require(path.join(ROOT, 'js/bible.js'));
const DATA = {};
for (const id of ['kjv', 'tamov', 'mal1910']) {
  const ctx = { LF_BIBLE_LOAD: b => { DATA[id] = b; } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'bible', id + '.js'), 'utf8'), ctx);
}
const verse = (id, b, c, v) => ((DATA[id].data[b] || [])[c - 1] || [])[v - 1] || '';
const out = [], bad = [];
const STOP = new Set('the and of a an his her to in on by with from for at was who what is god lord'.split(' '));
for (const line of fs.readFileSync(path.join(__dirname, 'quiz_src.txt'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const f = line.split('|').map(s => s.trim());
  if (f.length !== 7) { bad.push('FIELDS ' + line.slice(0, 60)); continue; }
  const m = f[0].match(/^(.+?)\s+(\d+):(\d+)$/); const b = m && Bible.BOOKS.findIndex(x => x.en === m[1]);
  if (!m || b < 0) { bad.push('REF ' + f[0]); continue; }
  const c = +m[2], v = +m[3];
  for (const id of ['kjv', 'tamov', 'mal1910']) if (!verse(id, b, c, v)) bad.push('MISSING ' + id + ' ' + f[0]);
  // the answer's main English word should be near the verse (not for "which verse" questions)
  const near = []; for (let d = -6; d <= 6; d++) near.push(verse('kjv', b, c, v + d)); const txt = near.join(' ').toLowerCase();
  const keys = f[2].toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
  if (keys.length && !keys.some(k => txt.includes(k.slice(0, 5))) && !/verse|psalm \d|^\w+ \d+:\d+$/i.test(f[2])) bad.push('ANSWER? ' + f[0] + ' :: ' + f[2]);
  out.push({ q: { en: f[1], ta: f[3], ml: f[5] }, a: { en: f[2], ta: f[4], ml: f[6] }, ref: [b, c, v] });
}
fs.writeFileSync(path.join(ROOT, 'vendor/quiz.json'), JSON.stringify(out));
console.log(out.length, 'questions;', bad.length, 'to check'); bad.forEach(x => console.log(' ', x));
