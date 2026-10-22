// Chit-chat and noise clips (tests/live_false_switch*.json) with each of today's service songs open, at three
// places: must never switch songs.  node tests/false_switch_replay.js
const path = require('path');
const R = path.join(__dirname, '..') + '/';
const src = require('fs').readFileSync(__dirname + '/sparse_replay.js', 'utf8').split('\nconst V =')[0]
  .replace(/require\('\.\.\//g, "require('" + R).replace(/__dirname \+ '\/\.\.\//g, "'" + R);
eval(src.replace('const Core', 'var Core').replace('const svc', 'var svc').replace('const T =', 'var T =').replace('const all', 'var all'));
let sw = 0, tot = 0;
for (const f of ['live_false_switch', 'live_false_switch2']) {
  const clips = require(__dirname + '/' + f + '.json');
  for (const open of svc) for (const cur of [0, 5, 12]) {
    const st = { song: open.id, cur }; let t = 0;
    for (const text of clips) { t += 3.3; tot++; const r = Core.trackStep(T, st, text, t * 1000); if (r) { if (r.song !== st.song) { sw++; console.log(f, open.title.slice(0, 12), '->', r.song.slice(0, 12), text); } st.song = r.song; st.cur = r.line; } }
  }
}
console.log('false switches', sw, 'of', tot, 'clips');
