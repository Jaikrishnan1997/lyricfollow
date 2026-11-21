// Singing over Sarvam's live stream (Settings: "Singing: listen continuously", experimental), without the service:
// a mocked stream sends partial and final text as Sarvam does; Core.streamText must pass clip-like pieces to the
// tracker (not every partial), and the tracker must follow the song from them as it does from clips.
// node tests/stream_test.js
const Core = require('../js/core.js');
const ch = require('../vendor/songs-church.json').songs;
const al = ch.find(s => s.title.startsWith('அல்லேலூயா கர்த்தரையே'));
const lines = []; al.lyrics.replace(/\r/g, '').split(/\n\s*\n/).forEach((b, si) => b.split('\n').map(x => x.trim()).filter(Boolean).forEach(x => lines.push({ text: x, slide: si })));
let fails = 0; const ok = (c, w) => { console.log((c ? 'ok   ' : 'FAIL ') + w); if (!c) fails++; };

// A mock of the realtime socket: per sung line a phrase, its words arriving one by one as partials every 0.3 s,
// then the final text. Messages are JSON strings, as in SarvamLive.ws.onmessage.
class MockSocket {
  constructor(phrases) { this.msgs = []; let t = 1000; for (const p of phrases) { const w = p.split(' '); for (let k = 1; k <= w.length; k++) { this.msgs.push({ at: t, data: JSON.stringify({ event: 'transcript.partial', text: w.slice(0, k).join(' ') }) }); t += 300; } this.msgs.push({ at: t, data: JSON.stringify({ event: 'transcript.final', text: p }) }); t += 600; } }
  play(onmessage) { for (const m of this.msgs) onmessage({ data: m.data }, m.at); }
}
// the app's handler (SarvamLive.song), without the page: parse, Core.streamText, then the tracker
const T = Core.trackIndex([{ id: 'A', lines }]);
const st = { song: 'A', cur: -1 }, sf = {}, fed = [], path = [];
const sung = [0, 1, 2, 3, 4, 5, 6, 7];
new MockSocket(sung.map(i => lines[i].text)).play((ev, now) => {
  const m = JSON.parse(ev.data), tx = Core.streamText(sf, m, now);
  if (!tx) return; fed.push([m.event, tx]);
  const r = Core.trackStep(T, st, tx, now); if (r) { st.song = r.song; st.cur = r.line; }
  path.push(st.cur);
});
const partials = fed.filter(x => x[0] === 'transcript.partial').length, finals = fed.filter(x => x[0] === 'transcript.final').length;
ok(fed.length < new MockSocket(sung.map(i => lines[i].text)).msgs.length / 2, `only some messages reach the tracker (${fed.length} of ${new MockSocket(sung.map(i => lines[i].text)).msgs.length})`);
ok(finals >= sung.length - 1, `the final text of (nearly) every phrase is passed on (${finals} of ${sung.length})`);
ok(st.cur === 7, `the tracker follows the song from the stream to line 7 (at ${st.cur}; path ${path.join(' ')})`);
// streamText rules
const s2 = {};
ok(Core.streamText(s2, { event: 'transcript.partial', text: 'one' }, 2000) === null, 'a one-word partial is not passed on');
ok(Core.streamText(s2, { event: 'transcript.partial', text: 'one two' }, 2100) === 'one two', 'two new words are');
ok(Core.streamText(s2, { event: 'transcript.partial', text: 'one two three four' }, 2600) === null, 'not again within 1.5 s');
ok(Core.streamText(s2, { event: 'transcript.final', text: 'one two three four' }, 2700) === 'one two three four', 'the final text with new words is');
ok(Core.streamText(s2, { event: 'transcript.final', text: '' }, 2800) === null && Core.streamText(s2, { event: 'error' }, 2900) === null, 'empty text and other events are not');
if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); } else console.log('stream checks passed');
