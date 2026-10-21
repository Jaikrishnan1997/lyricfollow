// Tidies every bundled song pack with js/tidy.js (one clean slide layout) and bumps the pack versions so every
// browser updates its copies - except songs the user changed (their text no longer matches any earlier pack text).
//   node tools/tidy-packs.js [--dry]
const fs = require('fs'), path = require('path');
const T = require('../js/tidy.js');
const V = path.join(__dirname, '..', 'vendor');
const dry = process.argv.includes('--dry');
const packs = JSON.parse(fs.readFileSync(path.join(V, 'packs.json'), 'utf8'));
let changed = 0, total = 0;
for (const pk of packs.packs) {
  const file = path.join(__dirname, '..', pk.file), data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const s of data.songs) {
    total++;
    const before = s.lyrics, r = T.tidy(before);
    if (!r.lyrics) continue;
    const was = new Set(s.was || []); was.add(T.hash(before));
    s.title = T.tidyTitle(s.title) || r.title;
    if (r.lyrics !== before) changed++;
    s.lyrics = r.lyrics; s.parts = r.parts.join(' ');
    if (r.other) s[r.other.kind] = r.other.lyrics; else { delete s.translation; delete s.transliteration; }
    was.delete(T.hash(s.lyrics)); s.was = [...was];
  }
  if (!dry) { fs.writeFileSync(file, JSON.stringify(data, null, 0)); pk.v = (pk.v || 1) + 1; }
  console.log(pk.id, data.songs.length, 'songs');
}
if (!dry) fs.writeFileSync(path.join(V, 'packs.json'), JSON.stringify(packs));
console.log(changed, 'of', total, 'songs changed');
