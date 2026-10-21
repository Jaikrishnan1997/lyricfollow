// Replays live sparse Sarvam clips (tests/live_sparse.json) through the tracker with today's service.
// node tests/sparse_replay.js [v]
const Core = require('../js/core.js'), fs = require('fs');
const all = ['songs-ta-fgs', 'songs-church', 'songs-ml-wikisource', 'songs-en-wikisource'].flatMap(f => require('../vendor/' + f + '.json').songs);
function parse(text) { const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length); const ls = []; blocks.forEach((b, si) => b.forEach(x => ls.push({ text: x, slide: si }))); const indic = t => /[ऀ-෿]/.test(t), latin = t => /[a-z]/i.test(t) && !indic(t); for (let i = 1; i < ls.length; i++) { const a = ls[i - 1], b = ls[i]; if (a.slide === b.slide && !a.alt && (indic(a.text) && latin(b.text) || latin(a.text) && indic(b.text))) (indic(a.text) ? b : a).alt = true; } Core.prepare(ls.map(l => l.text)).forEach((p, i) => Object.assign(ls[i], p)); return ls; }
const pick = t => { const s = all.find(x => x.title.startsWith(t)); return { id: s.title, title: s.title, lines: parse(s.lyrics) }; };
const svc = ['அல்லேலூயா கர்த்தரையே', 'எந்தன் நாவில் புதுபாட்டு', 'அழகாய் நிற்கும்', 'அழைத்தீரே', 'துதி கனம்'].map(pick);
svc.push({ id: 'இல்லான் எந்தனுக்கு', title: 'இல்லான் எந்தனுக்கு', lines: parse(require('fs').readFileSync(__dirname + '/../vendor/songs-church.json', 'utf8') && fs.existsSync('/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad/fmt/illan.txt') ? require('../js/tidy.js').tidy(fs.readFileSync('/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad/fmt/illan.txt', 'utf8')).lyrics : 'இல்லான்') });
const L = Core.libIndex(all.map((s, i) => ({ id: 'L' + i, lines: parse(s.lyrics) })));
const T = Core.trackIndex(svc.map(s => ({ id: s.id, lines: s.lines })), L);
const V = process.argv[2];
for (const run of JSON.parse(fs.readFileSync(__dirname + '/live_sparse.json', 'utf8')).runs) {
  const open = svc.find(s => s.title.startsWith(run.open));
  const st = { song: open.id, cur: run.cur }; const ev = [];
  for (const [t, text] of run.clips) {
    const r = Core.trackStep(T, st, text, t * 1000);
    if (r) { if (r.song !== st.song) ev.push(`${t}s SWITCH -> ${r.song.slice(0, 18)} @${r.line}`); st.song = r.song; st.cur = r.line; }
    if (V) console.log('  ', t, text.padEnd(36).slice(0, 36), '->', st.song.slice(0, 14), st.cur, r ? r.why : '', 'mine', st.mineTop.toFixed(2), 'oth', st.otherTop.toFixed(2));
  }
  console.log(run.name.padEnd(48), '|', ev.join(', ') || 'no switch', '| end', st.song.slice(0, 16), st.cur);
}
