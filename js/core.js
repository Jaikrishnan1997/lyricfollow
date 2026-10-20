/* Lyric Follow — core matching engine (offline, no dependencies).
 * Phonetic keys make Malayalam, Tamil, Hindi script and English/Manglish/Tanglish spellings comparable. */
(function (root) {
  'use strict';
  // Malayalam, Tamil, Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Telugu, Kannada share one layout.
  const BLOCKS = [0x0D00, 0x0B80, 0x0900, 0x0980, 0x0A00, 0x0A80, 0x0B00, 0x0C00, 0x0C80];
  const IND = {0x05:'a',0x06:'a',0x07:'i',0x08:'i',0x09:'u',0x0A:'u',0x0B:'ru',0x0E:'e',0x0F:'e',0x10:'ai',0x11:'o',0x12:'o',0x13:'o',0x14:'au'};
  const CONS = {0x15:'k',0x16:'k',0x17:'k',0x18:'k',0x19:'n',0x1A:'c',0x1B:'c',0x1C:'c',0x1D:'c',0x1E:'n',
    0x1F:'t',0x20:'t',0x21:'t',0x22:'t',0x23:'n',0x24:'t',0x25:'t',0x26:'t',0x27:'t',0x28:'n',0x29:'n',
    0x2A:'p',0x2B:'f',0x2C:'p',0x2D:'p',0x2E:'m',0x2F:'y',0x30:'r',0x31:'r',0x32:'l',0x33:'l',0x34:'l',
    0x35:'v',0x36:'s',0x37:'s',0x38:'s',0x39:'h'};
  const SIGN = {0x3E:'a',0x3F:'i',0x40:'i',0x41:'u',0x42:'u',0x43:'ru',0x46:'e',0x47:'e',0x48:'ai',0x4A:'o',0x4B:'o',0x4C:'au',0x57:'au'};
  const CHILLU = {0x0D7A:'n',0x0D7B:'n',0x0D7C:'r',0x0D7D:'l',0x0D7E:'l',0x0D7F:'k',0x0D54:'m',0x0D55:'y',0x0D56:'l'};

  function off(cp) { for (const b of BLOCKS) if (cp >= b && cp < b + 0x80) return cp - b; return -1; }

  // Arabic / Urdu / Persian letters (speech models sometimes write Malayalam or Tamil sounds in this script).
  const ARABIC = {
    'ا':'a','آ':'a','أ':'a','إ':'i','ب':'b','پ':'p','ت':'t','ٹ':'t','ث':'s','ج':'j','چ':'c','ح':'h','خ':'k','د':'d','ڈ':'d','ذ':'z',
    'ر':'r','ڑ':'r','ز':'z','ژ':'z','س':'s','ش':'s','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'g','ف':'f','ق':'k','ک':'k','ك':'k',
    'گ':'g','ل':'l','م':'m','ن':'n','ں':'n','و':'u','ؤ':'u','ہ':'h','ھ':'h','ه':'h','ة':'h','ی':'i','ي':'i','ى':'i','ے':'e','ۓ':'e','ئ':'i','ء':''
  };
  function translit(s) {
    const cps = Array.from(s, c => c.codePointAt(0)); let out = '';
    for (let i = 0; i < cps.length; i++) {
      const cp = cps[i];
      if (cp >= 0x0600 && cp <= 0x06FF) { const a = ARABIC[String.fromCodePoint(cp)]; out += a == null ? (cp >= 0x064B && cp <= 0x065F ? '' : ' ') : a; continue; }
      if (cp === 0x200C || cp === 0x200D) continue;
      if (CHILLU[cp]) { out += CHILLU[cp]; continue; }
      const o = off(cp);
      if (o < 0) { out += String.fromCodePoint(cp); continue; }
      if (CONS[o]) {
        out += CONS[o];
        const no = i + 1 < cps.length ? off(cps[i + 1]) : -1;
        if (no === 0x4D) i++;
        else if (SIGN[no]) { out += SIGN[no]; i++; }
        else out += 'a';
      } else if (IND[o]) out += IND[o];
      else if (o === 0x02) out += 'm';
      else if (o === 0x03) out += 'h';
      else if (o >= 0x66 && o <= 0x6F) out += String(o - 0x66);
      else out += SIGN[o] || o === 0x4D ? '' : ' ';
    }
    return out;
  }

  const RULES = [[/zh/g,'l'],[/ph/g,'f'],[/sh/g,'s'],[/ch/g,'c'],[/([kgcjtdpb])h/g,'$1'],
    [/g/g,'k'],[/j/g,'c'],[/d/g,'t'],[/b/g,'p'],[/q/g,'k'],[/x/g,'ks'],[/w/g,'v'],[/z/g,'s'],
    [/ee/g,'i'],[/oo/g,'u'],[/nr/g,'nt'],[/([a-z])\1+/g,'$1']];

  /** Phonetic key of one word or phrase, spaces kept (use keyNS for no spaces). */
  /** Speech models sometimes repeat a word many times ("nin nin nin nin"): keep one. */
  function collapseRepeats(s) {
    return String(s || '').replace(/\b(?!\d+\b)(\S+)(?:[\s,.-]+\1\b){2,}/giu, '$1').replace(/\b(\S+\s+\S+)(?:[\s,.-]+\1\b){2,}/giu, '$1');
  }
  function keyWords(s) {
    s = collapseRepeats(s);
    let k = translit(String(s || '').normalize('NFC').replace(/[\u00C0-\u024F]/g, c => c.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    for (const [re, to] of RULES) k = k.replace(re, to);
    return k.trim();
  }
  function key(s) { return keyWords(s).replace(/[^a-z]/g, ''); }

  function grams(s, n) { n = n || 3; const g = new Set(); for (let i = 0; i + n <= s.length; i++) g.add(s.slice(i, i + n)); return g; }

  const WINDOWS = [[12, .82], [20, .94], [32, 1]];
  // Consonant skeleton: survives the vowel and spelling changes that speech models make when they write
  // Malayalam/Tamil in English letters ("Ninh snayham" for "നിൻ സ്നേഹം").
  function skel(k) { return k.replace(/[aeiouyhw]/g, '').replace(/([a-z])\1+/g, '$1'); }
  function bigrams(s) { const m = new Map(); for (let i = 0; i + 2 <= s.length; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; }
  function dice(A, nA, B, nB) { let n = 0; for (const [g, v] of A) { const w = B.get(g); if (w) n += Math.min(v, w); } return nA + nB ? 2 * n / (nA + nB) : 0; }
  function skScore(hs, ln) {
    if (!ln.sk || ln.sk.length < 4 || hs.length < 4) return 0;
    let best = 0;
    for (const f of [.8, 1, 1.3]) {
      const n = Math.max(4, Math.round(ln.sk.length * f)), t = hs.slice(-n), T = bigrams(t);
      const v = dice(T, Math.max(0, t.length - 1), ln.skb, ln.sk.length - 1); if (v > best) best = v;
    }
    return best * .9;
  }
  /** Trigram sets of the most recent sound, computed once per update (cheap on slow PCs).
   *  `heard` may contain spaces (keyWords output): the words are kept for word-level matching. */
  function heardGrams(heard) {
    const out = [];
    const hk = heard.replace(/\s+/g, '');
    for (const [w, wt] of WINDOWS) { if (hk.length < w * .6) continue; const T = grams(hk.slice(-w)); if (T.size) out.push([T, wt]); }
    out.sk = skel(hk.slice(-48));
    out.words = heard.indexOf(' ') >= 0 ? heard.trim().split(/\s+/).filter(x => x.length >= 2).slice(-20) : [];
    return out;
  }
  /* ---------- Word-level matching: robust to dropped or misheard words in a line ---------- */
  function lev1w(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
  }
  function wordMatch(h, lw) {
    for (const w of lw) {
      if (w === h) return 1;
      if (w.length >= 4 && h.length >= 4 && (skel(w) === skel(h) || lev1w(w, h))) return .9;
      if (w.length >= 5 && h.length >= 5 && w.startsWith(h.slice(0, 4)) && Math.abs(w.length - h.length) <= 2) return .7;
    }
    return 0;
  }
  function wordScoreK(hw, ln, lnPrev, K) {
    K = Math.min(hw.length, K); if (!K) return 0;
    let tot = 0, got = 0;
    for (let i = hw.length - K; i < hw.length; i++) {
      const wt = 1 + (i - (hw.length - K)) / K; tot += wt;                     // recent words count more
      let m = wordMatch(hw[i], ln.w); if (m && ln.wu.has(hw[i])) m = Math.min(1.35, m * 1.5);   // words unique to this line count extra
      if (!m && lnPrev && i < hw.length - 2) m = .35 * wordMatch(hw[i], lnPrev.w);          // the previous line's words at the start of this one
      got += wt * m;
    }
    return Math.min(1, got / tot);
  }
  /** Share of the recently heard words that belong to a line (0..1). */
  function wordScore(hw, ln, lnPrev) {
    if (!hw || !hw.length || !ln.w) return 0;
    let s = Math.max(wordScoreK(hw, ln, lnPrev, 7), .9 * wordScoreK(hw, ln, null, 3));
    const last = hw[hw.length - 1];
    if (last && last.length >= 4) for (const w of ln.wu) if (w === last || (w.length >= 5 && (skel(w) === skel(last) || lev1w(w, last)))) { s = Math.max(s, .62); break; }
    return s;
  }
  function scoreG(HG, g, ln) {
    let s = 0;
    for (const [T, wt] of HG) { let m = 0; for (const x of T) if (g.has(x)) m++; const v = wt * m / T.size; if (v > s) s = v; }
    if (ln && HG.sk) { const k = skScore(HG.sk, ln); if (k > s) s = k; }
    return s;
  }
  /** How much of the most recently heard sound belongs to a line (0..1). */
  function lineScore(heard, g) { return scoreG(heardGrams(heard), g); }

  function prepLine(t) { const k = key(t), sk = skel(k); return { text: t, key: k, g: grams(k), sk, skb: bigrams(sk), w: keyWords(t).split(/\s+/).filter(x => x.length >= 2), wu: new Set() }; }
  function prepare(lines) {
    const out = lines.map(prepLine), cnt = new Map();
    for (const ln of out) for (const w of new Set(ln.w)) cnt.set(w, (cnt.get(w) || 0) + 1);
    for (const ln of out) ln.wu = new Set(ln.w.filter(w => cnt.get(w) === 1));
    return out;
  }

  /** Best score of a whole song against what was heard. */
  function songScore(heard, lines) {
    const HG = heardGrams(heard); let best = 0;
    for (const ln of lines) { if (ln.key.length >= 3) best = Math.max(best, scoreG(HG, ln.g, ln)); if (ln.alts) for (const a of ln.alts) best = Math.max(best, scoreG(HG, a.g, a)); }
    return best;
  }

  /** Choose the line being sung. Forward moves are preferred; jumps need a stronger match. */
  function decide(st, lines, heard, thr, opts) {
    const HG = heardGrams(heard);
    let best = { j: st.cur, s: 0 }, curS = 0;
    // Moving ahead needs a word of the new line that the current line does not have: lines that share an ending
    // ("…தேவனைத் துதியுங்கள்") must not pull the screen forward while the current line is being sung (or repeated).
    const curLn = lines[st.cur], recent = HG.words.slice(-6);
    const curW = curLn && curLn.w ? curLn.w.concat(...(curLn.alts || []).map(a => a.w || [])) : [];
    const distinct = ln => { if (!curLn || !recent.length) return true; const own = (ln.w || []).concat(...(ln.alts || []).map(a => a.w || [])).filter(w => !curW.includes(w)); return own.length > 0 && recent.some(h => wordMatch(h, own) >= .9); };
    const rawOf = j => {
      const ln = lines[j]; let prev = j - 1; while (prev >= 0 && lines[prev].alt) prev--;
      let raw = Math.max(HG.length ? scoreG(HG, ln.g, ln) : 0, .95 * wordScore(HG.words, ln, lines[prev]));
      if (ln.alts) for (const a of ln.alts) raw = Math.max(raw, HG.length ? scoreG(HG, a.g, a) : 0, .95 * wordScore(HG.words, a, null));
      return raw;
    };
    const curRaw = curLn && curLn.key && curLn.key.length >= 3 && (HG.length || HG.words.length) ? rawOf(st.cur) : 0;
    if (HG.length || HG.words.length) for (let j = 0; j < lines.length; j++) {
      const ln = lines[j]; if (ln.key.length < 3) continue;
      const raw = j === st.cur ? curRaw : rawOf(j);
      let s = raw;
      const d = j - st.cur;
      // ...unless the new line clearly fits better than the current one.
      if (d > 0 && d <= 3 && curRaw >= raw - .05 && !distinct(ln)) s -= .15;
      if (d === 0) { s += .02; curS = raw; }
      else if (d === 1) s += .05;
      else if (d === 2 || d === 3) s -= .03 * (d - 1);
      else if (d === -1) s -= (opts && opts.back) || .10;      // clip-based engines hear the end of the previous line again
      // Further away: the nearest copy of a repeated line wins (a chorus sung again goes to the next chorus, not the first).
      else s -= d > 0 ? .15 + Math.min(.06, d * .002) : .18 + Math.min(.06, -d * .002);
      if (s > best.s) best = { j, s };
    }
    st.score = Math.max(best.s, curS);
    st.raw = best.s;
    if (best.j === st.cur || best.s < thr) { st.pend = -1; st.hits = 0; return false; }
    if (st.pend === best.j) st.hits++; else { st.pend = best.j; st.hits = 1; }
    const d = best.j - st.cur;
    // The next line moves as soon as it is clearly heard; anything further away must be heard twice in a row
    // (three times for a long jump) so the screen never skips around on one noisy phrase.
    const ok = d === 1 ? (st.hits >= 2 || best.s >= thr + .1)
      : Math.abs(d) <= 3 ? (st.hits >= 2 && best.s >= thr + .05) || best.s >= thr + .3
      : (st.hits >= 3 && best.s >= thr + .05) || (st.hits >= 2 && best.s >= thr + .25);
    if (ok) { st.cur = best.j; st.pend = -1; st.hits = 0; return true; }
    return false;
  }

  /** Where in the song the LAST heard words are: { j: line index, p: word position in that line, n: words in it }.
   *  The newest words of a clip are aligned backwards against each candidate line, so "…வல்லோரைத் துதியுங்கள்"
   *  says the singer is at the end of that line. Candidates are main lines (not transliteration twins) from `from`. */
  function place(heardWords, lines, cand) {
    const hw = heardWords.filter(w => w.length >= 2).slice(-5); if (!hw.length) return null;
    let best = null;
    for (const j of cand) {
      const ln = lines[j]; if (!ln || !ln.w || !ln.w.length) continue;
      let pj = j - 1; while (pj >= 0 && lines[pj].alt) pj--;
      const before = pj >= 0 ? (lines[pj].w || []) : [];
      for (const own of [ln.w, ...(ln.alts || []).map(a => a.w || [])]) {
        if (!own.length) continue;
        // the previous line's words go in front, so a clip that runs from one line into the next is placed right
        const words = before.concat(own), off = before.length;
        for (let p = words.length - 1; p >= off; p--) {
          // match heard words backwards from the last one against the line backwards from p
          let k = hw.length - 1, q = p, got = 0, miss = 0;
          while (k >= 0 && q >= 0 && miss <= 1) { const m = wordMatch(hw[k], [words[q]]); if (m >= .7) { got += m; k--; q--; } else if (miss === 0 && k > 0 && wordMatch(hw[k - 1], [words[q]]) >= .7) { miss++; k--; } else { miss++; q--; } }
          const sc = got - miss * .3;
          if (sc >= 1.6 && (!best || sc > best.sc + .2 || (Math.abs(sc - best.sc) <= .2 && cand.indexOf(j) < cand.indexOf(best.j)))) best = { j, p: p - off, n: own.length, sc };
        }
      }
    }
    return best;
  }

  /* ---------- Song library index: finds which song (and line) is being sung, across all songs ---------- */
  function songIndex(list) {   // list: [{id, lines:[{key,g}]}]
    const map = new Map();
    list.forEach((s, si) => s.lines.forEach((ln, li) => {
      if (ln.key.length < 3) return;
      for (const x of ln.g) { let a = map.get(x); if (!a) map.set(x, a = []); a.push(si * 4096 + li); }
      if (ln.alts) for (const alt of ln.alts) for (const x of alt.g) { let a = map.get(x); if (!a) map.set(x, a = []); if (a[a.length - 1] !== si * 4096 + li) a.push(si * 4096 + li); }
    }));
    return { list, map };
  }
  /** Best line in each song for what was just heard. Returns [{id, line, score}] best first. */
  function songLookup(ix, heard, limit) {
    const HG = heardGrams(heard), best = new Map();
    for (const [T, wt] of HG) {
      const cnt = new Map();
      for (const x of T) { const a = ix.map.get(x); if (a && a.length < 3000) for (const k of a) cnt.set(k, (cnt.get(k) || 0) + 1); }
      for (const [k, c] of cnt) {
        const sc = wt * c / T.size, si = Math.floor(k / 4096);
        const b = best.get(si);
        if (!b || sc > b.score) best.set(si, { id: ix.list[si].id, line: k % 4096, score: sc });
      }
    }
    // Second pass on consonant skeletons (catches transliterated Malayalam/Tamil from the offline model).
    if (HG.sk && HG.sk.length >= 4) {
      let budget = 6000;
      ix.list.forEach((s, si) => s.lines.forEach((ln, li) => {
        if (budget-- <= 0 || ln.key.length < 3) return;
        const sc = skScore(HG.sk, ln); if (sc < .5) return;
        const b = best.get(si); if (!b || sc > b.score) best.set(si, { id: s.id, line: li, score: sc });
      }));
    }
    return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit || 3);
  }

  /* ---------- Today's service index: every line and word of the service songs ----------
   * Built once when the service list changes (a few ms). Words are weighted by how rare they are across all the
   * service songs (common ones like "துதியுங்கள்", "Hallelujah" count little, a song's own words count a lot),
   * and indexed by spelling and by consonant skeleton, so Tamil/Malayalam script and English-letter spellings meet.
   * songs: [{id, lines: prepared lines (with .w, .alt, .alts, .main)}] */
  function serviceIndex(songs) {
    const rows = [], df = new Map(), post = new Map();
    const add = (k, r) => { let a = post.get(k); if (!a) post.set(k, a = new Set()); a.add(r); };
    songs.forEach((sg, si) => sg.lines.forEach((ln, li) => {
      if (ln.alt || !ln.w || !ln.w.length) return;
      const words = new Set(ln.w.concat(...(ln.alts || []).map(a => a.w || [])).filter(w => w.length >= 2));
      const keys = new Set(); for (const w of words) { keys.add(w); const k = skel(w); if (k.length >= 3) keys.add('~' + k); }
      const r = rows.length; rows.push({ s: si, id: sg.id, line: li, keys, n: ln.w.length });
      for (const k of keys) { add(k, r); df.set(k, (df.get(k) || 0) + 1); }
    }));
    const N = rows.length || 1, idf = k => Math.log(1 + N / (df.get(k) || 1));
    for (const r of rows) { let t = 0; for (const k of r.keys) if (k[0] !== '~') t += idf(k); r.total = t || 1; }
    return { rows, post, idf, songs: songs.map(s => s.id) };
  }
  /** Which service song and line the heard words belong to: [{id, line, score}] best first (one per song).
   *  score ~ share of the line's own (rare) words that were heard, 0..1. */
  function serviceFind(ix, heardWords, limit) {
    if (!ix || !ix.rows.length) return [];
    const hw = heardWords.filter(w => w.length >= 2).slice(-10), acc = new Map();
    // Heard words that are in no service song (talk, other songs) weigh fully against every line.
    const maxIdf = Math.log(1 + ix.rows.length);
    let heardTot = 0; for (const w of new Set(hw)) heardTot += ix.post.has(w) ? ix.idf(w) : ix.post.has('~' + skel(w)) ? .8 * ix.idf('~' + skel(w)) : maxIdf;
    for (const w of new Set(hw)) {
      const seen = new Set();
      for (const k of [w, '~' + skel(w)]) {
        const a = ix.post.get(k); if (!a) continue;
        const wt = k[0] === '~' ? .8 * ix.idf(k) : ix.idf(k);
        for (const r of a) { if (seen.has(r)) continue; seen.add(r); acc.set(r, (acc.get(r) || 0) + wt); }
      }
    }
    const bySong = new Map();
    for (const [r, v] of acc) {
      const row = ix.rows[r], hc = Math.min(1, v / (heardTot || 1)), lc = Math.min(1, v / row.total);
      const sc = Math.sqrt(hc * Math.max(lc, Math.min(1, hc * .8)));      // explains what was heard, and covers the line (or its part)
      const b = bySong.get(row.id); if (!b || sc > b.score) bySong.set(row.id, { id: row.id, line: row.line, score: sc, all: (b ? b.all : []).concat([[row.line, sc]]) }); else b.all.push([row.line, sc]);
    }
    return [...bySong.values()].sort((a, b) => b.score - a.score).slice(0, limit || 3);
  }

  /* ---------- Spoken numbers (English, Malayalam, Tamil) ---------- */
  const NUMWORDS = [
    ['one',1],['two',2],['three',3],['four',4],['five',5],['six',6],['seven',7],['eight',8],['nine',9],['ten',10],
    ['eleven',11],['twelve',12],['thirteen',13],['fourteen',14],['fifteen',15],['sixteen',16],['seventeen',17],['eighteen',18],['nineteen',19],
    ['twenty',20],['thirty',30],['forty',40],['fifty',50],['sixty',60],['seventy',70],['eighty',80],['ninety',90],['hundred',100],
    ['first',1],['second',2],['third',3],['fifth',5],['eighth',8],['ninth',9],['twelfth',12],
    ['ഒന്ന്',1],['ഒന്നാം',1],['രണ്ട്',2],['രണ്ടാം',2],['മൂന്ന്',3],['നാല്',4],['അഞ്ച്',5],['ആറ്',6],['ഏഴ്',7],['എട്ട്',8],['ഒമ്പത്',9],['ഒൻപത്',9],['പത്ത്',10],
    ['പതിനൊന്ന്',11],['പന്ത്രണ്ട്',12],['പതിമൂന്ന്',13],['പതിനാല്',14],['പതിനഞ്ച്',15],['പതിനാറ്',16],['പതിനേഴ്',17],['പതിനെട്ട്',18],['പത്തൊമ്പത്',19],['പത്തൊൻപത്',19],
    ['ഇരുപത്',20],['മുപ്പത്',30],['നാല്പത്',40],['നാൽപ്പത്',40],['അമ്പത്',50],['അൻപത്',50],['അറുപത്',60],['എഴുപത്',70],['എൺപത്',80],['തൊണ്ണൂറ്',90],['നൂറ്',100],
    ['வன்',1],['டூ',2],['த்ரீ',3],['ஃபோர்',4],['போர்',4],['ஃபைவ்',5],['பைவ்',5],['சிக்ஸ்',6],['செவன்',7],['எய்ட்',8],['நைன்',9],['டென்',10],['டுவென்டி',20],['ட்வென்டி',20],['தர்ட்டி',30],
    ['വൺ',1],['ടു',2],['ത്രീ',3],['ഫോർ',4],['ഫൈവ്',5],['സിക്സ്',6],['സെവൻ',7],['എയ്റ്റ്',8],['നൈൻ',9],['ടെൻ',10],['ട്വന്റി',20],['തേർട്ടി',30],
    ['ரெண்டு',2],['ரெண்டாவது',2],['ஒம்பது',9],['ഒൻപത്',9],['ஒண்ணு',1],['மூணு',3],['நாலு',4],['அஞ்சு',5],['ஒன்னு',1],
    ['ஒன்று',1],['ஒன்றாம்',1],['இரண்டு',2],['மூன்று',3],['நான்கு',4],['ஐந்து',5],['ஆறு',6],['ஏழு',7],['எட்டு',8],['ஒன்பது',9],['பத்து',10],
    ['பதினொன்று',11],['பன்னிரண்டு',12],['பதிமூன்று',13],['பதினான்கு',14],['பதினைந்து',15],['பதினாறு',16],['பதினேழு',17],['பதினெட்டு',18],['பத்தொன்பது',19],
    ['இருபது',20],['முப்பது',30],['நாற்பது',40],['ஐம்பது',50],['அறுபது',60],['எழுபது',70],['எண்பது',80],['தொண்ணூறு',90],['நூறு',100]
  ];
  let NUMKEYS = null;
  function numKeys() {
    if (NUMKEYS) return NUMKEYS;
    const m = new Map();
    for (const [w, v] of NUMWORDS) {
      let k = key(w);
      // Malayalam/Tamil words ending in a dead consonant or 'u' also appear without the final vowel in compounds.
      const stems = new Set([k, k.replace(/[aiu]$/, '')]);
      for (const s of stems) if (s.length >= 2 && !m.has(s)) m.set(s, v);
    }
    NUMKEYS = [...m.entries()].sort((a, b) => b[0].length - a[0].length);
    return NUMKEYS;
  }
  function lev1(a, b) {   // true when a and b differ by at most one edit
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
  }
  let NUMSK = null;   // consonant skeletons of long number words (Malayalam/Tamil), for vowel-mangled speech
  function numSkel() {
    if (NUMSK) return NUMSK;
    const m = new Map();
    for (const [w, v] of NUMWORDS) { const k = skel(key(w)); if (k.length >= 4 && !m.has(k)) m.set(k, v); }
    NUMSK = [...m.entries()].sort((a, b) => b[0].length - a[0].length); return NUMSK;
  }
  const SUFFIX = /^(u|am|ame|amatte|amate|amat|avatu|avat|vatu|vat|atu|at|i|e|um|il|tu|ti|amtu|amattu|ataam|amatil)?$/;
  function wordNumberExact(k) {   // exact stem match only (no skeleton or one-letter fuzz)
    const hit = numKeys().find(([s]) => k.startsWith(s)); if (!hit) return null;
    const rest = k.slice(hit[0].length); return SUFFIX.test(rest) ? hit[1] : null;
  }
  function wordNumber(k) {
    let rest = k, total = 0, parts = 0;
    while (rest.length) {
      const hit = numKeys().find(([s]) => rest.startsWith(s));
      if (!hit) break;
      const v = hit[1];
      if (parts && !((total % 10 === 0 && total >= 20 && v < 10) || (total === 100 && v < 100))) break;
      total += v; parts++; rest = rest.slice(hit[0].length).replace(/^(iy|i|u|y|tu|ti|tt[iu]?)(?=[a-z])/, '');
      if (parts >= 3) break;
    }
    // Ordinals glued to the next word by speech recognisers ("padinaramvakyam") are accepted too.
    if (!parts || !(SUFFIX.test(rest) || (rest === 'a' && k.length >= 6) || (/^am/.test(rest) && k.length - rest.length >= 4))) {
      if (k.length >= 6) { const sk = skel(k); const hit = numSkel().find(([x]) => sk.startsWith(x)); if (hit) return hit[1]; }
      if (k.length >= 5 && k.length <= 9) { for (const [stem, v] of numKeys()) for (const suf of ['', 'am', 'u']) { const full = stem + suf; if (full.length >= 5 && full.length === k.length && lev1(full, k)) return v; } }
      return null;
    }
    return total;
  }

  /** All numbers in a phrase, digits or spoken words. Adjacent tens+units are combined ("twenty three" → 23). */
  function numbers(text) {
    const toks = keyWords(text).split(/\s+/).filter(Boolean);
    const out = [];
    let prevWord = false;
    for (let ti = 0; ti < toks.length; ti++) {
      const t = toks[ti];
      if (/^\d+$/.test(t)) { out.push(+t); prevWord = false; continue; }
      // Digits with an ordinal ending glued on ("3m" from Tamil 3ம், "16am", "5th").
      const dm = t.match(/^(\d+)[a-z]{1,4}$/); if (dm) { out.push(+dm[1]); prevWord = false; continue; }
      const k = t.replace(/[^a-z]/g, '');
      let n = null;
      // A number word split in two by the speech model ("padina ramvakyam" = padinaram vakyam) is tried first.
      if (k.length >= 4 && toks[ti + 1] && !/^\d/.test(toks[ti + 1])) {
        const j = wordNumber(k + toks[ti + 1].replace(/[^a-z]/g, ''));
        if (j != null && wordNumberExact(k) == null) { n = j; ti++; }
      }
      if (n == null && k) n = wordNumber(k);
      if (n == null) { prevWord = false; continue; }
      const last = out.length - 1;
      if (prevWord && last >= 0 && ((out[last] % 10 === 0 && out[last] >= 20 && n < 10) || (out[last] === 100 && n < 100))) out[last] += n;
      else out.push(n);
      prevWord = true;
    }
    // "20 28" for twenty-eight (the model writes the tens and then the full number): keep the full number.
    if (out.length >= 3) for (let i = 1; i + 1 < out.length; i++) if (out[i] % 10 === 0 && out[i] >= 20 && out[i + 1] > out[i] && out[i + 1] <= out[i] + 9) { out.splice(i, 1); i--; }
    return out;
  }

  const Core = { wordMatch, place, serviceIndex, serviceFind, skel, collapseRepeats, translit, key, keyWords, grams, bigrams, dice, heardGrams, scoreG, lineScore, songScore, prepare, decide, numbers, songIndex, songLookup };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.LFCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);
