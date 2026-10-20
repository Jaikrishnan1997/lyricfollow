/* Real speech-recogniser output (Whisper on noisy church-style audio) that must still give the right reference,
 * and everyday sentences that must give none. Run: node tests/asr-cases.js */
const B = require('../js/bible.js');
const want = [
  ['2nd Corinthians 412 it says', '46 4:12'], ['2nd Corundians 412 it says.', '46 4:12'], ['Please open 2 Canes 23-22.', '11 23:22'],
  ['Please open 2 Kays 23-22.', '11 23:22'], ['NAMUKKU ROMANKULA LEKHANAM 22 AAM VAKKAM 6 ADHAYAM NOKAM', '44 6:22'],
  ['first jon 1 9', '61 1:9'], ['1 jhon 1 9', '61 1:9'], ['Please turn with me to John chapter 3 verses 16.', '42 3:16'],
  ['மத்தேயு ஐந்தாம் அதிகாரம் ஒண்ணாவது வசனம்', '39 5:1'],
];
const none = ['meeting is at 10 30', 'job 5 years', 'first time we met 3 4', 'ഞാൻ 5 മണിക്ക് വരും', 'I have 2 kids 3 dogs'];
let bad = 0;
for (const [t, w] of want) { const p = B.parseRef(t, { exactOnly: true, needChapter: true, needVerse: true }); const g = p ? `${p.book} ${p.ch}:${p.v}` : 'none'; if (g !== w) { bad++; console.log('FAIL', t, '→', g, 'want', w); } }
for (const t of none) { const p = B.parseRef(t, { exactOnly: true, needChapter: true, needVerse: true }); if (p && !p.fuzzy) { bad++; console.log('FALSE POSITIVE', t, '→', p.book, p.ch, p.v); } }
console.log(bad ? bad + ' failed' : 'all ' + (want.length + none.length) + ' passed'); process.exitCode = bad ? 1 : 0;
