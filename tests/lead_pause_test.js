// Lead's timing from the sound itself (Core.leadCue / Core.breathDip), simulated: a song sung line by line with a
// breath at each line end, a 12 s instrumental part and a silence, clips every 3.3 s answered 0.4 s later. A small
// copy of Lead's timing (next line when the line's words should be finished; at its end at once) runs with and
// without the breath cue. Checks: the next line appears earlier on average with it, never more than one line
// beyond what was heard, and never moves on during the instrumental part or the silence.
// node tests/lead_pause_test.js [v]
const Core = require('../js/core.js');
const RATE = 16000, CH = 2048, CHS = CH / RATE;                    // Mic: 2048-sample chunks at 16 kHz (0.128 s)
let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// 12 lines, each sung a little faster or slower than the one before (as singers do), and faster from line 7;
// an instrumental part after line 5, a silence after line 9
const N = [5, 4, 6, 5, 4, 5, 6, 4, 5, 5, 4, 6];
function timeline() {
  const words = [], sound = [], lineStart = []; let t = 2;
  const add = (from, to, kind) => sound.push({ from, to, kind });
  N.forEach((n, k) => {
    const spw = (k >= 6 ? .5 : .62) * (.8 + rnd() * .45);
    lineStart.push(t);
    for (let w = 0; w < n; w++) { words.push({ t, k, w, n }); add(t, t + spw * .92, 'sing'); add(t + spw * .92, t + spw, 'gap'); t += spw; }
    const br = .32 + rnd() * .2; add(t, t + br, 'breath'); t += br;    // a breath at the line end
    if (k === 4) { add(t, t + 12, 'band'); t += 12; }                  // instrumental part, loud, no words
    if (k === 8) { add(t, t + 6, 'quiet'); t += 6; }                   // the singers stop for a moment
  });
  return { words, sound, lineStart, end: t + 2 };
}
const RMS = { sing: .11, gap: .07, breath: .006, band: .075, quiet: .004 };
function chunksUpTo(tl, t) {
  const out = [];
  for (let c = Math.max(0, t - 6); c + CHS <= t; c += CHS) {
    const s = tl.sound.find(x => c + CHS / 2 >= x.from && c + CHS / 2 < x.to); const base = s ? RMS[s.kind] : .004;
    out.push({ n: CH, rms: base * (.85 + rnd() * .3) });
  }
  return out;
}
function run(useCue) {
  seed = 3; const tl = timeline();
  let shown = -1, heardLine = -1, spwEst = 1.6, nSpw = 0, last = null, timerAt = null, timerTo = -1, due = 0, lineSec = 3, clipEnd = 0, armed = -1;
  const shownAt = {}, events = []; let ahead2 = 0, badMoves = 0;
  const show = (k, why, t) => { if (k <= shown) return; shown = k; if (shownAt[k] == null) shownAt[k] = t; events.push([+t.toFixed(2), k, why]); if (shown > heardLine + 1) ahead2++; };
  const step = .04;
  for (let t = 0; t < tl.end; t += step) {
    // a clip ends every 3.3 s, its answer arrives 0.4 s later: the newest heard word says line and place
    const tc = Math.round((t - .4) / 3.3) * 3.3;
    if (Math.abs(t - (tc + .4)) < step / 2 && tc > 0) {
      const inWin = tl.words.filter(x => x.t > tc - 4.5 && x.t <= tc);
      if (inWin.length) {
        const w = inWin[inWin.length - 1]; clipEnd = tc;
        const gw = tl.words.indexOf(w);
        if (last && gw > last.gw) { const v = (tc - last.t) / (gw - last.gw); if (v > .12 && v < 3) { spwEst = nSpw ? spwEst * .6 + v * .4 : v; nSpw++; } }
        last = { gw, t: tc }; heardLine = Math.max(heardLine, w.k);
        const spw = nSpw ? spwEst : Math.max(spwEst, 1.6), late = t - tc;
        let left = (w.n - 1 - w.w) * spw - late;
        if (w.k > shown) show(w.k, 'clip', t);
        timerAt = null; armed = -1;
        if (left <= .35 && w.k + 1 < N.length) show(w.k + 1, 'end', t);
        else if (w.k + 1 < N.length) { timerAt = t + Math.max(.15, left - .2); timerTo = w.k + 1; due = timerAt; lineSec = w.n * spw; armed = w.k; }
      }
    }
    if (timerAt != null && t >= timerAt) { if (shown === timerTo - 1) show(timerTo, 'timer', t); timerAt = null; armed = -1; }
    // the breath cue, polled every 0.12 s while the timer waits (as Lead does)
    if (useCue && armed >= 0 && shown === armed && Math.round(t / step) % 3 === 0) {
      const ch = chunksUpTo(tl, t).slice(-40);
      if (Core.leadCue({ dueIn: due - t, lineSec, chunks: ch, rate: RATE, heardAgo: t - clipEnd })) {
        const s = tl.sound.find(x => t - .2 >= x.from && t - .2 < x.to);
        if (s && (s.kind === 'band' || s.kind === 'quiet')) badMoves++;
        show(armed + 1, 'pause', t); timerAt = null; armed = -1;
      }
    }
  }
  const delays = []; for (let k = 1; k < N.length; k++) if (shownAt[k] != null) delays.push(shownAt[k] - tl.lineStart[k]);
  return { avg: delays.reduce((a, b) => a + b, 0) / delays.length, delays, ahead2, badMoves, events, pauses: events.filter(e => e[2] === 'pause').length };
}
const off = run(false), on = run(true);
if (process.argv[2]) { console.log('without', off.events.map(e => e.join(':')).join(' ')); console.log('with   ', on.events.map(e => e.join(':')).join(' ')); }
console.log(`next line shown, seconds after it began (avg): without the breath cue ${off.avg.toFixed(2)}, with ${on.avg.toFixed(2)} (${on.pauses} lines on a breath)`);
console.log(`per line without: ${off.delays.map(x => x.toFixed(1)).join(' ')}`);
console.log(`per line with:    ${on.delays.map(x => x.toFixed(1)).join(' ')}`);
let fails = 0; const ok = (c, w) => { console.log((c ? 'ok   ' : 'FAIL ') + w); if (!c) fails++; };
ok(on.avg < off.avg - .1 && on.delays.every((d, i) => d <= off.delays[i] + .05), 'the next line appears earlier on average with the breath cue, and never later');
ok(on.ahead2 === 0 && off.ahead2 === 0, 'never more than one line beyond what was heard');
ok(on.badMoves === 0, 'no move on a dip during the instrumental part or the silence');
// the cue alone: a breath after singing is one; silence, a held instrumental, or singing going on is not
const mk = (...parts) => parts.flatMap(([rms, sec]) => Array.from({ length: Math.round(sec / CHS) }, () => ({ n: CH, rms })));
ok(Core.breathDip(mk([.1, 2], [.006, .35]), RATE), 'breathDip: a breath after singing');
ok(!Core.breathDip(mk([.004, 3]), RATE), 'breathDip: not silence');
ok(!Core.breathDip(mk([.1, 2], [.006, 2]), RATE), 'breathDip: not a long pause');
ok(!Core.breathDip(mk([.006, 2], [.1, 2]), RATE), 'breathDip: not while singing');
ok(!Core.leadCue({ dueIn: 4, lineSec: 3, chunks: mk([.1, 2], [.006, .35]), rate: RATE, heardAgo: 1 }), 'leadCue: not far from the line end');
ok(!Core.leadCue({ dueIn: .5, lineSec: 3, chunks: mk([.1, 2], [.006, .35]), rate: RATE, heardAgo: 9 }), 'leadCue: not when no words were heard for a while');
if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); } else console.log('lead pause checks passed');
