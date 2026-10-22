// The noise test (tests/live_crowd.json): the same 2 minutes of Alleluya under 100/150 people clapping and shouting,
// as Sarvam heard it, through the tracker with today's service. Right line, one off, wrong place, wrong song, blank.
//   node tests/crowd_replay.js [v]
const Core = require('../js/core.js'), Tidy = require('../js/tidy.js');
const all = ['songs-church', 'songs-ta-fgs', 'songs-ml-wikisource'].flatMap(f => require('../vendor/' + f + '.json').songs);
function parse(text) { const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length); const ls = []; blocks.forEach((b, si) => b.forEach(x => ls.push({ text: x, slide: si }))); Core.prepare(ls.map(l => l.text)).forEach((p, i) => Object.assign(ls[i], p)); return ls; }
const run = require('./live_crowd.json');
const titles = ['அல்லேலூயா கர்த்தரையே', 'எந்தன் நாவில் புதுபாட்டு', 'அழகாய் நிற்கும்', 'அழைத்தீரே', 'துதி கனம்', 'இல்லான் எந்தனுக்கு', 'അടവി തരുക്കളിൻ', 'ஆத்துமாவே ஸ்தோத்தரி'];
const svc = titles.map(t => all.find(s => s.title.startsWith(t))).filter(Boolean).map(s => ({ id: s.title, lines: parse(s.lyrics) }));
const A = svc[0];
const truthAt = t => { let r = null; for (const x of run.truth) if (t >= x[0]) r = x[1]; return r; };
const res = {};
for (const [name, clips] of Object.entries(run.conditions)) {
  const T = Core.trackIndex(svc.map(s => ({ id: s.id, lines: s.lines })));
  const st = { song: A.id, cur: -1 }; const c = { right: 0, off: 0, wrong: 0, song: 0, blank: 0, n: 0 }; const rows = []; let switches = 0;
  for (const [t, txt] of clips) {
    const r = txt ? Core.trackStep(T, st, txt, t * 1000) : null;
    if (r) { if (r.song !== st.song) switches++; st.song = r.song; st.cur = r.line; }
    const w = truthAt(t); if (w == null) continue; c.n++;
    if (st.song !== A.id) c.song++; else if (st.cur < 0) c.blank++;
    else { const a = A.lines[st.cur].text, b = A.lines[w].text; if (a === b) c.right++; else if ([w - 1, w + 1].some(i => A.lines[i] && A.lines[i].text === a)) c.off++; else c.wrong++; }
    rows.push(`  ${String(t).padEnd(6)} ${txt.slice(0, 26).padEnd(26)} want ${w} got ${st.song === A.id ? st.cur : st.song.slice(0, 8)} ${r ? r.why : ''}`);
  }
  const pc = k => (100 * c[k] / c.n).toFixed(0) + '%';
  console.log(`${name.padEnd(26)} words in ${clips.filter(x => x[1]).length}/${clips.length} clips | right ${pc('right')} one off ${pc('off')} wrong ${pc('wrong')} other song ${pc('song')} not started ${pc('blank')} | switches ${switches}`);
  if (process.argv[2]) console.log(rows.join('\n'));
}
