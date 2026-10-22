// Spoken Bible references in Tamil, Malayalam and English: normal and reversed order, ordinal words, ranges,
// chapter only, English book names as the Indian recognisers write them.  node tests/refs_test.js
const Bible = require('../js/bible.js');
const cases = [
 ['John chapter 1 verse 3', [43,1,3]], ['John verse 3 chapter 1', [43,1,3]], ['John 1 verse 3', [43,1,3]], ['John 1 3', [43,1,3]],
 ['John chapter one verse three', [43,1,3]], ['first John chapter 2 verse 5', [62,2,5]], ['Psalm 23', [19,23,null]], ['Psalms chapter 23 verse 1 to 4', [19,23,1,4]],
 ['யோவான் 1ஆம் அதிகாரம் 3ஆம் வசனம்', [43,1,3]], ['யோவான் 3ஆம் வசனம் 1ஆம் அதிகாரம்', [43,1,3]], ['யோவான் முதலாம் அதிகாரம் மூன்றாம் வசனம்', [43,1,3]],
 ['യോഹന്നാൻ ഒന്നാം അധ്യായം മൂന്നാം വാക്യം', [43,1,3]], ['യോഹന്നാൻ 1 അധ്യായം 3 വാക്യം', [43,1,3]], ['യോഹന്നാൻ മൂന്നാം വാക്യം ഒന്നാം അധ്യായം', [43,1,3]],
 ['ஜான் 3 வெர்சஸ் 16', [43,3,16]], ['ജോൺ 3 16', [43,3,16]], ['Genesis 1 verse 1 to 3', [1,1,1,3]], ['சங்கீதம் 23', [19,23,null]], ['സങ്കീർത്തനം 23', [19,23,null]],
 ['Romans eight twenty eight', [45,8,28]], ['Matthew chapter five', [40,5,null]]];
let ok=0;
for (const [t, w] of cases) {
  const r = Bible.parseRef(t, {}); const got = r ? [r.book, r.ch, r.v || null, r.ve && r.ve !== r.v ? r.ve : undefined].filter(x=>x!==undefined) : null;
  const want = w.filter(x=>x!==undefined); const good = r && r.book === w[0] - 1 && r.ch === w[1] && (w[2] == null ? r.v === 1 : r.v === w[2]) && (w[3] == null || r.ve === w[3]);
  if (good) ok++; console.log(good ? 'ok  ' : 'FAIL', t.padEnd(46), JSON.stringify(r && {b:r.book,c:r.ch,v:r.v,ve:r.ve}), 'want', JSON.stringify(w));
}
console.log(ok + '/' + cases.length);
const more = [['யோவான் முதலாம் அதிகாரம் மூன்றாம் வசனம்',[43,1,3]],['யோவான் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்',[43,3,16]],['யோவான் ஒன்றாம் அதிகாரம் மூன்றாம் வசனம்',[43,1,3]],['மத்தேயு ஐந்தாம் அதிகாரம் மூன்றாம் வசனம்',[40,5,3]],
['ആദ്യ അധ്യായം', null],['അപ്പൊസ്തലപ്രവൃത്തികൾ രണ്ടാം അധ്യായം നാലാം വാക്യം',[44,2,4]],['സങ്കീർത്തനം ഇരുപത്തിമൂന്നാം അധ്യായം',[19,23,null]],['சங்கீதம் இருபத்தி மூன்றாம் அதிகாரம்',[19,23,null]],
['Psalm 23 verses 1 through 6',[19,23,1,6]],['John chapter 3 verses 16 and 17',[43,3,16,17]],['1 Corinthians 13 4',[46,13,4]],['Revelation 21 4',[66,21,4]],['Romans chapter 12 verse 1 and 2',[45,12,1,2]],
['പ്രവൃത്തികൾ 2:38',[44,2,38]],['ரோமர் 12 1',[45,12,1]],['ஏசாயா 53 ஆம் அதிகாரம் 5 ஆம் வசனம்',[23,53,5]]];
let ok2=0; for (const [t,w] of more) { const r = Bible.parseRef(t, {}); if (!w) { console.log(r ? 'FAIL' : 'ok  ', t, JSON.stringify(r && {b:r.book,c:r.ch,v:r.v})); if (!r) ok2++; continue; } const good = r && r.book === w[0]-1 && r.ch === w[1] && (w[2] == null ? r.v === 1 : r.v === w[2]) && (w[3] == null || r.ve === w[3]); if (good) ok2++; console.log(good?'ok  ':'FAIL', t.padEnd(50), JSON.stringify(r && {b:r.book+1,c:r.ch,v:r.v,ve:r.ve}), 'want', JSON.stringify(w)); }
console.log("more", ok2 + "/" + more.length); if (ok + ok2 < cases.length + more.length) process.exit(1);
