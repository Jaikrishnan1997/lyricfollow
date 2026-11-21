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
  const w = u.text.split(' '); const fill = { ml: ['അതായത്', 'ആ', 'ഈ'], ta: ['அதாவது', 'அந்த', 'இந்த'], en: ['that is', 'uh', 'the'], hi: ['यानी', 'वो', 'उम'] }[lang];
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

/* ---------- v83: every order, four languages ----------
 * Book (all 66, every spoken form), chapter and verse in the six orders of the R&D note (B C V, B V C, C V B, V C B,
 * C B V, V B C), with cue-word forms and case endings, ordinal and plain numbers (formal and colloquial, words and
 * digits), decoration words, numbered books in every spoken form, Psalm forms, ranges, lead-in and tail words, glued
 * and split book names, romanised spellings (ta/ml/hi), and the same fed word by word through the stream harness. */
const ORDERS = ['BCV', 'BVC', 'CVB', 'VCB', 'CBV', 'VBC'];
const rint = n => Math.floor(rnd() * n);
// --- numbers as words ---
const TA_U = ['', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது'], TA_UC = ['', 'ஒண்ணு', 'ரெண்டு', 'மூணு', 'நாலு', 'அஞ்சு', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒம்பது'];
const TA_TEEN = ['பத்து', 'பதினொன்று', 'பன்னிரண்டு', 'பதிமூன்று', 'பதினான்கு', 'பதினைந்து', 'பதினாறு', 'பதினேழு', 'பதினெட்டு', 'பத்தொன்பது'], TA_TEENC = ['பத்து', 'பதினொண்ணு', 'பன்னெண்டு', 'பதிமூணு', 'பதினாலு', 'பதினஞ்சு', 'பதினாறு', 'பதினேழு', 'பதினெட்டு', 'பத்தொம்பது'];
const TA_TENS = { 2: ['இருபது', 'இருபத்தி', 'இருபத்து'], 3: ['முப்பது', 'முப்பத்தி', 'முப்பத்து'], 4: ['நாற்பது', 'நாற்பத்தி', 'நாற்பத்து'], 5: ['ஐம்பது', 'ஐம்பத்தி', 'ஐம்பத்து'], 6: ['அறுபது', 'அறுபத்தி', 'அறுபத்து'], 7: ['எழுபது', 'எழுபத்தி', 'எழுபத்து'], 8: ['எண்பது', 'எண்பத்தி', 'எண்பத்து'], 9: ['தொண்ணூறு', 'தொண்ணூற்றி', 'தொண்ணூற்று'] };
const TA_TENSC = { 4: ['நாப்பது', 'நாப்பத்தி'], 5: ['அம்பது', 'அம்பத்தி'], 8: ['எம்பது', 'எம்பத்தி'] };
const taOrd = (w, avatu) => w.replace(/ு$/, '') + (avatu ? 'ாவது' : 'ாம்');
function taWord(n, ord, coll) {
  if (n >= 100) { const h = pick(['நூற்றி', 'நூத்தி']); return n === 100 ? (ord ? 'நூறாம்' : 'நூறு') : h + ' ' + taWord(n - 100, ord, coll); }
  if (ord && n === 1 && rnd() < .5) return pick(['முதலாம்', 'முதல்', 'முதலாவது', 'ஒண்ணாவது', 'ஒன்றாம்']);
  const av = coll && rnd() < .6;
  if (n < 10) { const w = (coll ? TA_UC : TA_U)[n]; return ord ? taOrd(w, av) : w; }
  if (n < 20) { const w = (coll ? TA_TEENC : TA_TEEN)[n - 10]; return ord ? taOrd(w, av) : w; }
  const t = Math.floor(n / 10), u = n % 10, T = (coll && TA_TENSC[t]) || TA_TENS[t];
  if (!u) return ord ? taOrd(T[0], av) : T[0];
  return pick(T.slice(1)) + ' ' + (u === 1 && ord ? taOrd(coll ? 'ஒண்ணு' : 'ஒன்று', av) : taWord(u, ord, coll));   // 21st is "இருபத்தி ஒன்றாம்", never "... முதலாம்"
}
const ML_U = ['', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒമ്പത്'], ML_UC = ['', 'ഒന്നു', 'രണ്ടു', 'മൂന്നു', 'നാലു', 'അഞ്ചു', 'ആറു', 'ഏഴു', 'എട്ടു', 'ഒമ്പതു'];
const ML_TEEN = ['പത്ത്', 'പതിനൊന്ന്', 'പന്ത്രണ്ട്', 'പതിമൂന്ന്', 'പതിനാല്', 'പതിനഞ്ച്', 'പതിനാറ്', 'പതിനേഴ്', 'പതിനെട്ട്', 'പത്തൊമ്പത്'];
const ML_TENS = { 2: 'ഇരുപത്', 3: 'മുപ്പത്', 4: 'നാല്പത്', 5: 'അമ്പത്', 6: 'അറുപത്', 7: 'എഴുപത്', 8: 'എൺപത്', 9: 'തൊണ്ണൂറ്' };
const mlOrd = w => w.replace(/[്ു]$/, '') + 'ാം';
const ML_GLIDE = { 'അ': 'യ', 'ആ': 'യാ', 'ഏ': 'യേ', 'എ': 'യെ', 'ഒ': 'യൊ' };
function mlWord(n, ord, coll) {
  if (n >= 100) { if (n === 100) return ord ? 'നൂറാം' : 'നൂറ്'; const r = mlWord(n - 100, ord, false), g = ML_GLIDE[r[0]] || (r[0] === 'ഇ' ? 'യി' : ''); return rnd() < .5 ? 'നൂറ്റി ' + r : 'നൂറ്റി' + (g ? g + r.slice(1) : r); }
  if (n < 10) { const w = (coll && !ord ? ML_UC : ML_U)[n]; return ord ? mlOrd(ML_U[n]) : w; }
  if (n < 20) return ord ? mlOrd(ML_TEEN[n - 10]) : ML_TEEN[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  if (!u) return ord ? mlOrd(ML_TENS[t]) : ML_TENS[t];
  let uw = ord ? mlOrd(ML_U[u]) : ML_U[u]; const g = ML_GLIDE[uw[0]]; if (g) uw = g + uw.slice(1);
  return ML_TENS[t].replace(/ത്$/, 'ത്തി').replace(/റ്$/, 'റ്റി') + uw;     // ഇരുപത്തി-, തൊണ്ണൂറ്റി-
}
const EN_U = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'], EN_UO = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
const EN_TEEN = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'], EN_TENS = { 2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty', 6: 'sixty', 7: 'seventy', 8: 'eighty', 9: 'ninety' };
const enOrdW = w => w === 'twelve' ? 'twelfth' : w.endsWith('y') ? w.slice(0, -1) + 'ieth' : w + 'th';
function enWord(n, ord) {
  if (n >= 100) return n === 100 ? (ord ? 'hundredth' : 'one hundred') : pick(['one hundred ', 'a hundred and ', 'hundred ']) + enWord(n - 100, ord);
  if (n < 10) return ord ? EN_UO[n] : EN_U[n];
  if (n < 20) return ord ? enOrdW(EN_TEEN[n - 10]) : EN_TEEN[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  return u ? EN_TENS[t] + pick([' ', '-']) + (ord ? EN_UO[u] : EN_U[u]) : (ord ? enOrdW(EN_TENS[t]) : EN_TENS[t]);
}
const HI_TBL = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस',
  'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस',
  'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास', 'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ',
  'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर', 'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्यासी', 'अस्सी',
  'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी', 'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे', 'सौ'];
const HI_O = { 1: ['पहला', 'पहली', 'पहले'], 2: ['दूसरा', 'दूसरी', 'दूसरे'], 3: ['तीसरा', 'तीसरी', 'तीसरे'], 4: ['चौथा', 'चौथी', 'चौथे'], 6: ['छठा', 'छठी', 'छठे'] };
function hiWord(n, ord) {
  if (n > 100) return pick(['एक सौ ', 'सौ ']) + hiWord(n - 100, ord);
  if (ord) return HI_O[n] ? pick(HI_O[n]) : HI_TBL[n] + pick(['वाँ', 'वें', 'वीं', 'वां']);     // 4th is चौथा, never "चारवाँ"
  return HI_TBL[n];
}
// A number as said in `lang`: { s, ord } - digits, digits with an ordinal ending, or words (formal / colloquial).
function say(lang, n, ord) {
  const r = rnd();
  if (r < .25) return String(n);
  if (r < .4 && ord) return n + (lang === 'ta' ? pick(['-ஆம்', 'ஆம்', 'ம்', 'வது', ' ஆம்']) : lang === 'ml' ? pick(['-ാം', 'ാം']) : lang === 'hi' ? pick(['वाँ', 'वें', ' वाँ']) : (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'));
  return lang === 'ta' ? taWord(n, ord, rnd() < .5) : lang === 'ml' ? mlWord(n, ord, rnd() < .4) : lang === 'hi' ? hiWord(n, ord) : enWord(n, ord);
}
// --- book names ---
const HI_ORDBOOK = { 1: ['पहला', 'पहली', '1'], 2: ['दूसरा', 'दूसरी', '2'], 3: ['तीसरा', 'तीसरी', '3'] };
function bookSaid(lang, b) {
  const info = B.BOOKS[b], m = /^(\d) (.+)$/.exec(info[lang] || info.en), n = m ? +m[1] : 0, base = m ? m[2] : (info[lang] || info.en);
  const enBase = (/^\d (.+)$/.exec(info.en) || [, info.en])[1];
  if (lang === 'en') {
    let nm = b === 18 ? pick(['Psalm', 'Psalms']) : b === 21 ? pick(['Song of Solomon', 'Song of Songs']) : b === 65 ? pick(['Revelation', 'Revelations']) : b === 43 ? pick(['Acts', 'Acts of the Apostles']) : enBase;
    if (n) nm = pick([String(n), ['first', 'second', 'third'][n - 1], ['1st', '2nd', '3rd'][n - 1]]) + ' ' + nm;
    const d = rnd(); if (d < .15) nm = 'the book of ' + nm; else if (d < .22 && b >= 39 && b <= 42) nm = pick(['the gospel of ', 'the gospel according to ']) + nm; else if (d < .28 && b >= 44 && b <= 64 && !n) nm = 'the letter to the ' + nm;
    return nm;
  }
  if (lang === 'hi') {
    let nm = b === 18 ? pick(['भजन संहिता', 'भजनसंहिता']) : b === 43 ? pick(['प्रेरितों के काम', 'प्रेरितों']) : b === 65 ? pick(['प्रकाशितवाक्य', 'प्रकाशित वाक्य']) : base;
    if (n) { if (rnd() < .2 && b >= 44) return nm + ' की ' + pick(['पहली', 'दूसरी', 'तीसरी'].slice(n - 1, n)) + ' पत्री'; nm = pick(HI_ORDBOOK[n]) + ' ' + nm; }
    const d = rnd(); if (d < .12) nm += pick([' की पुस्तक', ' की किताब']); else if (d < .2 && b >= 39 && b <= 42) nm += pick([' रचित सुसमाचार', ' का सुसमाचार']); else if (d < .25 && b >= 44 && !n) nm += ' की पत्री';
    return nm;
  }
  const extra = { ta: { 0: ['ஆதியாகமத்தில்', 'ஆதி ஆகமம்'], 1: ['யாத்திர ஆகமம்'], 3: ['எண் ஆகமம்'], 4: ['உப ஆகமம்'], 42: ['யோவானில்', 'யோவான் எழுதின சுவிசேஷம்'], 18: ['சங்கீதங்கள்'], 43: ['அப்போஸ்தலர் நடபடிகள்', 'அப்போஸ்தலருடைய நடபடிகள்'], 44: ['ரோமருக்கு எழுதின நிருபம்'] },
    ml: { 0: ['ഉല്പത്തിപുസ്തകം', 'ഉൽപത്തി'], 1: ['പുറപ്പാടുപുസ്തകം'], 2: ['ലേവ്യ പുസ്തകം'], 3: ['സംഖ്യാ പുസ്തകം'], 4: ['ആവർത്തനപുസ്തകം', 'ആവർത്തന പുസ്തകം'], 18: ['സങ്കീർത്തനം'], 42: ['യോഹന്നാന്റെ സുവിശേഷം', 'യോഹന്നാൻ എഴുതിയ സുവിശേഷം'], 44: ['റോമർക്കുള്ള ലേഖനം', 'റോമർക്ക് എഴുതിയ ലേഖനം'], 43: ['അപ്പൊസ്തലപ്രവൃത്തികൾ'] } }[lang];
  let nm = extra[b] && rnd() < .4 ? pick(extra[b]) : base;
  if (n && nm === base) {
    const o = lang === 'ta' ? [['முதலாம்', 'ஒன்றாம்', '1', 'ஒண்ணாம்'], ['இரண்டாம்', 'ரெண்டாம்', '2'], ['மூன்றாம்', 'மூணாம்', '3']][n - 1] : [['ഒന്നാം', 'ഒന്ന്', '1'], ['രണ്ടാം', 'രണ്ട്', '2'], ['മൂന്നാം', 'മൂന്ന്', '3']][n - 1];
    if (rnd() < .15 && b >= 44) return lang === 'ta' ? nm.replace(/ர்$/, 'ருக்கு').replace(/யு$/, 'யுவுக்கு') + ' எழுதின ' + ['முதலாம்', 'இரண்டாம்', 'மூன்றாம்'][n - 1] + ' நிருபம்' : nm + (/ർ$/.test(nm) ? 'ക്ക്' : '') + ' എഴുതിയ ' + ['ഒന്നാം', 'രണ്ടാം', 'മൂന്നാം'][n - 1] + ' ലേഖനം';
    nm = pick(o) + ' ' + nm;
  }
  const d = rnd();
  if (lang === 'ta' && d < .15) nm += ' ' + pick(['புத்தகம்', 'புஸ்தகம்', 'புத்தகத்தில்', 'புஸ்தகத்துல']);
  if (lang === 'ml' && d < .15 && !/പുസ്തകം$/.test(nm)) nm += ' ' + pick(['പുസ്തകം', 'പുസ്തകത്തിൽ', 'പുസ്തകത്തിലെ', 'പുസ്തകത്തിന്റെ']);
  return nm;
}
const CUEW = {
  en: { ch: ['chapter'], v: ['verse'] },
  ta: { ch: ['அதிகாரம்', 'அதிகாரத்தில்', 'அதிகாரத்தின்', 'அதிகாரத்துல', 'அதிகாரத்திலே'], v: ['வசனம்', 'வசனத்தில்', 'வசனத்துல'] },
  ml: { ch: ['അദ്ധ്യായം', 'അധ്യായം', 'അദ്ധ്യായത്തിൽ', 'അദ്ധ്യായത്തിലെ', 'അദ്ധ്യായത്തിന്റെ'], v: ['വാക്യം', 'വാക്യത്തിൽ', 'വചനം'] },
  hi: { ch: ['अध्याय', 'बाब'], v: ['पद', 'आयत', 'वचन'] }
};
const LEAD = { en: [['let us turn to', ''], ['open your Bibles to', ''], ['', 'and we read'], ['we read from', ''], ['', '']], ta: [['இப்போது நாம்', 'வாசிப்போம்'], ['', 'பார்ப்போம்'], ['திருப்புங்க', ''], ['', 'சொல்லுது'], ['', '']],
  ml: [['നമുക്ക്', 'വായിക്കാം'], ['', 'നോക്കാം'], ['ഇപ്പോൾ', 'തുറക്കാം'], ['', 'പറയുന്നു'], ['', '']], hi: [['आइए हम', 'पढ़ेंगे'], ['', 'देखिए'], ['', 'खोलिए'], ['अब', ''], ['', '']] };
// One part ("chapter 3", "மூன்றாம் அதிகாரம்", "अध्याय तीन" / "तीसरा अध्याय") as said in `lang`.
function part(lang, kind, n) {
  const w = pick(CUEW[lang][kind]);
  if (lang === 'en') return rnd() < .7 ? `${w} ${say('en', n, false)}` : `${enWord(n, true)} ${w}`;
  if (lang === 'hi') return rnd() < .55 ? `${w} ${say('hi', n, false)}` : `${say('hi', n, true)} ${w}`;
  return `${say(lang, n, rnd() < .75)} ${w}`;
}
/** One spoken reference in `lang`, order `ord` (index into ORDERS); returns { text, want: [book, ch, v, ve] }. */
function spoken(lang, ord) {
  let b = rint(66); const info = B.BOOKS[b];
  if (info.ch === 1) b = 42;          // one-chapter books are said without a chapter; kept out of the order columns
  const chN = B.BOOKS[b].ch, ch = 1 + rint(chN), vm = vmax(b, ch), v = 1 + rint(vm);
  const range = rnd() < .12 && v < vm, ve = range ? v + 1 + rint(Math.min(4, vm - v)) : v;
  const bk = bookSaid(lang, b), O = ORDERS[ord];
  let C = part(lang, 'ch', ch), V = part(lang, 'v', v);
  if (range) {
    const e = say(lang, ve, false);
    V = lang === 'en' ? `verses ${say('en', v, false)} ${pick(['to', 'through'])} ${e}` : lang === 'ta' ? `${say('ta', v, true)} வசனம் முதல் ${say('ta', ve, true)} வசனம் வரை` : lang === 'ml' ? `${say('ml', v, true)} വാക്യം മുതൽ ${say('ml', ve, true)} വാക്യം വരെ` : `पद ${say('hi', v, false)} से ${e} तक`;
  }
  // two number words side by side run together for any listener ("chapter twenty | fifth verse" = 25th?): keep a cue between
  const runTogether = (a, b) => (a % 10 === 0 && a >= 20 && b < 10) || (a % 10 === 0 && a >= 20 && b > a && b < a + 10) || (a >= 100 && a % 100 === 0 && b < 100);
  if (lang === 'en' && /^chapter /.test(C) && !/^verse/.test(V) && runTogether(ch, v)) V = 'verse ' + say('en', v, false);
  if (lang === 'en' && /^verse /.test(V) && !/^chapter/.test(C) && runTogether(v, ch)) C = 'chapter ' + say('en', ch, false);
  const of = lang === 'en' ? ' of' : lang === 'hi' ? ' का' : '';
  let body;
  if (O === 'BCV') {
    const k = rnd();
    // bare numbers are only ever this order; one cue word missing too
    // (not words that would run together: "twenty eight" said for 20:8 is 28 to anyone)
    const runs = (ch % 10 === 0 && ch >= 20 && v < 10) || (ch >= 100 && v < 100) || (ch < 10 && v === 100);
    // (Hindi book names that are everyday words - गिनती counting, उपदेशक preacher, यहूदा Judah - are only offered without a
    // chapter/verse word, by design, so they are said with one here)
    const weakHi = lang === 'hi' && [3, 20, 64].includes(b);
    if (k < .2 && !range && !runs && !weakHi) body = `${bk} ${lang === 'en' && rnd() < .3 ? ch + ':' + v : say(lang, ch, false) + ' ' + say(lang, v, false)}`;
    else if (k < .3 && !range) body = lang === 'en' || lang === 'hi' ? `${bk} ${say(lang, ch, false)} ${pick(CUEW[lang].v)} ${say(lang, v, false)}` : `${bk} ${say(lang, ch, true)} ${pick(CUEW[lang].ch)} ${say(lang, v, false)}`;
    else if (k < .45 && b === 18) body = lang === 'en' ? `the ${enWord(ch, true)} Psalm ${range ? V : 'verse ' + say('en', v, false)}` : lang === 'ta' ? `${say('ta', ch, true)} சங்கீதம் ${V}` : lang === 'ml' ? `${say('ml', ch, true)} സങ്കീർത്തനം ${V}` : `${bk} ${say('hi', ch, false)}${of} ${V}`;
    else body = `${bk} ${C} ${V}`;
  }
  else if (O === 'BVC') body = `${bk} ${V}${of} ${C}`;
  else if (O === 'CVB') body = `${C} ${V}${of} ${bk}`;
  else if (O === 'VCB') body = `${V}${of} ${C}${of} ${bk}`;
  else if (O === 'CBV') body = `${C}${of} ${bk} ${V}`;
  else body = `${V}${of} ${bk} ${C}`;
  const [pre, post] = pick(LEAD[lang]);
  return { text: `${pre} ${body} ${post}`.replace(/\s+/g, ' ').trim(), want: [b, ch, v, ve] };
}
// Romanised: ta/ml through the app's own phonetic spelling (latin() above); Hindi as people type it ("yuhanna adhyay teen pad solah").
function romanised(lang, u) { return lang === 'hi' ? C.romanHi(u.text) : latin(u.text); }
if (require.main !== module) { module.exports = { utter, latin, mixed, disfluent, spoken, romanised, ORDERS }; return; }
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
// v83 columns: per language and order, Hindi, romanised, and word by word through the stream harness
const ok3 = (p, w) => p && p.book === w[0] && p.ch === w[1] && p.v === w[2] && (w[3] === w[2] || p.ve === w[3]);
for (const lang of ['en', 'ta', 'ml', 'hi']) {
  for (let o = 0; o < 6; o++) {
    let ok = 0;
    for (let i = 0; i < N; i++) { const u = spoken(lang, o), p = B.parseRef(u.text, { exactOnly: true, needChapter: true, needVerse: true }); if (ok3(p, u.want)) ok++; else fails.push(`${lang}/${ORDERS[o]}  want ${B.refLabel({ book: u.want[0], ch: u.want[1], v: u.want[2], ve: u.want[3] }, 'en')}  got ${p ? B.refLabel(p, 'en') : 'none'}  | ${u.text}`); }
    res[lang + '/' + ORDERS[o]] = (100 * ok / N).toFixed(1) + '%';
  }
  if (lang !== 'en') {
    let ok = 0;
    for (let i = 0; i < N; i++) { const u = spoken(lang, i % 6), t = romanised(lang, u), p = B.parseRef(t, { exactOnly: true, needChapter: true, needVerse: true }); if (ok3(p, u.want)) ok++; else fails.push(`${lang}/roman  want ${B.refLabel({ book: u.want[0], ch: u.want[1], v: u.want[2], ve: u.want[3] }, 'en')}  got ${p ? B.refLabel(p, 'en') : 'none'}  | ${t}`); }
    res[lang + '/roman'] = (100 * ok / N).toFixed(1) + '%';
  }
  if (lang === 'hi') {
    let ok = 0;
    for (let i = 0; i < N; i++) { const u = disfluent(spoken('hi', i % 6), 'hi'), p = B.parseRef(u.text, { exactOnly: true, needChapter: true, needVerse: true }); if (ok3(p, u.want)) ok++; else fails.push(`hi/disfluent  want ${B.refLabel({ book: u.want[0], ch: u.want[1], v: u.want[2], ve: u.want[3] }, 'en')}  got ${p ? B.refLabel(p, 'en') : 'none'}  | ${u.text}`); }
    res['hi/disfluent'] = (100 * ok / N).toFixed(1) + '%';
  }
  if (!process.env.NOSTREAM) {   // word by word through the stream harness: exactly this one reference reaches the screen
    const { run } = require('./ref_stream_test.js'); let ok = 0; const SN = +process.env.STREAM_N || N;
    for (let i = 0; i < SN; i++) {
      const u = spoken(lang, i % 6), want = B.refLabel({ book: u.want[0], ch: u.want[1], v: u.want[2], ve: u.want[3] }, 'en'), r = run([u.text], {});
      if (r.screen.length && r.screen[r.screen.length - 1] === want && r.heard.length === 1 && r.screen.every(x => x.split(/[–]/)[0] === want.split(/[–]/)[0])) ok++; else fails.push(`${lang}/stream  want ${want}  got ${JSON.stringify(r.screen)} asks ${JSON.stringify(r.asks)}  | ${u.text}`);
    }
    res[lang + '/stream'] = (100 * ok / SN).toFixed(1) + '%';
  }
}
console.log(JSON.stringify(res));
if (process.env.FAILS) console.log(fails.slice(0, +process.env.FAILS).join('\n'));
module.exports = { utter, latin };
