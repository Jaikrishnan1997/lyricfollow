// The simulated singing bench (tests/tracker_bench.js) over Tamil and Malayalam, normal and sparse, seeds 1-3, two
// runs at a time; prints the averages as a table (right / one behind / wrong, %) and per jump pattern.
// node tests/bench_table.js [noise]        JOBS=n  runs at a time (default 2)        ONLY=ta|ml
const { execFile } = require('child_process'), path = require('path');
const noise = process.argv[2] || '.18', jobs = Math.max(1, +process.env.JOBS || 2);
const runs = [];
for (const lang of ['ta', 'ml']) for (const sparse of [0, 1]) for (const seed of [1, 2, 3]) if (!process.env.ONLY || process.env.ONLY === lang) runs.push({ lang, sparse, seed });
const one = r => new Promise((ok, bad) => execFile(process.execPath, [path.join(__dirname, 'tracker_bench.js'), noise, 'pat'],
  { env: Object.assign({}, process.env, { BENCH_LANG: r.lang, SEED: String(r.seed), SPARSE: r.sparse ? '1' : '' }), maxBuffer: 1 << 26 },
  (e, out) => { if (e) return bad(e); r.out = out; ok(); }));
(async () => {
  const q = runs.slice(); await Promise.all(Array.from({ length: jobs }, async () => { while (q.length) await one(q.shift()); }));
  const avg = rs => { const s = [0, 0, 0]; for (const r of rs) { const m = r.out.trim().split('\n').pop().match(/right line ([\d.]+)%\s+one behind ([\d.]+)%\s+wrong ([\d.]+)%/); s[0] += +m[1]; s[1] += +m[2]; s[2] += +m[3]; } return s.map(x => (x / rs.length).toFixed(1)); };
  const pat = (rs, name, at) => { const s = [0, 0, 0]; for (const r of rs) { const l = r.out.split('\n').find(x => x.startsWith('pat ' + name + ' ')); const part = at ? l.split('|')[1] : l.split('|')[0]; const m = part.match(/right ([\d.]+) behind ([\d.]+) wrong ([\d.]+)/); s[0] += +m[1]; s[1] += +m[2]; s[2] += +m[3]; } return s.map(x => (x / rs.length).toFixed(1)); };
  console.log('| bench | right | one behind | wrong | odd135 r/w @0.6 | jump1231 r/w @0.6 | anyjump r/w @0.6 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const lang of ['ta', 'ml']) for (const sparse of [0, 1]) {
    const rs = runs.filter(r => r.lang === lang && r.sparse === sparse); if (!rs.length) continue;
    const a = avg(rs), p = n => { const x = pat(rs, n, true); return x[0] + ' / ' + x[2]; };
    console.log(`| ${lang === 'ta' ? 'Tamil' : 'Malayalam'} ${sparse ? 'SPARSE' : 'normal'} (seeds ${rs.map(r => r.seed).join(',')}) | ${a[0]} | ${a[1]} | ${a[2]} | ${p('odd135')} | ${p('jump1231')} | ${p('anyjump')} |`);
  }
  if (process.env.SEEDS) for (const r of runs) console.log(r.lang, r.sparse ? 'sparse' : 'normal', 'seed', r.seed, r.out.trim().split('\n').pop());
})();
