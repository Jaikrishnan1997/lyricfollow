// Spoken references as the live recognisers deliver them: each utterance arrives as growing partials (word by word,
// the whole utterance so far each time), then a final; several utterances in a row. Drives Bible.refStep and
// Bible.heardAdd, the same code app.js runs, and checks the ordered list of references that reached the screen,
// the heard list, and how many partials after the last word of a reference it took to show it.
//   node tests/ref_stream_test.js          (VERBOSE=1 prints every scenario)
const B = require('../js/bible.js');
require('../bible/kjv.js');
const label = r => B.refLabel({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }, 'en');

/** Feed utterances (strings) through refStep. o: { pause: false -> all said as one utterance, conf, engine, plan }.
 *  Returns { screen: [labels in order], heard: [labels newest first], sure, asks, events, shownAt: [{ ref, event }] }. */
function run(utts, o) {
  o = o || {};
  const st = B.newRefState(), heard = [], screen = [], asks = [], shownAt = [];
  let now = 1e9, cur = null, lastRefAt = 0, ev = 0;
  const said = o.pause === false ? [utts.join(' ')] : utts;
  const ctx = () => ({ engine: o.engine || 'sarvam', prefer: new Set((o.plan || []).map(p => p.book)), plan: o.plan || [], inPlan: r => (o.plan || []).some(p => p.book === r.book && p.ch === r.ch),
    now, lastRefAt, screen: cur, screenAny: cur, singing: () => false });
  const step = (finals, interim) => {
    ev++; now += finals ? 400 : 250;
    const out = B.refStep(st, { finals, interim, conf: o.conf }, ctx());
    for (const a of out.acts) {
      if (a.kind !== 'ref' && a.kind !== 'update') continue;
      const res = B.heardAdd(heard, a.r, 'ref', a.sure, now, { auto: true, screenKey: cur ? B.refKey(cur) : '' });
      lastRefAt = now;
      if (res.show) { cur = Object.assign({}, res.h.r); screen.push(label(cur)); shownAt.push({ ref: label(cur), event: ev }); }
      else if (!a.sure && !res.dup) asks.push(label(a.r));
    }
  };
  const marks = [];   // event number of each word's partial, per utterance
  if (o.events) { for (const [k, t] of o.events) step(k === 'f' ? t : '', k === 'f' ? '' : t); return { screen, heard: heard.map(h => label(h.r)), sureN: heard.filter(h => h.sure).length, asks, shownAt, marks }; }
  for (const u of said) {
    const w = u.split(/\s+/).filter(Boolean), m = [];
    if (o.finalsOnly) { step(u, ''); m.push(ev); marks.push(m); continue; }
    for (let i = 1; i <= w.length; i++) { step('', w.slice(0, i).join(' ')); m.push(ev); }
    step(u, ''); m.push(ev); marks.push(m);
    now += o.gap || 1500;
  }
  return { screen, heard: heard.map(h => label(h.r)), sureN: heard.filter(h => h.sure).length, asks, shownAt, marks };
}

