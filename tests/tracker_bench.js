// Simulated service: noisy Whisper-like Tamil transcripts of today's songs sung in many ways, fed clip by clip
// to Core.trackStep. Prints how often the tracker shows the line being sung (or the one just before).
// node tests/tracker_bench.js [noise] [verbose]
const Core = require('../js/core.js');
const ta = require('../vendor/songs-ta-fgs.json').songs, ch = require('../vendor/songs-church.json').songs;
const pick = t => ch.concat(ta).find(s => s.title.startsWith(t));
const SERVICE = ['அல்லேலூயா கர்த்தரையே', 'எந்தன் நாவில்', 'அழகாய் நிற்கும்', 'அழைத்தீரே', 'துதி கனம்'].map(pick).filter(Boolean);
function parse(text) {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
  const ls = []; blocks.forEach((b, si) => b.forEach(x => ls.push({ text: x, slide: si })));
  const indic = t => /[ऀ-෿]/.test(t), latin = t => /[a-z]/i.test(t) && !indic(t);
  for (let i = 1; i < ls.length; i++) { const a = ls[i - 1], b = ls[i]; if (a.slide === b.slide && !a.alt && (indic(a.text) && latin(b.text) || latin(a.text) && indic(b.text))) (indic(a.text) ? b : a).alt = true; }
  return ls;
}
const songs = SERVICE.map((s, i) => ({ id: 'S' + i, title: s.title, lines: parse(s.lyrics) }));
songs.forEach(s => { s.main = s.lines.map((l, i) => l.alt ? -1 : i).filter(i => i >= 0); s.slides = []; s.main.forEach(i => { const sl = s.lines[i].slide; (s.slides[sl] = s.slides[sl] || []).push(i); }); s.slides = s.slides.filter(Boolean); });
// LIB=1: word weights from the whole bundled library too, as the app does once its library index is built
let LIB = null;
if (process.env.LIB) { const all = ['songs-ta-fgs', 'songs-church', 'songs-ml-wikisource', 'songs-en-wikisource'].flatMap(f => require('../vendor/' + f + '.json').songs); LIB = Core.libIndex(all.map((s, i) => { const ls = parse(s.lyrics); Core.prepare(ls.map(l => l.text)).forEach((p, j) => Object.assign(ls[j], p)); return { id: 'L' + i, lines: ls }; })); }
const T = Core.trackIndex(songs.map(s => ({ id: s.id, lines: s.lines })), LIB);
// ---- noise ----
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const GROUPS = [['த', 'ட', 'க'], ['ல', 'ள', 'ழ'], ['ர', 'ற'], ['ந', 'ன', 'ண'], ['ச', 'ஜ', 'ஸ'], ['ப', 'வ', 'ம'], ['ா', ''], ['ி', 'ீ'], ['ு', 'ூ'], ['ெ', 'ே', 'ை']];
const JUNK = ['நான்', 'ஏன்', 'ஐயா', 'என்று', 'செய்யுங்கள்', 'ஏதாவது', 'வணக்கம்'];
const LAT = [['t', 'd'], ['l', 'r'], ['s', 'c', 'ch'], ['p', 'b', 'v'], ['a', 'e', 'ae'], ['i', 'ee', 'e'], ['u', 'oo', 'o'], ['n', 'm']];
function noisy(w, L) {
  if (rnd() < L * .6) return '';
  if (/[a-z]/i.test(w)) { let o = ''; for (const c of w.toLowerCase()) { const g = LAT.find(g => g.includes(c)); o += g && rnd() < L ? g[Math.floor(rnd() * g.length)] : c; } if (rnd() < L && o.length > 4) o = o.slice(0, Math.ceil(o.length * (.5 + rnd() * .3))); return o; }
  let out = '';
  for (const c of w) { const g = GROUPS.find(g => g.includes(c)); out += g && rnd() < L ? g[Math.floor(rnd() * g.length)] : c; }
  if (rnd() < L && out.length > 4) out = out.slice(0, Math.ceil(out.length * (.5 + rnd() * .3)));
  return out;
}
function transcript(words, L) {
  const out = []; for (const w of words) { const x = noisy(w, L); if (x) out.push(x); if (rnd() < L * .4) out.push(JUNK[Math.floor(rnd() * JUNK.length)]); }
  if (!out.length && rnd() < .3) out.push(JUNK[Math.floor(rnd() * JUNK.length)]);
  return out.join(' ');
}
// ---- singing patterns: list of [songIndex, lineIndex] ----
const linear = s => s.slides.flat();
function twice(s) { return s.slides.flatMap(sl => sl.flatMap(i => [i, i])); }
function fallback(s) {   // a b a c a d b d   (back to the first line between the others)
  return s.slides.flatMap(sl => { if (sl.length < 3) return sl.concat(sl); const [a, ...r] = sl; const o = [a]; r.forEach((x, k) => { o.push(x); if (k < r.length - 1) o.push(k % 2 ? sl[1] : a); }); return o; });
}
function randomBack(s) { const L = linear(s), o = []; for (let i = 0; i < L.length; i++) { o.push(L[i]); if (i > 2 && rnd() < .25) { const b = i - 1 - Math.floor(rnd() * 3); o.push(L[b], L[i]); } } return o; }
const SC = [];
songs.forEach((s, si) => {
  SC.push({ name: s.title.slice(0, 12) + ' linear', open: si, seq: linear(s).map(l => [si, l]) });
  SC.push({ name: s.title.slice(0, 12) + ' twice', open: si, seq: twice(s).map(l => [si, l]) });
  SC.push({ name: s.title.slice(0, 12) + ' fallback', open: si, seq: fallback(s).map(l => [si, l]) });
  SC.push({ name: s.title.slice(0, 12) + ' randback', open: si, seq: randomBack(s).map(l => [si, l]) });
  const nx = (si + 1) % songs.length, half = linear(s).slice(0, Math.ceil(linear(s).length / 2));
  SC.push({ name: s.title.slice(0, 12) + ' ->switch', open: si, seq: half.map(l => [si, l]).concat(linear(songs[nx]).map(l => [nx, l])) });
  SC.push({ name: s.title.slice(0, 12) + ' none-open', open: -1, seq: linear(s).slice(0, 12).map(l => [si, l]) });
});
const L = +(process.argv[2] || .18), V = process.argv[3];
const AG = {}; let tot = 0, good = 0, b1 = 0, bad = 0, wrongSong = 0, rows = [];
for (const spw of [.35, .6, 1.0]) for (const sc of SC) {
  seed = 7 + Math.round(spw * 100) + sc.name.length;
  // timeline of words
  const words = []; let t = 5, prevSlide = null, prevSong = null;
  sc.seq.forEach(([si, li], k) => {
    const sl = songs[si].lines[li].slide; if (k && (sl !== prevSlide || si !== prevSong)) t += si !== prevSong ? 6 : 1.5 + rnd() * 3; prevSlide = sl; prevSong = si;
    const ws = songs[si].lines[li].text.split(/\s+/).filter(Boolean);
    ws.forEach(w => { words.push({ t, w, si, li, k }); t += spw * (.8 + rnd() * .4); }); t += spw * .6;
  });
  const end = t + 1; const st = { song: sc.open >= 0 ? songs[sc.open].id : null, cur: -1 };
  let g = 0, n = 0, bb = 0, ws = 0;
  for (let tc = 4.5; tc < end; tc += 3.3) {
    const inWin = words.filter(x => x.t > tc - 4.5 && x.t <= tc);
    const r = Core.trackStep(T, st, transcript(inWin.map(x => x.w), L), tc * 1000);
    if (r) { st.song = r.song; st.cur = r.line; }
    const sung = words.filter(x => x.t <= tc); if (!sung.length) continue;
    const now = sung[sung.length - 1], prevK = sc.seq[now.k - 1];
    n++;
    const sid = songs[now.si].id, same = st.song === sid;
    if (!same) { ws++; bb++; continue; }
    const txt = i => i >= 0 ? songs[now.si].lines[i].text : '';
    if (txt(st.cur) === txt(now.li)) g++;
    else if (prevK && prevK[0] === now.si && txt(st.cur) === txt(prevK[1])) b1++;
    else bb++;
    if (V && rows.length < 4000) rows.push(`${sc.name} spw${spw} t${tc.toFixed(1)} sung ${now.li} shown ${st.cur}${r ? ' ' + r.why : ''}`);
  }
  tot += n; good += g; bad += bb; wrongSong += ws;
  { const k = sc.name.split(' ').pop() + ' ' + spw; AG[k] = AG[k] || [0, 0, 0]; AG[k][0] += n; AG[k][1] += g; AG[k][2] += bb; }
  if (V === 'sc') console.log(`${sc.name.padEnd(24)} spw ${spw} good ${(g / n * 100).toFixed(0)}% bad ${(bb / n * 100).toFixed(0)}% wrongsong ${ws}`);
}
if (V === 'rows') console.log(rows.join('\n'));
if (V === 'agg') for (const [k, [n, g, b]] of Object.entries(AG)) console.log(k.padEnd(16), 'right', (g / n * 100).toFixed(0) + '%', 'wrong', (b / n * 100).toFixed(0) + '%');
console.log(`noise ${L}: right line ${(good / tot * 100).toFixed(1)}%  one behind ${((tot - good - bad) / tot * 100).toFixed(1)}%  wrong ${(bad / tot * 100).toFixed(1)}% (wrong song ${(wrongSong / tot * 100).toFixed(1)}%)  clips ${tot}`);
