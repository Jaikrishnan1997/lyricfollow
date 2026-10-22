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
  function songLookup(ix, heard, limit, noSkel) {
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
    if (!noSkel && HG.sk && HG.sk.length >= 4) {
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
      // explains what was heard, and covers the line (or a good part of it - only when 3+ words were heard:
      // a single word, e.g. Whisper's "வணக்கம்!" over silence, matched a Malayalam line by its skeleton alone)
      const sc = Math.sqrt(hc * (hw.length >= 3 ? Math.max(lc, Math.min(1, hc * .8)) : lc));
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
      const dm = t.match(/^(\d+)[a-z]{1,6}$/); if (dm) { out.push(+dm[1]); prevWord = false; continue; }   // also "10avatu" (Tamil 10ஆவது)
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


  /* ---------- Line-by-line follower for noisy song transcripts (Whisper over a room mic) ----------
   * Whisper often gets only half of each sung word right ("அவன் நடத்தும் செய்யுங்கள்" for "அவர் நடத்தும்
   * செயல்களெல்லாம்"). Whole-line trigram scores then stay low and the screen fell 3-4 lines behind (seen live).
   * Here each heard word is matched to the closest word of a line by edit distance on a sound-alike spelling
   * (k/g, c/s/j, t/d, p/b), weighted by how rare that word is in the song, and the singer is assumed to go on
   * line by line: the next line wins easily, lines further on need more evidence. */
  function phon(w) { return w.replace(/g/g, 'k').replace(/[jsz]/g, 'c').replace(/d/g, 't').replace(/b/g, 'p').replace(/w/g, 'v').replace(/([a-z])\1+/g, '$1'); }
  function levV(a, b) {
    const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n);
    let p = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const c = [i];
      for (let j = 1; j <= n; j++) { const x = a[i - 1], y = b[j - 1]; const sub = x === y ? 0 : (/[aeiou]/.test(x) && /[aeiou]/.test(y)) ? .5 : 1; c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + sub); }
      p = c;
    }
    return p[n];
  }
  function wsim(a, b) { return 1 - levV(a, b) / Math.max(a.length, b.length); }
  const SIMC = new Map();
  function wsimC(a, b) { const k = a + '|' + b; let v = SIMC.get(k); if (v === undefined) { if (SIMC.size > 50000) SIMC.clear(); v = wsim(a, b); SIMC.set(k, v); } return v; }
  // Whisper often writes only the start of a long sung word ("சூரிய" for "சூரியனே")
  function wsimP(h, w) { let v = wsimC(h, w); if (h.length >= 4 && w.length > h.length + 1 && h.length * 2 >= w.length) { const q = wsimC(h, w.slice(0, h.length)); if (q >= .8) v = Math.max(v, .9 * q); } return v; }
  function seqWords(t) { return keyWords(t).split(/\s+/).filter(w => w.length >= 2).map(phon); }
  /** True when (almost) every word of `text` is also in `hint`: Whisper may only be repeating its hint. */
  function echoOf(text, hint) {
    const hw = seqWords(text).filter(w => w.length >= 3), pw = seqWords(hint);
    if (!hw.length || !pw.length) return false;
    const inHint = h => pw.some(w => wsim(h, w) >= .7 || (h.length >= 4 && w.length > h.length && wsim(h, w.slice(0, h.length)) >= .75));
    return hw.filter(inHint).length >= Math.max(1, Math.ceil(hw.length * .8));
  }
  /** lines: [{text, alt}] - alternate-language copies (alt) are skipped. */
  function seqIndex(lines, idfShared) {
    const idx = [], W = [], K = [], first = [];
    let lastSlide = null;
    lines.forEach((l, i) => {
      if (!l || l.alt) return;
      first.push(l.slide !== lastSlide); lastSlide = l.slide;
      idx.push(i); W.push(seqWords(l.text)); K.push(key(l.text));
    });
    const df = new Map(); for (const ws of W) for (const w of new Set(ws)) df.set(w, (df.get(w) || 0) + 1);
    const N = W.length, idf = idfShared || (w => Math.log((N + 1) / ((df.get(w) || 0) + .5)));
    const rep = K.map(k => K.filter(x => x === k).length > 1);
    return { idx, W, K, rep, first, idf, pos: new Map(idx.map((li, p) => [li, p])) };
  }
  function seqScore(ix, hw, p) {
    const lw = ix.W[p]; let m = 0, tot = 0, n = 0; const used = new Set();
    for (const h of hw) {
      if (h.length < 3) continue;
      // each word of the line answers one heard word only ("அல்லேலூயா அல்லேலூயா" is not the line with one அல்லேலூயா)
      let bs = 0, bw = null, bk = null;
      for (let k = 0; k < lw.length; k++) { if (used.has(k)) continue; const v = wsimP(h, lw[k]); if (v > bs) { bs = v; bw = [lw[k]]; bk = [k]; } }
      for (let k = 0; k + 1 < lw.length; k++) { if (used.has(k) || used.has(k + 1)) continue; const v = wsimC(h, lw[k] + lw[k + 1]); if (v > bs) { bs = v; bw = [lw[k], lw[k + 1]]; bk = [k, k + 1]; } }
      if (bs >= .55 && bk) bk.forEach(k => used.add(k));
      // A heard word that is not in the line counts fully against it (not with the weight of whichever line word it
      // resembles least badly - seen live: "அல்லேலூயா கர்த்தரையே ஏகமாய்த்" fitted "நாள் வரையில் அல்லேலூயா" at .67).
      if (!bw || bs < .55) { tot += 1; continue; }
      const wt = Math.max(.3, Math.min(...bw.map(ix.idf)));
      tot += wt; if (bs >= .55) { m += wt * bs; if (wt >= 1) n++; }   // n: matched words that say something (not "துதியுங்கள்")
    }
    // A few common words ("தேவனைத் துதியுங்கள்" ends half the lines) are not enough evidence for a line on their own.
    return { s: tot ? Math.min(1, m / Math.max(tot, 2.2)) : 0, n };
  }
  /** One clip: returns {line, score} when the singer has moved on to a later line, else {line: null, score}.
   *  st keeps a pending far jump between clips ({pend}). */
  function seqStep(ix, cur, text, st) {
    const hw = seqWords(text); if (!hw.length || !ix.W.length) return { line: null, score: 0 };
    let c = cur < 0 ? -1 : ix.pos.has(cur) ? ix.pos.get(cur) : -1;
    if (cur >= 0 && c < 0) { for (let p = ix.idx.length - 1; p >= 0; p--) if (ix.idx[p] <= cur) { c = p; break; } }
    const sCur = c >= 0 ? seqScore(ix, hw, c).s : 0;
    let best = -1, bs = 0, bn = 0;
    for (let p = Math.max(0, c - 1); p <= Math.min(ix.W.length - 1, c + 6); p++) {
      const r = seqScore(ix, hw, p); let v = r.s; const d = p - c;
      if (d === 1) v += .06; else if (d >= 3) v -= .03 * (d - 2);
      if (v > bs + .001) { bs = v; best = p; bn = r.n; }
    }
    const out = l => ({ line: l, score: bs });
    // The song started again from the top (sung twice, or the band went back): its opening lines, clearly heard
    // twice while the screen is well into the song.
    if (c >= 6) {
      let b0 = -1, s0 = 0, n0 = 0; for (let p = 0; p <= 1; p++) { const r = seqScore(ix, hw, p); if (r.s > s0) { s0 = r.s; b0 = p; n0 = r.n; } }
      if (s0 >= .65 && n0 >= 2 && !ix.rep[b0] && s0 > sCur + .15 && s0 >= bs) {
        if (st.top >= 0) { st.top = -1; st.pend = -1; return { line: ix.idx[b0], score: s0 }; }
        st.top = b0; return { line: null, score: s0 };
      }
    }
    st.top = -1;
    const d = best - c;
    if (best <= c) {
      st.pend = -1;
      // A chorus line sung again just behind the screen ("அல்லேலூயா அல்லேலூயா" repeated after the chorus ended and
      // the screen had moved on to the next verse): back to it.
      for (let p = c - 1; p >= Math.max(0, c - 4); p--) {
        if (!ix.rep[p]) continue; const r = seqScore(ix, hw, p);
        if (r.s >= .75 && r.s > sCur + .3) return { line: ix.idx[p], score: r.s };
      }
      return out(null);
    }
    if (bs - sCur < .1) return out(null);
    if (c < 0) return bs >= .55 && best <= 1 ? out(ix.idx[best]) : out(null);   // before the song: only its opening
    if (d === 1) return bs >= .4 ? out(ix.idx[best]) : out(null);
    // A chorus line far ahead is most likely the chorus sung again here, not a skipped verse.
    if (ix.rep[best] && d > 4) { st.pend = -1; return out(null); }
    const two = st.pend >= 0 && Math.abs(st.pend - best) <= 1 && bs >= (d === 2 ? .38 : .45) && bn >= (d === 2 ? 1 : 2);
    if ((bs >= (d === 2 ? .55 : .6) && bn >= 2) || two) { st.pend = -1; return out(ix.idx[best]); }
    st.pend = best; return out(null);
  }


  /* ---------- Today's service tracker (Whisper): which song, which line - any line, either direction ----------
   * Singers do not go line by line: a line sung twice, back to the first line between the others (1,2,1,3,1,4…),
   * the chorus again, back to the top, or straight into another song of the service. Each clip is scored against
   * every line of every service song (Core.seqScore, word weights shared across the service so words common to
   * all the songs count little). Inside the open song the nearest lines are preferred - the next line most, a
   * slide's first line and the song's top a little - and the further a jump, the more evidence it needs.
   * Another song takes over only when it fits clearly better twice running (or once, unmistakably). */
  // lib (optional): the whole library's word weights (libIndex). A word common in worship songs everywhere
  // ("அல்லேலூயா", "இயேசு") then counts little even when today's list has only one song with it - seen live: with
  // one song on the list its "அல்லேலூயா" was a rare word, and another song's "அல்லேலூயா ..." moved the screen.
  function trackIndex(songs, lib) {   // songs: [{id, lines:[{text, alt, slide}]}]
    const all = []; songs.forEach(sg => sg.lines.forEach(l => { if (l && !l.alt) all.push(seqWords(l.text)); }));
    const df = new Map(); for (const ws of all) for (const w of new Set(ws)) df.set(w, (df.get(w) || 0) + 1);
    const N = all.length, own = w => Math.log((N + 1) / ((df.get(w) || 0) + .5));
    const k = lib && lib.N ? Math.log(N + 1) / Math.log(lib.N + 1) : 0;
    const idf = k ? (w => Math.min(own(w), Math.max(k * lib.idf(w), .3))) : own;
    const out = { songs: songs.map(sg => ({ id: sg.id, ix: seqIndex(sg.lines, idf) })) };
    // Every distinct word (and pair of neighbouring words) of today's songs -> the places it is in. A clip is then
    // compared with each distinct word once, and only places holding a similar word are scored (the rest score 0):
    // ~0.1-0.5 ms a clip instead of 1-6 ms.
    const voc = new Map(), add = (w, si, p) => { let a = voc.get(w); if (!a) voc.set(w, a = []); a.push(si * 4096 + p); };
    out.songs.forEach((sg, si) => sg.ix.W.forEach((lw, p) => { lw.forEach((w, k) => { add(w, si, p); if (k + 1 < lw.length) add(w + lw[k + 1], si, p); }); }));
    out.voc = [...voc.entries()]; out.vcache = new Map();
    return out;
  }
  // places (per song index) holding a word similar to one of the heard words
  function candidates(T, hw) {
    const per = T.songs.map(() => new Set());
    for (const h of new Set(hw)) {
      if (h.length < 3) continue;
      let hit = T.vcache.get(h);
      if (!hit) {
        hit = [];
        for (const [w, ps] of T.voc) {
          const lh = h.length, lw = w.length;
          if (lw * 2 < lh || (lh * 2 < lw && !(lh >= 4 && w.startsWith(h.slice(0, 2))))) continue;   // far apart in length
          if (wsimP(h, w) >= .55) for (const x of ps) hit.push(x);
        }
        if (T.vcache.size > 3000) T.vcache.clear(); T.vcache.set(h, hit);
      }
      for (const x of hit) per[Math.floor(x / 4096)].add(x % 4096);
    }
    return per;
  }
  // Heard words that fit a line of another song well and that the open song has nowhere at all (not even a word
  // like them): "ஆனந்தம் கொள்ளுவேன்" while Alleluya is open. Shared words ("அல்லேலூயா") keep the open song's score
  // up, so the plain score gap hides how clear such a clip is (seen live: 24 s late into the next song).
  function novelFit(mineSg, oSg, p, hw) {
    if (!mineSg) return 9;
    const mv = mineSg.ix.voc1 || (mineSg.ix.voc1 = [...new Set(mineSg.ix.W.flat())]);
    const lw = oSg.ix.W[p]; let n = 0;
    for (const h of new Set(hw)) {
      if (h.length < 4) continue;
      let bs = 0, bw = null; for (const w of lw) { const v = wsimP(h, w); if (v > bs) { bs = v; bw = w; } }
      if (bs < .75 || oSg.ix.idf(bw) < 1) continue;
      if (mv.some(w => wsimP(h, w) >= .7)) continue;
      n++;
    }
    return n;
  }
  function prior(ix, c, p) {
    const d = p - c;
    if (c < 0) return p === 0 ? .06 : ix.first[p] ? .02 : -.04;
    if (d === 0) return .03;
    if (d === 1) return .08;
    if (d === 2) return .02;
    if (d > 2) return -Math.min(.15, .03 * (d - 2));
    return (p === 0 || ix.first[p] ? .03 : 0) - Math.min(.15, .06 + .015 * -d);
  }
  /* Where in the open song the singer probably is, from all the clips so far (a hidden-Markov filter over its lines).
   * Over music a clip often brings one or two words (measured live with Sarvam: ~1 word every 3 s), too little for
   * any one clip to move the screen with confidence - but the song moves on at the singing speed, and each word
   * that fits a line (or does not) adds up. Each clip: the belief moves on by the time passed (stay on a line for
   * about its length, then the next; sometimes back to a slide's first line or the top), then is weighted by how
   * well the heard words fit each line. */
  function hmmStep(st, ix, sc, c, now, informative) {
    const P = ix.W.length; if (!P) return null;
    let H = st.hmm;
    if (!H || H.song !== st.song || H.P !== P) { H = st.hmm = { song: st.song, P, b: new Float64Array(P), t: now, map: -1, c: -2 }; H.b.fill(.02 / P); H.b[Math.max(0, c)] += .98; }
    if (H.c !== c && c >= 0) { for (let p = 0; p < P; p++) H.b[p] *= .25; H.b[c] += .75; }      // the screen was moved: start from there
    H.c = c;
    const dt = Math.min(12, Math.max(.3, (now - H.t) / 1000)); H.t = now;
    const lps = st.rate > .05 ? 1 / st.rate : 0;                                              // seconds a line, measured
    const firsts = []; for (let p = 0; p < P; p++) if (p === 0 || ix.first[p]) firsts.push(p);
    const nb = new Float64Array(P);
    for (let p = 0; p < P; p++) {
      const v = H.b[p]; if (v < 1e-9) continue;
      const dur = lps || Math.max(1.6, ix.W[p].length * .55 + .5), stay = Math.exp(-dt / dur), mv = 1 - stay;
      nb[p] += v * stay * .96;
      if (p + 1 < P) nb[p + 1] += v * mv * .84; else nb[p] += v * mv * .84;
      if (p + 2 < P) nb[p + 2] += v * mv * .12; else nb[p] += v * mv * .12;
      const j = v * (stay * .04 + mv * .04);                                                  // back to a slide start / anywhere
      for (const f of firsts) nb[f] += j * .7 / firsts.length;
      for (let q = 0; q < P; q++) nb[q] += j * .3 / P;
    }
    if (informative) for (let p = 0; p < P; p++) nb[p] *= .07 + sc[p].s * (sc[p].n >= 1 ? 1 : .5);
    let sum = 0; for (let p = 0; p < P; p++) sum += nb[p]; if (!(sum > 0)) return null;
    let best = 0; for (let p = 0; p < P; p++) { nb[p] /= sum; if (nb[p] > nb[best]) best = p; }
    H.b = nb;
    // equal lines (a chorus written out again): the copy nearest the screen
    if (ix.K[best] && c >= 0) { let near = best; for (let p = 0; p < P; p++) if (ix.K[p] === ix.K[best] && Math.abs(p - c) < Math.abs(near - c)) near = p; best = near; }
    const prevMap = H.map; H.map = best;
    return { p: best, post: nb[best], again: prevMap === best };
  }
  // Keeps the last informative clips (each with, per song, the places it fits well) and finds a song whose places
  // run on in order over the last three clips: {song, p} (p = its place now) or null.
  function trajectory(st, res, big, now) {
    if (!big.length) return null;
    const entry = { t: now, m: new Map() };
    for (const r of res) {
      if (r.top < .6) continue;
      const ps = []; let n = 0; for (let p = 0; p < r.sc.length; p++) if (r.sc[p].s >= Math.max(.6, r.top - .05)) { ps.push(p); n = Math.max(n, r.sc[p].n); }
      if (ps.length && ps.length <= 6) entry.m.set(r.sg.id, { ps, top: r.top, n });
    }
    st.traj = (st.traj || []).filter(e => now - e.t < 25000).concat([entry]).slice(-4);
    if (st.traj.length < 3) return null;
    const c0 = st.cur;
    let found = null;
    for (const r of res) {
      const id = r.sg.id, ix = r.sg.ix, cPos = id === st.song && c0 >= 0 && ix.pos.has(c0) ? ix.pos.get(c0) : -9;
      // any three of the last four clips (one clip that heard nothing useful in between is allowed), the newest included
      const T = st.traj, last = T.length - 1;
      const sets = T.length === 4 ? [[0, 1, 3], [0, 2, 3], [1, 2, 3]] : [[0, 1, 2]];
      for (const set of sets) {
        const rows = set.map(i => T[i].m.get(id)); if (rows.some(x => !x)) continue;
        if (id !== st.song && st.song) {
          // another song: clearly better than the open one in two of the clips, a good fit in each, and real words
          const better = set.filter(i => (T[i].m.get(id) || {}).top >= ((T[i].m.get(st.song) || {}).top || 0) + .1).length;
          if (better < 2 || rows.filter(x => x.top >= .7).length < 2 || rows.reduce((t, x) => t + x.n, 0) < 3) continue;
          // and the clips must point at places, with at least one clip of two real words: one common word a clip
          // ("துதி") fits half the lines of a praise song (seen live: a false switch to ஆத்துமாவே ஸ்தோத்தரி)
          if (!rows.some(x => x.n >= 2) && rows.some((x, i) => i && x.ps.length > 1 && x.ps.join() === rows[i - 1].ps.join())) continue;
        }
        let ok = null, here = false;
        for (const a of rows[0].ps) {
          const b = rows[1].ps.filter(x => x >= a && x <= a + 3).sort((x, y) => x - y)[0]; if (b == null) continue;
          const c = rows[2].ps.filter(x => x >= b && x <= b + 3).sort((x, y) => x - y)[0]; if (c == null) continue;
          // the words fit a run that ends where the screen is: nothing to move (a line like "இயேசுவைத் துதியுங்கள்"
          // is in two verses - seen live: the screen jumped from the end of verse 2 back to verse 1)
          if (cPos !== -9 && c >= cPos - 1 && c <= cPos + 1) { here = true; break; }
          // the same line three times says where only when the screen is far from it
          if (c === a && !(cPos !== -9 && Math.abs(c - cPos) >= 3)) continue;
          // far from the screen (or before the song has started, away from its beginning): good words in two of the
          // clips, not one or two common ones a clip ("உங்க" took the screen from the chorus to verse 3)
          // and the clips must say where: chorus words fit every copy of the chorus ("அல்லேலூயா" - 5 places), and the
          // newest clip itself has to be a good fit
          if (id === st.song && (cPos === -9 ? c > 3 : Math.abs(c - cPos) > 4) && (rows.filter(x => x.top >= .7 && x.ps.length <= 2).length < 2 || rows.reduce((t, x) => t + x.n, 0) < 3 || rows[2].top < .75)) continue;
          // of several runs, the one nearest the screen (ahead first)
          if (ok == null || (cPos !== -9 && Math.abs(c - cPos - .5) < Math.abs(ok - cPos - .5))) ok = c;
          if (cPos === -9) break;
        }
        if (here) break;
        if (ok == null) continue;
        if (!found || (id === st.song && found.song !== st.song)) found = { song: id, p: ok };
        break;
      }
      if (T[last] && !T[last].m.get(id) && found && found.song === id) found = null;   // the newest clip must fit it too
    }
    return found;
  }
  /** st: {song, cur} (cur = line index in the song's lines, -1 before it starts) plus the tracker's own memory.
   *  Returns {song, line, why} when something should change, else null. */
  // Words Whisper writes over unclear audio and music in Tamil/Malayalam ("நான்", "வருகிறேன்", "வணக்கம்", "நன்றி",
  // "சரி", "ஐயா", "ஏனென்றால்"): seen live opening and switching songs on their own, so they are not evidence.
  /* ---------- The whole song library, for songs that are not in today's service ----------
   * Two steps per clip: the letter-gram index finds the few songs that share the most with what was heard (all
   * ~850 songs in ~15 ms), then each is checked word by word like the service songs are (same sound-alike word
   * matching, words weighted by how rare they are across the whole library). A song is opened only when the same
   * song comes out on top in two clips (or one very clear clip), well ahead of the next song - talk and prayer
   * between songs match a different random song every clip. songs: [{id, grp, lines: prepared lines}] - grp: the
   * same song in two packs counts as one. */
  function libIndex(songs) {
    const gix = songIndex(songs), df = new Map(); let N = 0;
    for (const s of songs) for (const l of s.lines) { if (!l || l.alt) continue; N++; for (const w of new Set(seqWords(l.text))) df.set(w, (df.get(w) || 0) + 1); }
    const idf = w => Math.log((N + 1) / ((df.get(w) || 0) + .5));
    return { gix, idf, N, grp: new Map(songs.map(s => [s.id, s.grp || s.id])), byId: new Map(songs.map(s => [s.id, s])), six: new Map() };
  }
  // floor: how well the best song of today's list fits this clip; floorEv: how well it has fitted over the last
  // clips (its running evidence) - a library song must fit clearly better.
  function libStep(L, st, text, skip, now, floor, floorEv) {
    now = now || Date.now(); floor = floor || 0; floorEv = floorEv || 0;
    st.lib = (st.lib || []).filter(h => now - h.at < 30000);
    const hw = seqWords(text).filter(w => w.length >= 2 && !FILLER.has(w) && !SHOUT.has(w)), big = hw.filter(w => w.length >= 3);
    if (!L || big.length < 2) return null;
    // another copy of a song on today's list (same first line) is that song, not a new one
    const out = [], seen = new Set(skip ? [...skip].map(id => L.grp.get(id)).filter(Boolean) : []);
    for (const c of songLookup(L.gix, key(text), 10, /[\u0B80-\u0BFF\u0D00-\u0D7F]/.test(text))) {
      if (skip && skip.has(c.id)) continue;
      const g = L.grp.get(c.id); if (seen.has(g)) continue; seen.add(g);
      let ix = L.six.get(c.id);
      if (!ix) { ix = seqIndex(L.byId.get(c.id).lines, L.idf); L.six.set(c.id, ix); if (L.six.size > 400) L.six.delete(L.six.keys().next().value); }
      let top = 0, topN = 0, p0 = 0;
      for (let p = 0; p < ix.W.length; p++) { const r = seqScore(ix, hw, p); if (r.s > top) { top = r.s; topN = r.n; p0 = p; } }
      out.push({ id: c.id, g, line: ix.idx[p0], k: ix.K[p0], s: top, n: topN });
      if (out.length >= 4) break;
    }
    out.sort((a, b) => b.s - a.s);
    // Running evidence per library song over the last clips (as for the service songs): a song that shares common
    // words with today's song ("இயேசு ராஜா", "துதியுங்கள்", both from Psalm 148) shows itself over several clips
    // of its own lines, while any one clip fits both. Seen live: 30 s of துதி கனம் with அல்லேலூயா கர்த்தரையே open.
    st.lev = st.lev || {};
    for (const g in st.lev) { st.lev[g] *= .65; if (st.lev[g] < .03) delete st.lev[g]; }
    for (const x of out) st.lev[x.g] = (st.lev[x.g] || 0) + x.s * .35;
    const a = out[0]; if (!a) return null; const b = out.find(x => x !== a && x.k !== a.k);
    const m = a.s - (b ? b.s : 0);
    st.lib.push({ g: a.g, s: a.s, n: a.n, m, at: now }); st.libTop = a;
    st.lib[st.lib.length - 1].f = floor;
    const hits = st.lib.filter(h => h.g === a.g && h.s >= Math.max(.5, h.f + .2) && h.n >= 2);
    if ((hits.length >= 2 && hits.some(h => h.m >= .15)) || (a.s >= .8 && a.n >= 3 && m >= .3 && a.s >= floor + .3)) { st.lib = []; st.lev = {}; return { song: a.id, line: a.line, why: 'library', score: a.s }; }
    // the same library song fitting clearly better than today's songs in 3 of the last 4 clips
    const last4 = st.lib.slice(-4), ahead = last4.filter(h => h.g === a.g && h.s - h.f >= .1 && h.n >= 1);
    if (a.s >= .6 && ahead.length >= 3 && ahead.reduce((t, h) => t + h.s - h.f, 0) / ahead.length >= .13) {
      st.lib = []; st.lev = {}; return { song: a.id, line: a.line, why: 'library', score: a.s };
    }
    // over several clips: clearly ahead of today's song and of every other library song
    const ranked = Object.entries(st.lev).sort((x, y) => y[1] - x[1]), lead = ranked[0];
    if (lead && lead[0] === a.g && lead[1] >= .5 && lead[1] >= floorEv + .12 && (!ranked[1] || lead[1] >= ranked[1][1] + .15) &&
        st.lib.filter(h => h.g === a.g && h.s >= .5 && h.n >= 2).length >= 2) {
      st.lib = []; st.lev = {}; return { song: a.id, line: a.line, why: 'library', score: a.s };
    }
    st.libLev = lead ? [lead[0], +lead[1].toFixed(2)] : null;
    return null;
  }
  /** The words heard in the last ~8 s (this clip and the one before), newest last. A clip of singing often brings
   *  one or two words only (measured live with Sarvam: "இயேசுவைத்.", "ராஜாதி ராஜா."), too few to tell lines and
   *  songs apart; with the clip before it there are enough. A clip with plenty of words is used alone. */
  function trackWin(st, text, now, span) {
    now = now || Date.now(); span = span || 8000;
    st.win = (st.win || []).filter(x => now - x.t < span && now - x.t > 0);
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const prev = st.win.map(x => x.text).join(' ');
    st.win.push({ t: now, text: String(text || '') });
    if (st.win.length > 2) st.win.shift();
    return words.length >= 4 || !prev ? text : prev + ' ' + text;
  }
  const FILLER = new Set(['nan', 'varukiren', 'vanakam', 'nanti', 'cari', 'aiya', 'enental', 'parkalam']);
  // What the congregation shouts over the singing ("Praise the Lord!", "Amen!", "ஸ்தோத்திரம்") and what Sarvam
  // writes for bare music ("Thank you.", "music"): measured with a shouting crowd mixed in, these became most of the
  // words heard, and every word that fits no line pulls the right line's score down. Dropped unless a song of
  // today's service has the word itself.
  const SHOUT = new Set(['amen', 'praice', 'lort', 'tank', 'you', 'cecuc', 'klory', 'kot', 'yec', 'come', 'curc', 'lift', 'your', 'hantc', 'hocana', 'hikect', 'mucic', 'myucik', 'ctotiram', 'ctotram', 'nanti', 'the', 'and', 'thank', 'jesus', 'glory', 'praise', 'lord', 'music', 'tenkyu', 'tankyu', 'tenk', 'cicac', 'amin', 'lihpt', 'yuvar', 'hentc', 'piraic', 'praic', 'lart', 'kulori', 'klori', 'kat', 'ocana', 'miyucik', 'yecuve']);
  function dropShouts(T, hw) {
    if (!hw.some(w => SHOUT.has(w))) return hw;
    const vs = T.vset || (T.vset = new Set(T.voc.map(e => e[0])));
    return hw.filter(w => !SHOUT.has(w) || vs.has(w));
  }
  function trackStep0(T, st, text, now) {
    const hw = dropShouts(T, seqWords(text).filter(w => w.length >= 2 && !FILLER.has(w))); if (!hw.filter(w => w.length >= 3).length) return null;
    now = now || Date.now();
    // A clip (4.5 s) often holds the end of one line and the start of the next (fast songs: two or three lines):
    // its newest words say where the singer is now, the whole clip gives the evidence.
    const big = hw.filter(w => w.length >= 3), tail = big.length >= 4 ? big.slice(-Math.ceil(big.length / 2)) : null;
    const cands = T.voc ? candidates(T, hw) : null, ZERO = { s: 0, n: 0 };
    const res = T.songs.map((sg, si) => {
      let top = 0, topN = 0; const sc = [];
      for (let p = 0; p < sg.ix.W.length; p++) {
        if (cands && !cands[si].has(p)) { sc.push(ZERO); continue; }
        const r = seqScore(sg.ix, hw, p);
        if (tail) { const q = seqScore(sg.ix, tail, p); if (q.s * .95 > r.s && q.n >= 2) { r.s = q.s * .95; r.n = Math.max(r.n, q.n); } }
        sc.push(r); if (r.s > top) { top = r.s; topN = r.n; }
      }
      return { sg, sc, top, topN };
    });
    const mine = res.find(r => r.sg.id === st.song);
    const others = res.filter(r => r !== mine).sort((a, b) => b.top - a.top);
    const o = others[0];
    st.mineTop = mine ? mine.top : 0; st.otherTop = o ? o.top : 0; st.words = big.length;
    // Evidence over the last few clips, per song: Whisper gets only half the words of a song it has no hint for,
    // so one clip rarely shows the new song clearly, but several running do (seen live: 35 s to switch).
    if (big.length >= 2) { st.ev = st.ev || {}; for (const r of res) st.ev[r.sg.id] = (st.ev[r.sg.id] || 0) * .65 + r.top * .35; }
    const ev = id => (st.ev && st.ev[id]) || 0;
    // ---- a trajectory over the last clips: one or two words a clip, but each fitting the next place in the same
    // song (lines 1, 3, 3, 4 ...). Random matches of common words do not line up like that. Seen live: Alleluya
    // sung from the top with the screen at its end (stuck 80 s), and with another song open (40 s to switch).
    const traj = trajectory(st, res, big, now);
    if (traj && traj.song !== st.song && (!mine || mine.top < .9)) {
      st.sw = null; st.pend = null; st.last = null; st.rate = 0; st.ev = {}; st.traj = [];
      return { song: traj.song, line: res.find(r => r.sg.id === traj.song).sg.ix.idx[traj.p], why: 'song' };
    }
    if (traj && traj.song === st.song && mine) {
      const ix0 = mine.sg.ix, c0 = st.cur < 0 ? -1 : ix0.pos.has(st.cur) ? ix0.pos.get(st.cur) : -1;
      if (c0 < 0 || Math.abs(traj.p - c0) >= 2) { st.pend = null; st.last = { p: traj.p, t: now }; st.traj = []; if (st.hmm) st.hmm.c = traj.p; return { song: st.song, line: ix0.idx[traj.p], why: traj.p < c0 ? 'back' : 'fwd' }; }
    }
    const lead = others.slice().sort((a, b) => ev(b.sg.id) - ev(a.sg.id))[0];
    if (lead && st.song && big.length >= 3 && lead.top >= .42 && ev(lead.sg.id) >= .36 && ev(lead.sg.id) >= ev(st.song) + .12 && (!mine || mine.top < .35) && others.every(x => x === lead || ev(x.sg.id) < ev(lead.sg.id) - .05)) {
      let p = 0; for (let q = 0; q < lead.sc.length; q++) if (lead.sc[q].s > lead.sc[p].s) p = q;
      st.sw = null; st.pend = null; st.last = null; st.rate = 0; st.ev = {};
      return { song: lead.sg.id, line: lead.sg.ix.idx[p], why: 'song' };
    }
    // ---- another service song (or the first one, when nothing is open) ----
    if (o && mine && o.top >= .6 && o.top - mine.top >= .15) {
      let p = 0; for (let q = 0; q < o.sc.length; q++) if (o.sc[q].s > o.sc[p].s) p = q;
      const nf = novelFit(mine.sg, o.sg, p, hw);
      // one clear clip (two words of its own), or two clips running each with a word the open song has nowhere
      // ("என்னாவி புதுப்பாய்" then "இந்த இயேசு": 8 s to switch before)
      const again = nf >= 1 && st.nov && st.nov.id === o.sg.id && now - st.nov.at < 9000;
      if ((nf >= 2 && o.top >= .8 && o.topN >= 2) || (again && o.top >= .7 && o.topN >= 1 && mine.top < .45 && nf + st.nov.n >= 3)) {
        st.sw = null; st.pend = null; st.last = null; st.rate = 0; st.ev = {}; st.traj = []; st.nov = null;
        return { song: o.sg.id, line: o.sg.ix.idx[p], why: 'song' };
      }
      st.nov = nf >= 1 ? { id: o.sg.id, at: now, n: nf } : null;
    } else if (st.nov && now - st.nov.at > 9000) st.nov = null;
    if (o && o.top >= .55 && o.topN >= 2 && o.top - (mine ? mine.top : 0) >= .25) {
      const same = st.sw && st.sw.id === o.sg.id && now - st.sw.at < 12000;
      st.sw = { id: o.sg.id, n: same ? st.sw.n + 1 : 1, at: now };
      const sure = o.top >= .8 && o.topN >= 3 && (!mine || mine.top < .3);
      if (st.sw.n >= 2 || sure || (!mine && o.top >= .7 && o.topN >= 2)) {
        let p = 0; for (let q = 0; q < o.sc.length; q++) if (o.sc[q].s > o.sc[p].s) p = q;
        st.sw = null; st.pend = null; st.last = null; st.rate = 0; st.ev = {};
        return { song: o.sg.id, line: o.sg.ix.idx[p], why: 'song' };
      }
    } else if (st.sw && (now - st.sw.at > 12000 || (mine && o && mine.top >= o.top))) st.sw = null;
    if (!mine) return null;
    if (st.sinceSong !== st.song) { st.sinceSong = st.song; st.since = now; st.last = null; }
    // ---- inside the open song ----
    const ix = mine.sg.ix;
    let c = st.cur < 0 ? -1 : ix.pos.has(st.cur) ? ix.pos.get(st.cur) : -1;
    if (st.cur >= 0 && c < 0) { for (let p = ix.idx.length - 1; p >= 0; p--) if (ix.idx[p] <= st.cur) { c = p; break; } }
    const sCur = c >= 0 ? mine.sc[c].s : 0;
    const hm = hmmStep(st, ix, mine.sc, c, now, big.some(w => ix.idf(w) >= 1));
    const byHmm = () => {
      // the filter is sure, the same two clips running, and the clip itself does not speak against it
      if (!hm || hm.p === c || !hm.again || hm.post < .5 || mine.sc[hm.p].s < .2) return null;
      const d = c < 0 ? hm.p + 1 : hm.p - c;
      if (Math.abs(d) > 6 && hm.post < .7) return null;
      if (d < -2 && mine.sc[hm.p].s < .5) return null;      // back over lines on a garbled clip ("திறக்கிறீயும்" -> verse 1)
      st.pend = null; st.last = { p: hm.p, t: now }; if (st.hmm) st.hmm.c = hm.p;
      return { song: st.song, line: ix.idx[hm.p], why: 'hmm' };
    };
    let best = -1, bv = -1;
    for (let p = 0; p < mine.sc.length; p++) { const v = mine.sc[p].s + prior(ix, c, p); if (v > bv + 1e-9) { bv = v; best = p; } }
    if (best < 0 || best === c) { st.pend = null; return byHmm(); }
    // equal lines (a chorus) - the copy nearest the current place, ahead first
    const r = mine.sc[best], s = r.s, n = r.n, d = c < 0 ? best + 1 : best - c;
    if (s - sCur < .1) return byHmm();
    const conf = st.pend && Math.abs(st.pend.p - best) <= (ix.K[st.pend.p] === ix.K[best] ? 99 : 1) && now - st.pend.at < 9000;
    const conf2 = conf && st.pend.s >= .6 && st.pend.n >= 2;          // the clip before was strong evidence too
    const stuck = c >= 0 && now - ((st.last && st.last.t) || st.since || now) > 10000;
    // Singing speed (lines a second, from the last moves): in a fast song a clip spans two or three lines, so the
    // expected step is taken on the next-line bar.
    const exp = st.rate && st.last ? Math.round(st.rate * (now - st.last.t) / 1000) : 1;
    let ok;
    if (c >= 0 && d > 1 && d <= Math.min(4, exp + 1) && s >= .45 && (d === 2 || n >= 2 || s >= .8)) ok = true;   // 3-4 lines on: not on one common word ("இந்த இயேசு" -> verse 4)
    else if (stuck && d > 1 && d <= 8 && s >= .5 && n >= 2) ok = true;            // the screen has not moved for 10 s
    else if (c < 0) ok = (best <= 1 && s >= .3) || (conf && s >= .55 && n >= 2 && (best <= 3 || (s >= .85 && n >= 3)));  // before the song: its start (the operator opened it)
    else if (d === 1) ok = s >= .4;
    else if (d === 2) ok = (s >= .45 && n >= 2) || (conf && s >= .38) || (s >= .85 && n >= 1);   // one clear word of the line after next ("சூரியனே")
    else if (d <= 4 && d > 0) ok = (s >= .55 && n >= 2) || (conf && s >= .42 && n >= 1);
    else if (d > 4) ok = (s >= .85 && n >= 3) || (conf2 && s >= .6 && n >= 2);       // far ahead: rare, needs a lot
    else if (d === -1) ok = (s >= .55 && n >= 2) || (s >= .7 && n >= 1) || (conf && s >= .42);
    else if (d >= -4) ok = (s >= .55 && n >= 2) || (conf && s >= .45 && n >= 2);
    else if (best === 0 || ix.first[best]) ok = (s >= .65 && n >= 2) || (conf && s >= .5 && n >= 2);   // back to the top / a verse
    else ok = (s >= .85 && n >= 3) || (conf2 && s >= .6 && n >= 2);
    if (!ok) { st.pend = { p: best, at: now, s, n }; return byHmm(); }
    st.pend = null;
    if (c >= 0 && d > 0 && st.last && st.last.p >= 0 && best > st.last.p) {
      const r = (best - st.last.p) / Math.max(1, (now - st.last.t) / 1000); st.rate = st.rate ? st.rate * .6 + Math.min(1.2, r) * .4 : Math.min(1.2, r);
    }
    st.last = { p: best, t: now }; if (st.hmm) st.hmm.c = best;
    return { song: st.song, line: ix.idx[best], why: d < 0 ? 'back' : 'fwd' };
  }

  // A song switch, with a guard against going straight back: right after the singer moved on, words of the song just
  // left still come through (Sarvam leans to the service words it was given), and one or two of them in order looked
  // like the old song again (seen live: Enthan -> Alleluya -> Enthan within 45 s).
  function trackStep(T, st, text, now) {
    now = now || Date.now();
    const from = st.song, r = trackStep0(T, st, text, now);
    if (!r || !from || r.song === from) return r;
    if (st.left && st.left.id === r.song && now - st.left.at < 30000) {
      const sg = T.songs.find(x => x.id === r.song), mg = T.songs.find(x => x.id === from);
      const p = sg && sg.ix.pos.has(r.line) ? sg.ix.pos.get(r.line) : -1;
      const hw = seqWords(text).filter(w => w.length >= 2 && !FILLER.has(w));
      if (p < 0 || novelFit(mg, sg, p, hw) < 2) return null;
    }
    st.left = { id: from, at: now };
    return r;
  }

  const Core = { seqScore, novelFit, wsimP, trackWin, seqWords, libIndex, libStep, trackIndex, trackStep, echoOf, seqIndex, seqStep, wordMatch, place, serviceIndex, serviceFind, skel, collapseRepeats, translit, key, keyWords, grams, bigrams, dice, heardGrams, scoreG, lineScore, songScore, prepare, decide, numbers, songIndex, songLookup };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.LFCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);
