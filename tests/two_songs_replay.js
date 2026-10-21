// Two songs from the live test (tests/live_two_songs.json): the user's own Alleluya (chorus typed once) and Enthan,
// Sarvam clips without key words. How often the tracker shows the line being sung (judged by its text, so any copy
// of a chorus line counts), and when it switches to the second song.  node tests/two_songs_replay.js [v]
const Core = require('../js/core.js'), Tidy = require('../js/tidy.js'), fs = require('fs');
const all = ['songs-ta-fgs', 'songs-church'].flatMap(f => require('../vendor/' + f + '.json').songs);
function parse(text) { const so = Tidy.singOrder(text); if (so) text = so.text; const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length); const ls = []; blocks.forEach((b, si) => b.forEach(x => ls.push({ text: x, slide: si }))); Core.prepare(ls.map(l => l.text)).forEach((p, i) => Object.assign(ls[i], p)); return ls; }
const al = require('../vendor/songs-church.json').songs.find(s => s.title.startsWith('அல்லேலூயா கர்த்தரையே')), b = al.lyrics.split(/\n\s*\n/);
const A = [b[0], b[1], b[2], b[4], b[6], b[8]].join('\n\n');
const E = ['எந்தன் நாவில் புதுபாட்டு', 'எந்தன் நாவில் புதுபாட்டு\nஎந்தன் இயேசு தருகிறார்', 'ஆனந்தம் கொள்ளுவேன்\nஅவரை நான் பாடுவேன் -உயிருள்ள\nநாள் வரையில் அல்லேலூயா', 'பாவ இருள் என்னை வந்து\nசூழ்ந்து கொள்கையில் -தேவனவர்\nதீபமாய் என்னை தேற்றினார்', 'வாதை நோயும் வந்தபோது\nவேண்டல் கேட்டிட்டார் -பாதை காட்டி\nதுன்பமெல்லாம் நீக்கிமீட்டிட்டார்', 'சேற்றில் வீழ்ந்த என்னையவர்\nதூக்கியெடுத்தார் -நாற்றமெல்லாம்\nஜீவ இரத்தம் கொண்டு மாற்றினார்', 'தந்தை தாயும் நண்பர் உற்றார்\nயாவுமாயினார் – நிந்தை தாங்கி\nஎங்குமவர் மேன்மை சொல்லுவேன்', 'இவ்வுலக பாடு என்னை\nஎன்னை செய்திடும் -அவ்வுலக\nவாழ்க்கைக் காண காத்திருக்கிறேன்'].join('\n\n');
const others = ['அழகாய் நிற்கும்', 'அழைத்தீரே', 'துதி கனம்'].map(t => all.find(s => s.title.startsWith(t))).map(s => ({ id: s.title, lines: parse(s.lyrics) }));
const SONGS = { A: parse(A), E: parse(E) };
const T = Core.trackIndex([{ id: 'A', lines: SONGS.A }, { id: 'E', lines: SONGS.E }, ...others]);
const run = JSON.parse(fs.readFileSync(__dirname + '/live_two_songs.json', 'utf8'));
const truthAt = t => { let r = null; for (const x of run.truth) if (t >= x[0]) r = x; return r; };
const st = { song: 'A', cur: -1 }; let ok = 0, near = 0, n = 0, sw = null; const rows = [];
for (const [t, txt] of run.clips) {
  const r = txt ? Core.trackStep(T, st, txt, t * 1000) : null;
  if (r) { if (r.song !== st.song && r.song === 'E' && sw == null) sw = t; st.song = r.song; st.cur = r.line; }
  const tr = truthAt(t); if (!tr) continue; n++;
  const shown = SONGS[st.song] && SONGS[st.song][st.cur], want = SONGS[tr[1]][tr[2]];
  const good = st.song === tr[1] && shown && shown.text === want.text;
  const nb = st.song === tr[1] && shown && SONGS[tr[1]].some((l, i) => l.text === want.text && Math.abs(i - st.cur) === 1);
  if (good) ok++; else if (nb) near++;
  rows.push(`${String(t).padEnd(6)} ${txt.slice(0, 28).padEnd(28)} want ${tr[1]}${tr[2]} got ${st.song.slice(0, 1)}${st.cur} ${r ? r.why : ''} ${good ? '' : nb ? '~' : 'X'}`);
}
if (process.argv[2]) console.log(rows.join('\n'));
console.log(`right line ${ok}/${n} (${(100 * ok / n).toFixed(0)}%)  one off ${near}  switch to Enthan at ${sw} (singing from ${run.switchAt})`);
