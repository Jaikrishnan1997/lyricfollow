// Simulated service: noisy Whisper-like transcripts of today's songs sung in many ways, fed clip by clip
// to Core.trackStep. Prints how often the tracker shows the line being sung (or the one just before).
// node tests/tracker_bench.js [noise] [verbose: sc | rows | agg | pat]
//   SPARSE=1  1-3 words a clip (cloud recognition over music)     SEED=n  another random service (1 = the reference)
//   BENCH_LANG=ml  Malayalam songs with Malayalam mishearings (default Tamil)
const Core = require('../js/core.js');
const ML = process.env.BENCH_LANG === 'ml';   // (not LANG: that is the system's own locale)
const ta = require('../vendor/songs-ta-fgs.json').songs, ch = require('../vendor/songs-church.json').songs, mlS = require('../vendor/songs-ml-wikisource.json').songs;
const pick = t => (ML ? mlS : ch.concat(ta)).find(s => s.title.startsWith(t));
// Malayalam: five songs with the chorus written out after each verse (as the app follows them), short and long lines
const SERVICE = (ML ? ['എന്തതിശയമേ ദൈവത്തിൻ സ്നേഹം', 'അനുഗ്രഹത്തിൻ അധിപതിയേ', 'ആത്മാവേ വന്നു എന്റെ മേൽ', 'ആശ്വാസത്തിന്നുറവിടമാം', 'ആശ്രയമായി എനിക്ക് യേശു']
  : ['அல்லேலூயா கர்த்தரையே', 'எந்தன் நாவில்', 'அழகாய் நிற்கும்', 'அழைத்தீரே', 'துதி கனம்']).map(pick).filter(Boolean);
const SEED = Math.max(1, +process.env.SEED || 1);
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
let seed = SEED; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const GROUPS = ML ? [['ത', 'ട', 'ദ'], ['ല', 'ള', 'ഴ'], ['ര', 'റ'], ['ന', 'ണ'], ['ച', 'ജ', 'ശ', 'സ'], ['പ', 'ബ', 'വ'], ['ക', 'ഗ'], ['ാ', ''], ['ി', 'ീ'], ['ു', 'ൂ'], ['െ', 'േ', 'ൈ'], ['ൻ', 'ൺ', 'ന്'], ['ൽ', 'ൾ'], ['്', '']]
  : [['த', 'ட', 'க'], ['ல', 'ள', 'ழ'], ['ர', 'ற'], ['ந', 'ன', 'ண'], ['ச', 'ஜ', 'ஸ'], ['ப', 'வ', 'ம'], ['ா', ''], ['ி', 'ீ'], ['ு', 'ூ'], ['ெ', 'ே', 'ை']];
