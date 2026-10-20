/* Reference-recognition test generator: simulates many speakers saying Bible references in Malayalam, Tamil and
 * English - native script (as ml-IN / ta-IN recognisers write it) and English letters (as en-IN writes Manglish /
 * Tanglish) - with different number styles, word orders, filler words and mishearings.
 * Run: node tests/refgen.js [count]   → accuracy per language and channel, plus the failures. */
const C = require('../js/core.js'), B = require('../js/bible.js');
require('../bible/kjv.js');      // real chapter/verse counts, so every generated reference exists
const vmax = (b, c) => B.chapter('kjv', b, c).length || 20;
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];

// Spoken book names: [book index, Malayalam forms, Tamil forms, English forms]
const BOOKS = [
  [0, ['ഉല്പത്തി', 'ഉൽപത്തി പുസ്തകം', 'ഉല്പത്തിയിൽ'], ['ஆதியாகமம்', 'ஆதியாகமத்தில்'], ['Genesis']],
  [1, ['പുറപ്പാട്', 'പുറപ്പാടു പുസ്തകം'], ['யாத்திராகமம்'], ['Exodus']],
  [4, ['ആവർത്തനം', 'ആവർത്തന പുസ്തകം'], ['உபாகமம்'], ['Deuteronomy']],
  [5, ['യോശുവ'], ['யோசுவா'], ['Joshua']],
  [8, ['ഒന്നാം ശമൂവേൽ', '1 ശമുവേൽ'], ['முதலாம் சாமுவேல்', '1 சாமுவேல்', 'ஒன்றாம் சாமுவேல்'], ['First Samuel', '1st Samuel']],
  [11, ['രണ്ടാം രാജാക്കന്മാർ', 'രണ്ട് രാജാക്കന്മാർ', '2 രാജാക്കന്മാർ'], ['இரண்டாம் இராஜாக்கள்', 'இரண்டாம் ராஜாக்கள்', '2 ராஜாக்கள்'], ['Second Kings', '2 Kings']],
  [17, ['ഇയ്യോബ്', 'ഇയ്യോബിന്റെ പുസ്തകം'], ['யோபு'], ['Job']],
  [18, ['സങ്കീർത്തനം', 'സങ്കീർത്തനങ്ങൾ', 'സങ്കീർത്തനങ്ങളിൽ'], ['சங்கீதம்', 'சங்கீதங்கள்', 'சங்கீத புஸ்தகம்'], ['Psalm', 'Psalms']],
  [19, ['സദൃശവാക്യങ്ങൾ', 'സദൃശ്യവാക്യം'], ['நீதிமொழிகள்'], ['Proverbs']],
  [22, ['യെശയ്യാവ്', 'യെശയ്യാ', 'യശയ്യാവ്'], ['ஏசாயா', 'ஏசாயா தீர்க்கதரிசி'], ['Isaiah']],
  [23, ['യിരെമ്യാവ്', 'യിരെമ്യാവു'], ['எரேமியா'], ['Jeremiah']],
  [26, ['ദാനീയേൽ'], ['தானியேல்'], ['Daniel']],
  [39, ['മത്തായി', 'മത്തായിയുടെ സുവിശേഷം', 'മത്തായി സുവിശേഷം'], ['மத்தேயு', 'மத்தேயு சுவிசேஷம்', 'மத்தேயு எழுதின சுவிசேஷம்'], ['Matthew']],
  [40, ['മർക്കോസ്', 'മർക്കൊസ്'], ['மாற்கு'], ['Mark']],
  [41, ['ലൂക്കോസ്', 'ലൂക്കൊസിന്റെ സുവിശേഷം'], ['லூக்கா'], ['Luke']],
  [42, ['യോഹന്നാൻ', 'യോഹന്നാന്റെ സുവിശേഷം', 'യോഹന്നാൻ സുവിശേഷം'], ['யோவான்', 'யோவான் சுவிசேஷம்', 'யோவான் எழுதின சுவிசேஷம்'], ['John', 'Gospel of John']],
  [43, ['അപ്പൊസ്തലപ്രവൃത്തികൾ', 'പ്രവൃത്തികൾ', 'അപ്പോസ്തല പ്രവർത്തികൾ'], ['அப்போஸ்தலர்', 'அப்போஸ்தலருடைய நடபடிகள்', 'அப்போஸ்தலர் நடபடிகள்'], ['Acts']],
  [44, ['റോമർ', 'റോമാ ലേഖനം', 'റോമർക്കുള്ള ലേഖനം'], ['ரோமர்', 'ரோமருக்கு எழுதிய நிருபம்'], ['Romans']],
  [45, ['ഒന്നാം കൊരിന്ത്യർ', '1 കൊരിന്ത്യർ', 'ഒന്ന് കൊരിന്ത്യർ'], ['முதலாம் கொரிந்தியர்', '1 கொரிந்தியர்', 'ஒன்றாம் கொரிந்தியர்'], ['First Corinthians', '1 Corinthians']],
  [46, ['രണ്ടാം കൊരിന്ത്യർ', '2 കൊരിന്ത്യർ'], ['இரண்டாம் கொரிந்தியர்', '2 கொரிந்தியர்'], ['Second Corinthians']],
  [47, ['ഗലാത്യർ'], ['கலாத்தியர்'], ['Galatians']],
  [48, ['എഫെസ്യർ', 'എഫേസ്യർ'], ['எபேசியர்'], ['Ephesians']],
  [49, ['ഫിലിപ്പിയർ', 'ഫിലിപ്യർ'], ['பிலிப்பியர்'], ['Philippians']],
  [53, ['ഒന്നാം തിമൊഥെയൊസ്', '1 തിമോത്തി'], ['முதலாம் தீமோத்தேயு', '1 தீமோத்தேயு'], ['First Timothy']],
  [54, ['രണ്ടാം തിമൊഥെയൊസ്', '2 തിമൊഥെയൊസ്'], ['இரண்டாம் தீமோத்தேயு', '2 தீமோத்தேயு'], ['Second Timothy']],
  [57, ['എബ്രായർ', 'എബ്രായ ലേഖനം'], ['எபிரெயர்'], ['Hebrews']],
  [58, ['യാക്കോബ്', 'യാക്കോബിന്റെ ലേഖനം'], ['யாக்கோபு'], ['James']],
  [59, ['ഒന്നാം പത്രൊസ്', '1 പത്രോസ്'], ['முதலாம் பேதுரு', '1 பேதுரு'], ['First Peter']],
  [61, ['ഒന്നാം യോഹന്നാൻ', '1 യോഹന്നാൻ'], ['முதலாம் யோவான்', '1 யோவான்'], ['First John']],
  [65, ['വെളിപ്പാട്', 'വെളിപ്പാടു പുസ്തകം'], ['வெளிப்படுத்தின விசேஷம்', 'வெளிப்படுத்தல்'], ['Revelation', 'Revelations']]
];
const ML_CARD = ['', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒമ്പത്', 'പത്ത്', 'പതിനൊന്ന്', 'പന്ത്രണ്ട്', 'പതിമൂന്ന്', 'പതിനാല്', 'പതിനഞ്ച്', 'പതിനാറ്', 'പതിനേഴ്', 'പതിനെട്ട്', 'പത്തൊമ്പത്', 'ഇരുപത്'];
const ML_ORD = ['', 'ഒന്നാം', 'രണ്ടാം', 'മൂന്നാം', 'നാലാം', 'അഞ്ചാം', 'ആറാം', 'ഏഴാം', 'എട്ടാം', 'ഒമ്പതാം', 'പത്താം', 'പതിനൊന്നാം', 'പന്ത്രണ്ടാം', 'പതിമൂന്നാം', 'പതിനാലാം', 'പതിനഞ്ചാം', 'പതിനാറാം', 'പതിനേഴാം', 'പതിനെട്ടാം', 'പത്തൊമ്പതാം', 'ഇരുപതാം'];
const TA_CARD = ['', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது', 'பத்து', 'பதினொன்று', 'பன்னிரண்டு', 'பதிமூன்று', 'பதினான்கு', 'பதினைந்து', 'பதினாறு', 'பதினேழு', 'பதினெட்டு', 'பத்தொன்பது', 'இருபது'];
const TA_ORD = ['', 'ஒன்றாம்', 'இரண்டாம்', 'மூன்றாம்', 'நான்காம்', 'ஐந்தாம்', 'ஆறாம்', 'ஏழாம்', 'எட்டாம்', 'ஒன்பதாம்', 'பத்தாம்', 'பதினொன்றாம்', 'பன்னிரண்டாம்', 'பதிமூன்றாம்', 'பதினான்காம்', 'பதினைந்தாம்', 'பதினாறாம்', 'பதினேழாம்', 'பதினெட்டாம்', 'பத்தொன்பதாம்', 'இருபதாம்'];
const TA_ORD2 = ['', 'ஒன்றாவது', 'இரண்டாவது', 'மூன்றாவது', 'நான்காவது', 'ஐந்தாவது', 'ஆறாவது', 'ஏழாவது', 'எட்டாவது', 'ஒன்பதாவது', 'பத்தாவது', 'பதினொன்றாவது', 'பன்னிரண்டாவது', 'பதிமூன்றாவது', 'பதினான்காவது', 'பதினைந்தாவது', 'பதினாறாவது', 'பதினேழாவது', 'பதினெட்டாவது', 'பத்தொன்பதாவது', 'இருபதாவது'];
const TA_COL = ['', 'ஒண்ணாவது', 'ரெண்டாவது', 'மூணாவது', 'நாலாவது', 'அஞ்சாவது', 'ஆறாவது', 'ஏழாவது', 'எட்டாவது', 'ஒம்பதாவது', 'பத்தாவது'];
const EN_CARD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const EN_ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
const ML_T = { 20: 'ഇരുപത്തി', 30: 'മുപ്പത്തി', 40: 'നാല്പത്തി' }, TA_T = { 20: 'இருபத்தி', 30: 'முப்பத்தி', 40: 'நாற்பத்தி' }, EN_T = { 20: 'twenty', 30: 'thirty', 40: 'forty' };
function num(lang, n, ord) {
  const style = rnd();
  if (style < .3 || n > 49) return String(n) + (lang === 'ta' && ord && rnd() < .3 ? pick(['-ஆம்', 'ம்', ' ஆம்']) : lang === 'ml' && ord && rnd() < .3 ? '-ാം' : '');
  if (lang === 'ml') { if (n <= 20) return (ord ? ML_ORD : ML_CARD)[n]; const t = Math.floor(n / 10) * 10, u = n % 10; return u ? ML_T[t] + (ord ? ML_ORD : ML_CARD)[u].replace(/^ഒ/, 'യൊ').replace(/^എ/, 'യെ') : (ord ? ML_ORD : ML_CARD)[20].replace('ഇരുപ', t === 30 ? 'മുപ്പ' : t === 40 ? 'നാല്പ' : 'ഇരുപ'); }
  if (lang === 'ta') { if (n <= 10 && ord && rnd() < .35) return TA_COL[n]; if (n <= 20) return (ord ? (rnd() < .5 ? TA_ORD : TA_ORD2) : TA_CARD)[n]; const t = Math.floor(n / 10) * 10, u = n % 10; const TA_TEN = { 20: ['இருபது', 'இருபதாம்'], 30: ['முப்பது', 'முப்பதாம்'], 40: ['நாற்பது', 'நாற்பதாம்'] }; return u ? TA_T[t] + (ord ? TA_ORD : TA_CARD)[u] : TA_TEN[t][ord ? 1 : 0]; }
  if (n <= 20) return (ord ? EN_ORD : EN_CARD)[n]; const t = Math.floor(n / 10) * 10, u = n % 10; return EN_T[t] + (u ? ' ' + (ord ? EN_ORD : EN_CARD)[u] : '');
}
const CUES = {
  ml: { ch: ['അദ്ധ്യായം', 'അധ്യായം', 'അദ്ധ്യായത്തിൽ'], v: ['വാക്യം', 'വാക്യത്തിൽ', 'വചനം'] },
  ta: { ch: ['அதிகாரம்', 'அதிகாரத்தில்'], v: ['வசனம்', 'வசனத்தில்'] },
  en: { ch: ['chapter'], v: ['verse'] }
};
const FILL = { ml: [['ഇനി നമുക്ക്', 'വായിക്കാം'], ['നമുക്ക്', 'നോക്കാം'], ['', 'ശ്രദ്ധിക്കുക'], ['', '']], ta: [['இப்போது நாம்', 'வாசிப்போம்'], ['நாம்', 'பார்ப்போம்'], ['', 'கவனியுங்கள்'], ['', '']], en: [['let us turn to', ''], ['please open', ''], ['', 'it says'], ['', '']] };

// Code-mixed speech: Malayalam/Tamil book name with English numbers and cue words ("യോഹന്നാൻ third chapter 16th verse").
function mixed(lang) {
  const bk = pick(BOOKS), info = B.BOOKS[bk[0]];
  const ch = 1 + Math.floor(rnd() * Math.min(info.ch, 40)), v = 1 + Math.floor(rnd() * Math.min(30, vmax(bk[0], ch)));
  const name = pick(lang === 'ml' ? bk[1] : bk[2]);
  const ordS = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  const r = rnd();
  const body = r < .35 ? `${name} chapter ${ch} verse ${v}` : r < .6 ? `${name} ${ordS(ch)} chapter ${ordS(v)} verse` : r < .8 ? `${name} ${num(lang, ch, true)} chapter ${v}th verse` : `${name} ${ch} ${pick(CUES[lang].ch)} ${v} verse`;
  return { text: body, want: [bk[0], ch, v] };
}
// Disfluent speech: a filler word in the middle, a repeated word, a dropped cue word.
function disfluent(u, lang) {
  const w = u.text.split(' '); const fill = { ml: ['അതായത്', 'ആ', 'ഈ'], ta: ['அதாவது', 'அந்த', 'இந்த'], en: ['that is', 'uh', 'the'] }[lang];
  const k = rnd();
  if (k < .35 && w.length > 3) w.splice(1 + Math.floor(rnd() * (w.length - 2)), 0, pick(fill));
  else if (k < .65 && w.length > 2) { const i = 1 + Math.floor(rnd() * (w.length - 1)); w.splice(i, 0, w[i]); }
  return { text: w.join(' '), want: u.want };
}
function utter(lang) {
  const bk = pick(BOOKS), info = B.BOOKS[bk[0]];
  const ch = 1 + Math.floor(rnd() * Math.min(info.ch, 40)), v = 1 + Math.floor(rnd() * Math.min(30, vmax(bk[0], ch)));
  const name = pick(lang === 'ml' ? bk[1] : lang === 'ta' ? bk[2] : bk[3]);
  const r = rnd(), [pre, post] = pick(FILL[lang]);
  let body;
  const cue = CUES[lang];
  if (lang === 'en') {
    body = r < .5 ? `${name} chapter ${num('en', ch, false)} verse ${num('en', v, false)}` : r < .8 ? `${name} ${ch} ${v}` : `${name} ${ch}:${v}`;
  } else if (r < .55) body = `${name} ${num(lang, ch, true)} ${pick(cue.ch)} ${num(lang, v, true)} ${pick(cue.v)}`;
  else if (r < .7) body = `${name} ${num(lang, v, true)} ${pick(cue.v)} ${num(lang, ch, true)} ${pick(cue.ch)}`;   // verse first
  else if (r < .85) body = `${name} ${ch} ${v}`;
  else body = `${name} ${num(lang, ch, true)} ${pick(cue.ch)} ${v}`;
  return { text: `${pre} ${body} ${post}`.replace(/\s+/g, ' ').trim(), want: [bk[0], ch, v] };
}
// en-IN writes Indian-language speech in English letters: use the app's own phonetic form, then mishear it a little.
function latin(text) {
  return C.keyWords(text).split(' ').map(w => {
    if (/^\d/.test(w) || w.length < 4 || rnd() > .35) return w;
    const k = rnd();
    if (k < .25) return w.replace(/a(?=[^aeiou])/, 'aa');
    if (k < .5) return w.replace(/t/, 'th');
    if (k < .7) return w.replace(/([aeiou])([^aeiou])\2/, '$1$2');
    if (k < .85) return w.replace(/u$/, '');
    return w.replace(/i/, 'ee');
  }).join(' ');
}
if (require.main !== module) { module.exports = { utter, latin, mixed, disfluent }; return; }
const N = +process.argv[2] || 300, fails = [];
const res = {};
for (const lang of ['ml', 'ta', 'en']) for (const chan of lang === 'en' ? ['native', 'disfluent'] : ['native', 'latin', 'mixed', 'disfluent']) {
  let ok = 0;
  for (let i = 0; i < N; i++) {
    const u = chan === 'mixed' ? mixed(lang) : chan === 'disfluent' ? disfluent(utter(lang), lang) : utter(lang);
    const text = chan === 'latin' ? latin(u.text) : u.text;
    const p = B.parseRef(text, { exactOnly: true, needChapter: true, needVerse: true });
    if (p && p.book === u.want[0] && p.ch === u.want[1] && p.v === u.want[2]) ok++;
    else fails.push(`${lang}/${chan}  want ${B.refLabel({ book: u.want[0], ch: u.want[1], v: u.want[2], ve: u.want[2] }, 'en')}  got ${p ? B.refLabel(p, 'en') : 'none'}  | ${text}`);
  }
  res[lang + '/' + chan] = (100 * ok / N).toFixed(1) + '%';
}
console.log(JSON.stringify(res));
if (process.env.FAILS) console.log(fails.slice(0, +process.env.FAILS).join('\n'));
module.exports = { utter, latin };
