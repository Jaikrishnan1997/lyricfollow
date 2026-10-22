// The replays and the simulated bench that need no browser, with the floors they must not fall below.
// Run before every push (and in CI): node tests/ci.js
const { execFileSync } = require('child_process'), path = require('path');
const T = f => path.join(__dirname, f);
const run = (f, env) => execFileSync(process.execPath, [T(f)], { env: Object.assign({}, process.env, env || {}), encoding: 'utf8', maxBuffer: 1 << 26 });
const fails = [], ok = (cond, what) => { console.log((cond ? 'ok   ' : 'FAIL ') + what); if (!cond) fails.push(what); };
// live runs, tracker alone: right line and song switch time
for (const [file, floor] of [['live_two_songs.json', 60], ['live_two_songs2.json', 60], ['live_two_songs3.json', 60], ['live_two_songs4.json', 60]]) {
  const out = run('two_songs_replay.js', { RUN: file }).trim().split('\n').pop();
  const m = out.match(/\((\d+)%\).*switch to Enthan at ([\d.]+) \(singing from ([\d.]+)\)/);
  ok(m && +m[1] >= floor, `${file}: right line ${m ? m[1] : '?'}% (floor ${floor}%)`);
  ok(m && +m[2] - +m[3] <= 12, `${file}: switch ${m ? (+m[2] - +m[3]).toFixed(1) : '?'} s after the new song began (max 12 s)`);
}
{ const out = run('single_song_replay.js'); const m = out.match(/sung order\s+exact (\d+)\/(\d+)/); ok(m && +m[1] >= 30, `single song, sung order: exact ${m ? m[1] + '/' + m[2] : '?'} (floor 30)`); }
{ const out = run('sparse_replay.js'); const lines = out.trim().split('\n');
  for (const [name, want, by] of [['Alleluya sung, Enthan open', 'அல்லேலூயா', 505], ['Alleluya from the top', 'அல்லேலூயா', 845], ['Alleluya restarted', 'எந்தன்', 345], ['Enthan sung after Alleluya', 'எந்தன்', 1020]]) {
    const l = lines.find(x => x.startsWith(name)) || ''; const sws = [...l.matchAll(/([\d.]+)s SWITCH -> (\S+)/g)];
    ok(sws.length === 1 && sws[0][2].startsWith(want) && +sws[0][1] <= by, `${name}: one switch to ${want} by ${by} s (${sws.map(x => x[1] + 's ' + x[2].slice(0, 8)).join(', ') || 'none'})`);
  } }
{ const out = run('false_switch_replay.js'); const m = out.match(/false switches (\d+)/); ok(m && +m[1] === 0, `chit-chat: false switches ${m ? m[1] : '?'} (must be 0)`); }
for (const [env, floor, wrongMax] of [[{}, 70, 5], [{ SPARSE: '1' }, 56, 14.5]]) {
  const out = run('tracker_bench.js', env).trim().split('\n').pop();
  const m = out.match(/right line ([\d.]+)%.*wrong ([\d.]+)% \(wrong song ([\d.]+)%/);
  ok(m && +m[1] >= floor && +m[2] <= wrongMax && +m[3] <= 1, `bench${env.SPARSE ? ' sparse' : ''}: right ${m ? m[1] : '?'}% (floor ${floor}), wrong ${m ? m[2] : '?'}% (max ${wrongMax}), wrong song ${m ? m[3] : '?'}% (max 1)`);
}
// Bible references (spoken and typed, ta/ml/en) and the quiz questions (every question finds its answer in all
// three languages; sermon talk finds none)
for (const f of ['refs_test.js', 'quiz_test.js']) {
  let out = '', code = 0; try { out = run(f); } catch (e) { out = String(e.stdout || ''); code = e.status || 1; }
  ok(code === 0, `${f}: ${out.trim().split('\n').pop()}`);
}
if (fails.length) { console.log(`\n${fails.length} check(s) failed`); process.exit(1); } else console.log('\nall checks passed');