// what the recogniser writes over music and unclear audio
const JUNK = ML ? ['ഞാൻ', 'എന്ത്', 'അതെ', 'നന്ദി', 'ശരി', 'എന്ന്', 'വളരെ'] : ['நான்', 'ஏன்', 'ஐயா', 'என்று', 'செய்யுங்கள்', 'ஏதாவது', 'வணக்கம்'];
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
  // a verse left out, a 15 s break (instrumental) in the middle, and a song that speeds up half-way
  if (s.slides.length >= 4) SC.push({ name: s.title.slice(0, 12) + ' skipverse', open: si, seq: s.slides.filter((x, k) => k !== 2).flat().map(l => [si, l]) });
  SC.push({ name: s.title.slice(0, 12) + ' pause', open: si, gapAt: Math.floor(linear(s).length / 2), seq: linear(s).map(l => [si, l]) });
  SC.push({ name: s.title.slice(0, 12) + ' faster', open: si, fastAt: Math.floor(linear(s).length / 2), seq: linear(s).map(l => [si, l]) });
  // jumps singers really make: every other line (1 3 5), a group sung again with a different ending
  // (1 2 3 1 2 3 1 2 4 1), and any line at random now and then
  { const Lc = linear(s);
    SC.push({ name: s.title.slice(0, 12) + ' odd135', open: si, seq: Lc.filter((x, k) => k % 2 === 0).map(l => [si, l]) });
    const pat = [0, 1, 2, 0, 1, 2, 0, 1, 3, 0], jm = []; for (let base = 0; base + 4 <= Lc.length; base += 4) pat.forEach(p => jm.push(Lc[base + p]));
    SC.push({ name: s.title.slice(0, 12) + ' jump1231', open: si, seq: jm.map(l => [si, l]) });
    const rj = []; let c = 0; for (let k = 0; k < Lc.length * 2; k++) { rj.push(Lc[c]); const r = rnd(); c = r < .5 ? Math.min(Lc.length - 1, c + 1) : r < .7 ? c : Math.floor(rnd() * Lc.length); }
    SC.push({ name: s.title.slice(0, 12) + ' anyjump', open: si, seq: rj.map(l => [si, l]) }); }
});
const L = +(process.argv[2] || .18), V = process.argv[3];
const HM = { n: 0, good: 0, ok: 0, tot: 0 }; const AG = {}, PT = {}; let tot = 0, good = 0, b1 = 0, bad = 0, wrongSong = 0, rows = [];
for (const spw of [.35, .6, 1.0]) for (const sc of SC) {
  seed = 7 + Math.round(spw * 100) + sc.name.length + (SEED - 1) * 7919;
  // timeline of words
  const words = []; let t = 5, prevSlide = null, prevSong = null;
  sc.seq.forEach(([si, li], k) => {
    const sl = songs[si].lines[li].slide; if (k && (sl !== prevSlide || si !== prevSong)) t += si !== prevSong ? 6 : 1.5 + rnd() * 3; prevSlide = sl; prevSong = si;
    const ws = songs[si].lines[li].text.split(/\s+/).filter(Boolean);
    if (sc.gapAt === k) t += 15;
    const sp = sc.fastAt != null && k >= sc.fastAt ? spw * .6 : spw;
    ws.forEach(w => { words.push({ t, w, si, li, k }); t += sp * (.8 + rnd() * .4); }); t += sp * .6;
  });
  const end = t + 1; const st = { song: sc.open >= 0 ? songs[sc.open].id : null, cur: -1 };
  let g = 0, n = 0, bb = 0, ws = 0, b1s = 0;
  for (let tc = 4.5; tc < end; tc += 3.3) {
    const inWin = words.filter(x => x.t > tc - 4.5 && x.t <= tc);
    let tx = transcript(inWin.map(x => x.w), L);
    // SPARSE=1: a clip gives 1-3 words only (measured live with Sarvam over a song: mostly 1-2 words a clip)
    if (process.env.SPARSE && tx) { const w = tx.split(' '), k = rnd() < .4 ? 1 : rnd() < .67 ? 2 : 3; const pickW = w.map((x, i) => [x, i, x.length + rnd() * 6]).sort((a, b) => b[2] - a[2]).slice(0, k).sort((a, b) => a[1] - b[1]); tx = pickW.map(x => x[0]).join(' '); }
    // WIN=1: the words of the clip before are matched with this one (Core.trackWin)
    if (process.env.WIN) tx = Core.trackWin(st, tx, tc * 1000);
    const r = Core.trackStep(T, st, tx, tc * 1000);
    if (r) { st.song = r.song; st.cur = r.line; if (r.why === 'hmm') HM.n++; }
    const sung = words.filter(x => x.t <= tc); if (!sung.length) continue;
    const now = sung[sung.length - 1], prevK = sc.seq[now.k - 1];
    if (st.hmm && st.song === songs[now.si].id) { const ixx = T.songs.find(x => x.id === st.song).ix; const mp = ixx.idx[st.hmm.map]; HM.tot++; if (mp != null && songs[now.si].lines[mp] && songs[now.si].lines[mp].text === songs[now.si].lines[now.li].text) HM.ok++; if (r && r.why === 'hmm' && songs[now.si].lines[r.line].text === songs[now.si].lines[now.li].text) HM.good++; }
    n++;
    const sid = songs[now.si].id, same = st.song === sid;
    if (!same) { ws++; bb++; continue; }
    const txt = i => i >= 0 ? songs[now.si].lines[i].text : '';
    if (txt(st.cur) === txt(now.li)) g++;
    else if (prevK && prevK[0] === now.si && txt(st.cur) === txt(prevK[1])) { b1++; b1s++; }
    else bb++;
    if (V && rows.length < 4000) rows.push(`${sc.name} spw${spw} t${tc.toFixed(1)} sung ${now.li} shown ${st.cur}${r ? ' ' + r.why : ''}`);
  }
  tot += n; good += g; bad += bb; wrongSong += ws;
  { const k = sc.name.split(' ').pop() + ' ' + spw; AG[k] = AG[k] || [0, 0, 0]; AG[k][0] += n; AG[k][1] += g; AG[k][2] += bb; }
  { const k = sc.name.split(' ').pop(); for (const kk of [k, k + ' ' + spw]) { PT[kk] = PT[kk] || [0, 0, 0, 0]; PT[kk][0] += n; PT[kk][1] += g; PT[kk][2] += b1s; PT[kk][3] += bb; } }
  if (V === 'sc') console.log(`${sc.name.padEnd(24)} spw ${spw} good ${(g / n * 100).toFixed(0)}% bad ${(bb / n * 100).toFixed(0)}% wrongsong ${ws}`);
}
if (V === 'rows') console.log(rows.join('\n'));
if (V === 'agg') for (const [k, [n, g, b]] of Object.entries(AG)) console.log(k.padEnd(16), 'right', (g / n * 100).toFixed(0) + '%', 'wrong', (b / n * 100).toFixed(0) + '%');
// pat: per singing pattern, all speeds together and at 0.6 s a word (right / one behind / wrong, %)
if (V === 'pat') for (const k of Object.keys(PT).filter(k => !k.includes(' '))) { const f = x => { const [n, g, b, w] = PT[x] || [1, 0, 0, 0]; return `right ${(g / n * 100).toFixed(1)} behind ${(b / n * 100).toFixed(1)} wrong ${(w / n * 100).toFixed(1)}`; }; console.log(`pat ${k.padEnd(10)} ${f(k)} | at 0.6: ${f(k + ' 0.6')}`); }
if (process.env.HMMSTAT) console.log('hmm moves', HM.n, 'right', HM.good, '| filter MAP right', (HM.ok / HM.tot * 100).toFixed(1) + '%');
console.log(`noise ${L}: right line ${(good / tot * 100).toFixed(1)}%  one behind ${((tot - good - bad) / tot * 100).toFixed(1)}%  wrong ${(bad / tot * 100).toFixed(1)}% (wrong song ${(wrongSong / tot * 100).toFixed(1)}%)  clips ${tot}`);
