// Operator corrections and the learned singing order, on the tracker alone (no browser):
//  - Core.trackManual: the line the operator chose is the truth; weak clips pointing elsewhere do not move it for
//    8 s, the next line and a clear clip still do, and after the hold the usual rules apply again
//  - Core.learnAdd / usualW: a move counts once a service, needs two services, a rare move never counts
// node tests/operator_test.js
const Core = require('../js/core.js');
const ch = require('../vendor/songs-church.json').songs;
const al = ch.find(s => s.title.startsWith('அல்லேலூயா கர்த்தரையே'));
const lines = []; al.lyrics.replace(/\r/g, '').split(/\n\s*\n/).forEach((b, si) => b.split('\n').map(x => x.trim()).filter(Boolean).forEach(x => lines.push({ text: x, slide: si })));
const T = Core.trackIndex([{ id: 'A', lines }]);
let fails = 0; const ok = (c, what) => { console.log((c ? 'ok   ' : 'FAIL ') + what); if (!c) fails++; };
const words = i => lines[i].text;

// 1. follow lines 0..5, then the operator goes back to line 2 (the singers repeated it)
const st = { song: 'A', cur: -1 }; let t = 10000;
const feed = (text, dt) => { t += dt || 3300; const r = Core.trackStep(T, st, text, t); if (r) { st.song = r.song; st.cur = r.line; } return r; };
for (let i = 0; i <= 5; i++) feed(words(i));
ok(st.cur === 5, `follows the song to line 5 (at ${st.cur})`);
Core.trackManual(T, st, 'A', 2, t, 8000);
ok(st.cur === 2 && st.hold && st.hold.p === 2, 'operator correction: line 2 taken as the truth and held');
// weak evidence for line 5 again (one word shared with other lines): held
const common = 'துதியுங்கள்';
feed(common, 1500);
ok(st.cur === 2, `one common word does not move a held line (at ${st.cur})`);
feed(words(5).split(' ')[0], 2000);
ok(st.cur === 2, `one telling word of line 5 within the hold does not take the screen back to it (at ${st.cur})`);
// the next line sung: moves on at once
feed(words(3), 2000);
ok(st.cur === 3, `the next line still moves during the hold (at ${st.cur})`);
// after the hold, a clear far line moves as usual
t += 9000; feed(words(8)); feed(words(9));
ok(st.cur >= 8 && st.cur <= 9, `after the hold, clear lines further on are followed again (at ${st.cur})`);

// 2. a clear clip during a hold still moves (the operator clicked the wrong line)
const st2 = { song: 'A', cur: -1 }; let t2 = 5000;
Core.trackManual(T, st2, 'A', 0, t2, 8000);
const r2 = Core.trackStep(T, st2, words(9) + ' ' + words(10), t2 + 2000);
ok(r2 && Math.abs(r2.line - 10) <= 1, `a long clear clip of lines 9-10 moves even during the hold (to ${r2 ? r2.line : 'none'})`);

// 3. learning: once a service, two services needed, rare moves never count
const L = {};
ok(Core.learnAdd(L, 'a', 'c', 'd1') === true && Core.learnAdd(L, 'a', 'c', 'd1') === false, 'a move counts once a service (day)');
ok(Core.usualW(L.a, 'c') === 0, 'one service: not yet a pattern');
Core.learnAdd(L, 'a', 'c', 'd2');
ok(Core.usualW(L.a, 'c') > .5, `two services: a pattern (${Core.usualW(L.a, 'c').toFixed(2)})`);
for (const d of ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12']) Core.learnAdd(L, 'a', 'b', d);
ok(Core.usualW(L.a, 'c') === 0, 'a move made in 2 of many services is too rare to count');
for (let i = 0; i < 20; i++) Core.learnAdd(L, 'a', 'b', 'x' + i);
ok(L.a.b.n === 9, 'counts are capped (9)');

// 4. a learned jump makes the follower take it on less evidence
const ix = T.songs[0].ix, K = p => ix.K[p];
const learned = { A: {} }; Core.learnAdd(learned.A, K(7), K(4), 's1'); Core.learnAdd(learned.A, K(7), K(4), 's2');
const run = lr => { const s = { song: 'A', cur: ix.idx[7], learned: lr }; let tt = 1000; s.last = null; const r = Core.trackStep(T, s, words(ix.idx[4]).split(' ')[0], tt); return r ? r.line : s.cur; };
const withL = run(learned), without = run(null);
ok(withL === ix.idx[4] && without !== ix.idx[4], `learned jump 7 -> 4 taken on one word (with learning: ${withL}, without: ${without})`);

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); } else console.log('operator checks passed');
