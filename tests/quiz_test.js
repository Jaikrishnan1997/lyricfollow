// node tests/quiz_test.js — every prepared question finds its own answer in en/ta/ml, spoken variants match,
// and sermon talk that is not a quiz question shows nothing.
const path = require('path');
global.LFCore = require('../js/core.js');
const Quiz = require('../js/quiz.js');
Quiz.load(require('../vendor/quiz.json'));
let ok = 0, bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
const all = Quiz.all();
for (const q of all) for (const l of ['en', 'ta', 'ml']) {
  const m = Quiz.match(q.q[l]);
  if (m && m.q.a.en === q.a.en) ok++; else fail(`self ${l}: ${q.q[l]} -> ${m ? m.q.a.en : 'none'}`);
}
const cases = [
  ['who is the son of Abraham', 'Isaac'],
  ['Brothers and sisters, tell me, who is the son of Abraham?', 'Isaac'],
  ['ஆபிரகாமுடைய மகன் யார்', 'Isaac'],
  ['அபிரகாமின் மகன் யார் சொல்லுங்க', 'Isaac'],
  ['അബ്രഹാമിന്റെ മകൻ ആരാണ്', 'Isaac'],
  ['abrahaminte makan aaru', 'Isaac'],
  ['who killed Abel', 'Cain'],
  ['who built the ark', 'Noah'],
  ['who was swallowed by the big fish', 'Jonah'],
  ['how many disciples did Jesus choose', 'Twelve'],
  ['where was Jesus born', 'Bethlehem'],
  ['இயேசு எங்கே பிறந்தார்', 'Bethlehem'],
  ['യേശു എവിടെയാണ് ജനിച്ചത്', 'Bethlehem'],
  ['who denied Jesus three times', 'Peter'],
  ['who was the first king of Israel', 'Saul'],
  ['யோனாவை விழுங்கியது என்ன', null],      // not in the list as asked: must not guess another
];
for (const [t, want] of cases) {
  const m = Quiz.match(t), got = m ? m.q.a.en : null;
  if (want === null ? got === null : got && got.startsWith(want)) ok++; else fail(`case "${t}" -> ${got} (want ${want})`);
}
const neg = [
  'Abraham believed God and it was counted unto him for righteousness',
  'today we will read from the book of Genesis chapter 22',
  'praise the Lord hallelujah amen',
  'ஆபிரகாம் தேவனை விசுவாசித்தான்',
  'അബ്രാഹാം ദൈവത്തെ വിശ്വസിച്ചു',
  'what a wonderful God we serve',
  'who is like our God',
  'how great is our God',
  'எவ்வளவு பெரிய தேவன்',
  'which is why we must pray every day',
];
for (const t of neg) { const m = Quiz.match(t); if (!m) ok++; else fail(`neg "${t}" -> ${m.q.a.en} ${m.score.toFixed(2)}`); }
console.log(`quiz: ${ok} ok, ${bad} failed of ${ok + bad} (${all.length} questions)`);
process.exit(bad ? 1 : 0);
