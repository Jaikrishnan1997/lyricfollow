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
  for (const u of said) {
    const w = u.split(/\s+/).filter(Boolean), m = [];
    if (o.finalsOnly) { step(u, ''); m.push(ev); marks.push(m); continue; }
    for (let i = 1; i <= w.length; i++) { step('', w.slice(0, i).join(' ')); m.push(ev); }
    step(u, ''); m.push(ev); marks.push(m);
    now += o.gap || 1500;
  }
  return { screen, heard: heard.map(h => label(h.r)), sureN: heard.filter(h => h.sure).length, asks, shownAt, marks };
}

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
module.exports = { run };
if (require.main === module) { console.log(fails ? `${fails} stream check(s) failed` : 'stream checks passed'); if (fails) process.exitCode = 1; }
