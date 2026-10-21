// One whole song, live Sarvam clips (tests/live_single_alleluya.json): how often the tracker is on the line being
// sung, with the sheet as typed (chorus once) and in sung order (LFTidy.singOrder).  node tests/single_song_replay.js [v]
const Core = require('../js/core.js'), Tidy = require('../js/tidy.js'), fs = require('fs');
const all = ['songs-ta-fgs', 'songs-church'].flatMap(f => require('../vendor/' + f + '.json').songs);
function parse(text) { const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length); const ls = []; blocks.forEach((b, si) => b.forEach(x => ls.push({ text: x, slide: si }))); Core.prepare(ls.map(l => l.text)).forEach((p, i) => Object.assign(ls[i], p)); return ls; }
const al = all.find(s => s.title.startsWith('அல்லேலூயா கர்த்தரையே'));
const b = al.lyrics.split(/\n\s*\n/), once = [b[0], b[1], b[2], b[4], b[6], b[8]].join('\n\n');
const others = ['எந்தன் நாவில் புதுபாட்டு', 'அழகாய் நிற்கும்', 'அழைத்தீரே', 'துதி கனம்'].map(t => all.find(s => s.title.startsWith(t))).map(s => ({ id: s.title, lines: parse(s.lyrics) }));
const run = JSON.parse(fs.readFileSync(__dirname + '/live_single_alleluya.json', 'utf8'));
// expanded truth -> the chorus-once sheet: C2 (12-15) is C (4-7), V3 (16-19) is 12-15
const toOnce = x => x >= 16 ? x - 4 : x >= 12 ? x - 8 : x;
for (const [name, text, map] of [['as typed (chorus once)', once, toOnce], ['sung order', Tidy.singOrder(once).text, x => x]]) {
  const T = Core.trackIndex([{ id: 'A', lines: parse(text) }, ...others]);
  const st = { song: 'A', cur: -1 }; let exact = 0, near = 0, wrongSong = 0; const rows = [];
  run.clips.forEach(([t, txt], k) => {
    const r = Core.trackStep(T, st, txt, t * 1000);
    if (r) { st.song = r.song; st.cur = r.line; }
    const want = map(run.truth[k]);
    if (st.song !== 'A') wrongSong++; else if (st.cur === want) exact++; else if (Math.abs(st.cur - want) <= 1) near++;
    rows.push(`${t} ${txt.slice(0, 26).padEnd(26)} want ${String(want).padStart(2)} got ${st.song === 'A' ? st.cur : st.song.slice(0, 10)} ${r ? r.why : ''}`);
  });
  if (process.argv[2]) console.log(rows.join('\n'));
  console.log(name.padEnd(24), `exact ${exact}/${run.clips.length}  within one ${exact + near}/${run.clips.length}  wrong song ${wrongSong}`);
}
