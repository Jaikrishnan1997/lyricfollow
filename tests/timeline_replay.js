// Replays a service recorded with "Record this service for testing" (the timeline .json the app saves) through
// Core.trackStep, with the songs as they were then. Scores the follower against the operator's corrections: just
// before each correction, was the replayed screen on the line the operator chose (right), on the line before it
// (one behind) or elsewhere (wrong)? A timeline with a "truth" list ([s, song id, line], as in tests/live_*.json)
// is scored clip by clip instead. The corrections are then applied, as in the app (Core.trackManual).
//   node tests/timeline_replay.js file.json [v]
const Core = require('../js/core.js'), Tidy = require('../js/tidy.js'), fs = require('fs');
const file = process.argv[2] || __dirname + '/fixtures/timeline_sample.json', V = process.argv[3];
const tl = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!tl.clips || !tl.songs) { console.log('not a Lyric Follow service timeline'); process.exit(1); }
// the song's lines as the app makes them: sung order (chorus after each verse), a transliteration line under a line
// is an alternative spelling of it (alt)
function parse(sg) {
  let text = sg.lyrics; if (!sg.parts) { const so = Tidy.singOrder(text); if (so) text = so.text; }
  const ls = []; text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length).forEach((b, si) => b.forEach(x => ls.push({ text: x, slide: si })));
  Core.prepare(ls.map(l => l.text)).forEach((p, i) => Object.assign(ls[i], p));
  const indic = t => /[ऀ-෿]/.test(t), latin = t => /[a-z]/i.test(t) && !indic(t);
  for (let i = 1; i < ls.length; i++) { const a = ls[i - 1], b = ls[i]; if (a.slide === b.slide && !a.alt && (indic(a.text) && latin(b.text) || latin(a.text) && indic(b.text))) (indic(a.text) ? b : a).alt = true; }
  return ls;
}
const SG = new Map(tl.songs.map(sg => [sg.id, parse(sg)]));
const T = Core.trackIndex(tl.songs.map(sg => ({ id: sg.id, lines: SG.get(sg.id) })));
const text = (id, i) => (SG.get(id) || [])[i] ? SG.get(id)[i].text : '';
const mainBefore = (id, i) => { const ls = SG.get(id) || []; for (let j = i - 1; j >= 0; j--) if (!ls[j].alt) return j; return -1; };
// events in time order: clips, the operator's corrections (and song openings)
const ev = [].concat(tl.clips.map(c => ({ t: c[0], kind: 'clip', text: c[1] })), (tl.manual || []).map(m => ({ t: m[0], kind: 'manual', song: m[1], from: m[2], to: m[3] }))).sort((a, b) => a.t - b.t || (a.kind === 'manual' ? -1 : 1));
const first = (tl.shown || [])[0];
const st = { song: first ? first[1] : null, cur: -1 };
const res = { right: 0, behind: 0, wrong: 0, n: 0 }, rows = [];
const truthAt = t => { let r = null; for (const x of tl.truth || []) if (t >= x[0]) r = x; return r; };
for (const e of ev) {
  if (e.kind === 'clip') {
    const r = e.text ? Core.trackStep(T, st, e.text, e.t * 1000) : null;
    if (r) { st.song = r.song; st.cur = r.line; }
    if (tl.truth) {
      const tr = truthAt(e.t); if (!tr) continue; res.n++;
      if (st.song === tr[1] && text(st.song, st.cur) === text(tr[1], tr[2])) res.right++;
      else if (st.song === tr[1] && text(st.song, st.cur) === text(tr[1], mainBefore(tr[1], tr[2]))) res.behind++; else res.wrong++;
    }
    if (V) rows.push(`${e.t.toFixed(1).padStart(7)} clip ${String(e.text).slice(0, 30).padEnd(30)} -> ${st.song} ${st.cur}${r ? ' ' + (r.src || r.why) : ''}`);
  } else {
    // a correction inside a song is scored; opening a song is the operator's choice, not a correction
    if (!tl.truth && e.from >= 0 && st.song === e.song) {
      res.n++;
      if (text(st.song, st.cur) === text(e.song, e.to)) res.right++;
      else if (text(st.song, st.cur) === text(e.song, mainBefore(e.song, e.to))) res.behind++; else res.wrong++;
    } else if (!tl.truth && e.from >= 0) { res.n++; res.wrong++; }
    if (V) rows.push(`${e.t.toFixed(1).padStart(7)} OPERATOR ${e.song} ${e.from} -> ${e.to} (replay was at ${st.song} ${st.cur})`);
    if (SG.has(e.song) && e.to >= 0) Core.trackManual(T, st, e.song, e.to, e.t * 1000, 8000); else { st.song = e.song; st.cur = e.to; }
  }
}
if (V) console.log(rows.join('\n'));
const pc = x => res.n ? (x / res.n * 100).toFixed(1) + '%' : '-';
console.log(`${tl.truth ? 'clips scored against the truth' : 'operator corrections'}: ${res.n}  right ${pc(res.right)}  one behind ${pc(res.behind)}  wrong ${pc(res.wrong)}  (clips ${tl.clips.length}, songs ${tl.songs.length})`);