if (require.main !== module) { module.exports = { run }; return; }
let fails = 0; const V = !!process.env.VERBOSE;
function check(name, cond, info) { if (!cond) fails++; if (!cond || V) console.log((cond ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- the bug the owner hit: "when I say Genesis it goes to Deuteronomy, comes back to Genesis" ----------
const GD = {
  en: ['Genesis chapter 3 verse 4', 'Deuteronomy chapter 6 verse 4'],
  ta: ['ஆதியாகமம் மூன்றாவது அதிகாரம் நான்காவது வசனம்', 'உபாகமம் ஆறாவது அதிகாரம் நான்காவது வசனம்'],
  ml: ['ഉല്പത്തി മൂന്നാം അദ്ധ്യായം നാലാം വാക്യം', 'ആവർത്തനം ആറാം അദ്ധ്യായം നാലാം വാക്യം'],
  hi: ['उत्पत्ति अध्याय तीन पद चार', 'व्यवस्थाविवरण अध्याय छह पद चार']
};
const G = 'Genesis 3:4', D = 'Deuteronomy 6:4';
for (const [lang, [g, d]] of Object.entries(GD)) for (const pause of [false, true]) for (const rev of [false, true]) {
  const utts = rev ? [d, g] : [g, d], want = rev ? [D, G] : [G, D];
  const r = run(utts, { pause });
  check(`${lang} ${rev ? 'Deut then Gen' : 'Gen then Deut'} ${pause ? 'with a pause' : 'in one breath'}`,
    same(r.screen, want) && r.heard.length === 2 && !r.screen.includes('Deuteronomy 3:4') && !r.screen.includes('Genesis 6:4'),
    `screen ${JSON.stringify(r.screen)} heard ${JSON.stringify(r.heard)}`);
}

// ---------- more shapes of the same thing ----------
const S = (name, utts, o, want, heardN) => { const r = run(utts, o); check(name, same(r.screen, want) && (heardN == null || r.heard.length === heardN), `screen ${JSON.stringify(r.screen)} heard ${JSON.stringify(r.heard)} asks ${JSON.stringify(r.asks)}`); return r; };
S('one final holding both (clip engines)', ['Genesis chapter 3 verse 4 Deuteronomy chapter 6 verse 4'], { finalsOnly: true }, [G, D], 2);
S('one final holding both, Tamil', [GD.ta.join(' ')], { finalsOnly: true }, [G, D], 2);
S('book said, a pause, then its numbers (ta)', ['ஆதியாகமம்', 'மூன்றாவது அதிகாரம் நான்காவது வசனம்'], {}, [G], 1);
S('book at the end of one utterance, numbers in the next (ta)', ['ஆதியாகமம் மூன்றாவது அதிகாரம் நான்காவது வசனம் உபாகமம்', 'ஆறாவது அதிகாரம் நான்காவது வசனம்'], {}, [G, D], 2);
S('pieces with words between (en)', ['turn to Genesis chapter three and verse four'], {}, [G], 1);
S('open your Bibles, Genesis, third chapter, we will read from verse four', ['open your Bibles Genesis third chapter we will read from verse four'], {}, [G], 1);
S('twenty one is never twenty (en)', ['John chapter 3 verse twenty one'], {}, ['John 3:21'], 1);
S('இருபத்தி ஒன்றாம் is never 20 (ta)', ['யோவான் மூன்றாம் அதிகாரம் இருபத்தி ஒன்றாம் வசனம்'], {}, ['John 3:21'], 1);
S('Malayalam ഇരുപത്തിയൊന്നാം', ['യോഹന്നാൻ മൂന്നാം അദ്ധ്യായം ഇരുപത്തിയൊന്നാം വാക്യം'], {}, ['John 3:21'], 1);
{ const r = run(['John chapter 3 verses 16 to 18 and then we pray'], {});
  check('a range said after the verse updates the same entry', r.heard.length === 1 && r.heard[0] === 'John 3:16–18' && r.screen[r.screen.length - 1] === 'John 3:16–18' && r.screen.every(x => x.startsWith('John 3:16')), `screen ${JSON.stringify(r.screen)} heard ${JSON.stringify(r.heard)}`); }
S('a revised partial does not show it twice', [], { events: [['p', 'Genesis chapter 3 verse 4'], ['p', 'Genesis chapter 3 verse 4 and'], ['p', 'Genesis chapter 3 verse 4 and Deuteronomy'], ['p', 'Genesis chapter three verse 4 and Deuteronomy chapter'], ['p', 'Genesis chapter three verse 4 and Deuteronomy chapter 6 verse 4'], ['p', 'Genesis chapter three verse 4 and Deuteronomy chapter 6 verse 4 we'], ['f', 'Genesis chapter three verse four and Deuteronomy chapter six verse four']] }, [G, D], 2);
S('the live Sarvam transcript (ta): ஆதி அகம மூன்றாவது தவத்து மூணாவது வசனம்', ['ஆதி அகம மூன்றாவது தவத்து மூணாவது வசனம்'], {}, ['Genesis 3:3'], 1);
S('the same reference said again later in the utterance: shown once', ['John 3 16 that is John 3 16'], {}, ['John 3:16'], 1);

// ---------- "same chapter" and "next verse": move within what is on screen (only if shown in the last 5 minutes) ----------
for (const [lang, first, same, next] of [
  ['en', 'Genesis chapter 3 verse 4', 'same chapter verse 10', 'next verse'],
  ['ta', 'ஆதியாகமம் மூன்றாவது அதிகாரம் நான்காவது வசனம்', 'அதே அதிகாரம் பத்தாவது வசனம்', 'அடுத்த வசனம்'],
  ['ml', 'ഉല്പത്തി മൂന്നാം അദ്ധ്യായം നാലാം വാക്യം', 'അതേ അദ്ധ്യായം പത്താം വാക്യം', 'അടുത്ത വാക്യം'],
  ['hi', 'उत्पत्ति अध्याय तीन पद चार', 'उसी अध्याय का दसवाँ पद', 'अगला पद']]) {
  S(`${lang}: next verse after ${G}`, [first, next], {}, [G, 'Genesis 3:5'], 2);
  S(`${lang}: same chapter, verse 10, then next verse`, [first, same, next], {}, [G, 'Genesis 3:10', 'Genesis 3:11'], 3);
  S(`${lang}: next verse with nothing shown does nothing`, [next], {}, [], 0);
  S(`${lang}: next verse 6 minutes later does nothing`, [first, next], { gap: 360000 }, [G], 1);
}

// ---------- latency: partials after the last word of the reference until it is on screen (0 = on that word) ----------
const LAT = {
  en: 'John chapter 3 verse 16', ta: 'யோவான் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்', ml: 'യോഹന്നാൻ മൂന്നാം അദ്ധ്യായം പതിനാറാം വാക്യം', hi: 'यूहन्ना अध्याय तीन पद सोलह',
  'en bare': 'John 3 16', 'ta book last': 'மூன்றாம் அதிகாரம் பதினாறாம் வசனம் யோவான்'
};
const lat = {};
for (const [k, u] of Object.entries(LAT)) {
  const r = run([u + ' and we read'], {});
  const lastWord = u.split(' ').length, ev = r.shownAt[0] ? r.shownAt[0].event : null;
  lat[k] = ev == null ? 'never' : ev - r.marks[0][lastWord - 1];
  check(`latency ${k}: shown ${lat[k]} partial(s) after the last word`, ev != null && lat[k] <= 1);
}
console.log('latency (partials after the last word):', JSON.stringify(lat));
// ---------- the must-not-match sentences, word by word: nothing reaches the screen ----------
{ const NEG = require('./ref_negatives.js'); let sure = 0, ask = 0; const bad = [];
  for (const line of NEG) { const r = run([line], {}); sure += r.screen.length; ask += r.asks.length; if (r.screen.length) bad.push(`${JSON.stringify(r.screen)} | ${line}`); }
  check(`negatives word by word: 0 of ${NEG.length} on screen (asked ${ask})`, sure === 0, bad.join('\n     '));
  console.log(`negatives (${NEG.length}): sure ${sure}, asked ${ask}`); }

// ---------- ordinary sermon talk, word by word: never sure; how many are only offered (asked) ----------
{
  const { talk } = require('./sermon_talk.js'), res = {};
  for (const lang of ['en', 'ta', 'ml', 'hi']) {
    let sure = 0, ask = 0; const bad = [];
    for (const line of talk(lang, 300)) { const r = run([line], {}); sure += r.screen.length; ask += r.asks.length; if (r.screen.length || (V && r.asks.length)) bad.push(`${r.screen.length ? 'SURE' : 'ask '} ${JSON.stringify(r.screen.concat(r.asks))} | ${line}`); }
    res[lang] = { sure, ask };
    check(`sermon talk ${lang}: 0 sure of 300 (asked ${ask})`, sure === 0, bad.slice(0, 12).join('\n     '));
  }
  console.log('sermon talk (300 lines each):', JSON.stringify(res));
}
// ---------- review v83: English "then" is not "ten" (its sound key is the same) ----------
for (const [u, want] of [['Genesis 1 2 then Exodus 20 3', ['Genesis 1:2', 'Exodus 20:3']], ['read Genesis 1 2 then we go on', ['Genesis 1:2']],
  ['Genesis 1 2 then 3', ['Genesis 1:2']], ['John chapter ten verse ten', ['John 10:10']]]) {
  const r = run([u], {}); check(`then is not ten: ${u}`, same(r.screen, want), JSON.stringify(r.screen));
}
{ console.log(fails ? `${fails} stream check(s) failed` : 'stream checks passed'); if (fails) process.exitCode = 1; }
