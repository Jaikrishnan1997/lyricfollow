/* Lyric Follow — song tidier: one clean slide layout for every song (Tamil, Malayalam, English).
 *
 * Song sheets come in every shape: headings that are not sung ("பல்லவி", "சரணங்கள்", "ചരണങ്ങൾ", "Chorus", tala
 * names, "Music##"), verse numbers glued to the first line, chorus cues at the end of a verse ("- திறவுண்ட",
 * "(എന്തു...)"), "(2x)" marks, an English translation or an English-letter copy pasted under the song, every line
 * its own slide, or a whole 12-line verse on one slide. tidy() turns any of them into:
 *   - one slide per stanza, at most 4 lines (longer stanzas split evenly, at sentence ends where there are any)
 *   - the chorus after every verse, in the order the song is sung (the screen and the follower then move with it)
 *   - nothing on a slide that is not sung; verse numbers off the text (kept as slide labels: C, V1, V2 ...)
 *   - another-language copy taken out of the song (returned separately: translation / transliteration)
 * Same code in the app (your own songs, on import) and when the bundled packs are built (node tools/tidy-packs.js).
 *   tidy(text) -> { lyrics, parts, title, other: {kind: 'translation'|'transliteration', lyrics} | null, notes } */
(function (root) {
  'use strict';
  const INDIC = /[ऀ-෿]/, LATIN = /[A-Za-z]/;
  const indic = s => INDIC.test(s), latinOnly = s => LATIN.test(s) && !INDIC.test(s);

  // ---- headings and notes that are never sung ----
  const W = s => s.toLowerCase().replace(/[\s:.\-–—()[\]#*_]+/g, '');
  const CHORUS = new Set(['பல்லவி', 'பல்லவ', 'கோரஸ்', 'பல்லவி1', 'പല്ലവി', 'കോറസ്', 'chorus', 'refrain', 'pallavi', 'choir', 'koras', 'allchorus'].map(W));
  const ANU = new Set(['அனுபல்லவி', 'അനുപല്ലവി', 'anupallavi', 'prechorus', 'bridge'].map(W));
  const VERSE = new Set(['சரணம்', 'சரணங்கள்', 'சரணங்கள', 'கண்ணிகள்', 'ചരണം', 'ചരണങ്ങൾ', 'ചരണങൾ', 'ചരണങ്ങള്', 'കണ്ണികൾ', 'charanam', 'charanams', 'charanangal', 'verse', 'verses', 'stanza', 'stanzas'].map(W));
  const NOTE = /^(music|bgm|interlude|instrumental|intro|outro|ending|tag|music\d*|m|ragam?|raag|talam|thalam|tala|tune|scale|key|tempo|beat|rhythm|style|song|lyrics?|album|singer|sung by|composer|written by|ராகம்|தாளம்|இசை|பாடல் வரிகள்|பாடல்|രാഗം|താളം|ഈണം)\b[^\n]*$/i;
  const TALA = /(താളം|ചാപ്പ്|தாளம்)\.?\s*$|^(english|tamil|malayalam|ஆங்கில|தமிழ்)\s*(lyrics|version|translation|transliteration|வரிகள்|பாடல்)?\s*:?\s*$/i;
  // "sung to the tune of ...": എന്ന രീതി, என்ற மெட்டு, tune of
  const TUNE = /എന്ന\s*(?:രീതി|രാഗം|മട്ട്)|என்ற\s*(?:மெட்டு|ராகம்|இராகம்)|மெட்டு\s*:|\b(?:tune of|to the tune|sung to)\b/i;
  const JUNK = /^[\s_*#~=.\-–—•·|]+$/;
  const REPEAT = /\s*(?:[([]\s*(?:x\s*\d|\d\s*(?:x|times|தடவை|முறை|പ്രാവശ്യം)?)\s*[)\]]|(?:x\s*\d|\d\s*x)|\s[-–—]\s*\d)\s*$/i;
  // chapter-like heading of a verse: "1", "1.", "Verse 2", "சரணம் 2", "ചരണം 3"
  const VNUM = /^(?:(?:verse|stanza|சரணம்|ചരണം)\s*)?(\d{1,2})\s*[.):\-]?$/i;
  const LEADNUM = /^\s*(\d{1,2})\s*[.,)]\s*(?=\S)/;

  const clean = l => l.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0|\t/g, ' ').replace(/\s+/g, ' ').replace(/\s+([,;:.!?])/g, '$1').replace(/([.!?]),+/g, '$1').trim();
  const kind = line => {
    const w = W(line);
    if (!w) return 'junk';
    if (CHORUS.has(w) || /^(chorus|refrain|பல்லவி|പല്ലവി)\d*$/.test(w)) return 'chorus';
    if (ANU.has(w)) return 'anu';
    if (VERSE.has(w)) return 'verse';
    const m = line.match(VNUM); if (m) return 'num:' + m[1];
    if (JUNK.test(line)) return 'junk';
    if (line.length <= 48 && line.split(' ').length <= 5 && (NOTE.test(line) || TALA.test(line))) return 'note';
    if (TUNE.test(line) && line.split(' ').length <= 9) return 'note';
    return 'text';
  };
  // a cue: "(എന്തു...)", "- திறவுண்ட", "-- Umakkaaha", "...യത്നിക്ക", "உம் முகம்..." - a few words pointing at another stanza
  const CUE_END = /\s+(?:[-–—]{1,4}|~)\s*([^\s\-–—][^-–—]{0,30}?)\s*\.{0,4}\s*$/;
  const CUE_PAREN = /\s*\(([^()]{2,30}?)\s*\.{2,}\s*\)\s*$/;
  const CUE_LINE = /^(?:\(\s*([^()]{2,30}?)\s*\.{0,4}\s*\)|[-–—]{1,4}\s*(.{2,30}?)\s*\.{0,4}|\.{2,}\s*(.{2,30}?)|(.{2,30}?)\s*\.{2,})$/;
  const key = s => {
    const C = root.LFCore || (typeof require === 'function' ? require('./core.js') : null);
    return C ? C.key(s) : s.toLowerCase().replace(/[^\p{L}\p{M}]/gu, '');
  };

  function stanzas(text) {
    // raw lines into stanzas: blank lines, verse numbers and headings all start a new stanza
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(clean);
    const out = []; let cur = null, pending = null, num = null;
    const open = () => { if (cur && cur.lines.length) out.push(cur); cur = { lines: [], tag: pending, num, cues: [] }; pending = null; num = null; };
    const notes = [];
    lines.forEach((l, i) => {
      if (!l) { if (cur && cur.lines.length) { out.push(cur); cur = null; } return; }
      let k = kind(l);
      // a short line at the very top before a chorus heading is a tala / raga name (Malayalam Wikisource)
      if (k === 'text' && !out.length && (!cur || !cur.lines.length) && l.length <= 22 && l.split(' ').length <= 2) {
        const next = lines.slice(i + 1).find(Boolean); if (next && ['chorus', 'anu'].includes(kind(next))) k = 'note';
      }
      if (k === 'junk' || k === 'note') { if (k === 'note') notes.push(l); return; }
      if (k === 'chorus' || k === 'anu' || k === 'verse') { if (cur && cur.lines.length) { out.push(cur); cur = null; } pending = k === 'verse' ? null : k; if (k === 'verse') pending = 'verses'; return; }
      if (k.startsWith('num:')) { if (cur && cur.lines.length) { out.push(cur); cur = null; } num = +k.slice(4); return; }
      let n = null; const m = l.match(LEADNUM);
      if (m && +m[1] <= 20) { n = +m[1]; l = l.slice(m[0].length).trim(); }
      if (n != null) { if (cur && cur.lines.length) out.push(cur); cur = null; num = n; }
      if (!cur) open();
      if (cur.lines.length === 0 && pending === null && num !== null) { cur.num = num; num = null; }
      cur.lines.push(l);
    });
    if (cur && cur.lines.length) out.push(cur);
    // "verses" heading: what follows are verses, not a chorus
    let inVerses = false;
    for (const s of out) { if (s.tag === 'verses') { inVerses = true; s.tag = null; } else if (s.tag) inVerses = false; if (inVerses && !s.tag) s.inVerses = true; }
    return { out, notes };
  }

  // remove "(2x)" marks and chorus cues from a stanza; remember which stanza each cue points to
  function cues(st, all) {
    const starts = all.map(s => s.lines.length ? key(s.lines[0].replace(LEADNUM, '')) : '');
    const find = c => {
      const k = key(c).slice(0, 12); if (k.length < 3) return -1;
      for (let i = 0; i < all.length; i++) if (all[i] !== st && starts[i].startsWith(k.slice(0, Math.min(k.length, starts[i].length))) && starts[i].slice(0, 3) === k.slice(0, 3)) return i;
      return -1;
    };
    const lines = [];
    for (let l of st.lines) {
      // "(சுற்றி, சுற்றி வந்தாரே)" under "சுற்றி சுற்றி வந்தாரே": the echo, sung by the congregation - not a new line
      const prevK = lines.length ? key(lines[lines.length - 1]) : '';
      const pe = l.match(/^\(\s*(.+?)\s*\)$/); if (pe && prevK && key(pe[1]) === prevK) continue;
      const te = l.match(/^(.+?)[\s,-]*\(\s*(.+?)\s*,?\s*\)$/); if (te && key(te[1]) === key(te[2])) l = te[1].trim();
      l = l.replace(REPEAT, '').trim(); if (!l) continue;
      // "... (2) അനുഗ്രഹ": a repeat mark and then the cue
      const mr = l.match(/\s*[([]\s*\d\s*[)\]]\s*([^\s()]{1,30})\s*\.{0,4}$/);
      if (mr && find(mr[1]) >= 0) { st.cues.push(find(mr[1])); l = l.slice(0, mr.index).trim(); }
      l = l.replace(/\s*[([]\s*\d\s*[)\]]\s*/g, ' ').trim();
      // a whole line that only points at another stanza: in brackets, after a dash, or a few words ending in "..."
      // that are the start of another stanza (a sung line that happens to end in "..." stays)
      let m = l.match(CUE_LINE), target = -1;
      if (m && l.split(' ').length <= 3) {
        target = find(m[1] || m[2] || m[3] || m[4]);
        if (/^[(\-–—]/.test(l) || (target >= 0 && st.lines.length > 1)) { st.cues.push(target); continue; }
      }
      const md = l.match(/\.{3,}\s*([^\s.]{1,30})\s*$/);
      m = l.match(CUE_PAREN); if (m) { target = find(m[1]); st.cues.push(target); l = l.slice(0, m.index).trim(); }
      else if (md && find(md[1]) >= 0) { target = find(md[1]); st.cues.push(target); l = l.slice(0, md.index).trim(); }
      else { m = l.match(CUE_END); if (m && m[1].split(' ').length <= 2) { target = find(m[1]); if (target >= 0) { st.cues.push(target); l = l.slice(0, m.index).trim(); } } }
      l = l.replace(/[,;:\s]+$/, m && target >= 0 ? '' : '$&').replace(/\s*(?:\.{3,}|…+|[-–—]+)\s*$/, '').trim();
      if (l) lines.push(l);
    }
    st.lines = lines;
  }

  // ---- language of a stanza ----
  const EN = new Set('the and of to my i is in thy thee me be for with his he o all our we you your lord god love that this on are art from who will shall when let us at as so by not but heart soul'.split(' '));
  function lang(st) {
    const t = st.lines.join(' ');
    if (indic(t)) {
      const lat = st.lines.filter(latinOnly).length, ind = st.lines.filter(indic).length;
      return lat && Math.abs(lat - ind) <= 1 && lat >= 2 ? 'paired' : 'indic';
    }
    const w = t.toLowerCase().match(/[a-z']+/g) || [];
    return w.filter(x => EN.has(x)).length >= Math.max(2, w.length * .12) ? 'english' : 'latin';
  }

  // ---- split a stanza into slides of at most 4 lines (2 line-pairs when each line has its English-letter copy) ----
  function split(lines, paired) {
    if (paired) {   // keep each line with its copy
      const units = []; for (let i = 0; i < lines.length; i++) { if (i + 1 < lines.length && indic(lines[i]) !== indic(lines[i + 1])) { units.push([lines[i], lines[i + 1]]); i++; } else units.push([lines[i]]); }
      const out = []; for (let i = 0; i < units.length; i += 2) out.push([].concat(...units.slice(i, i + 2))); return out;
    }
    const n = lines.length; if (n <= 4) return [lines];
    const end = l => /[.!?।]["'’”)\]]*$/.test(l) ? 0 : /[;:]["'’”)\]]*$/.test(l) ? .35 : /,["'’”)\]]*$/.test(l) ? .8 : .6;
    const size = k => ({ 4: 0, 3: .35, 2: .8, 1: 3 })[k];
    // best split by sentence ends and even sizes (Tamil/Malayalam lines usually come in pairs: no odd sizes there)
    const odd = lines.some(indic) ? .5 : 0;
    const best = [0], from = [0];
    for (let i = 1; i <= n; i++) {
      best[i] = Infinity;
      for (let k = 1; k <= 4 && k <= i; k++) {
        const c = best[i - k] + size(k) + (k % 2 && odd ? odd : 0) + (i < n ? end(lines[i - 1]) : 0);
        if (c < best[i]) { best[i] = c; from[i] = i - k; }
      }
    }
    const cuts = []; for (let i = n; i > 0; i = from[i]) cuts.unshift([from[i], i]);
    return cuts.map(([a, b]) => lines.slice(a, b));
  }

  // songs that came in with every line on its own slide: find the stanza size from the sentence ends
  function regroup(sts) {
    const single = sts.filter(s => s.lines.length === 1).length;
    if (sts.length < 8 || single < sts.length * .7) return sts;
    const lines = [].concat(...sts.map(s => s.lines)), n = lines.length;
    const fin = l => /[.!?]["'’”)\]]*$/.test(l);
    let best = null;
    for (const s of [4, 6, 8, 5, 3]) {
      if (n % s) continue;
      const ends = [], mids = []; lines.forEach((l, i) => ((i + 1) % s ? mids : ends).push(fin(l)));
      const sc = ends.filter(Boolean).length / ends.length - .5 * mids.filter(Boolean).length / Math.max(1, mids.length) + (s === 4 ? .05 : 0);
      if (!best || sc > best.sc) best = { s, sc, ok: ends.filter(Boolean).length / ends.length };
    }
    const out = [];
    if (best && best.ok >= .7) for (let i = 0; i < n; i += best.s) out.push({ lines: lines.slice(i, i + best.s), cues: [] });
    else { let cur = []; lines.forEach((l, i) => { cur.push(l); if ((fin(l) && cur.length >= 4) || cur.length >= 8 || i === n - 1) { out.push({ lines: cur, cues: [] }); cur = []; } }); }
    return out;
  }

  function tidy(text, opts) {
    opts = opts || {};
    let { out: sts, notes } = stanzas(text);
    sts = sts.filter(s => s.lines.length);
    if (!sts.length) return { lyrics: '', parts: [], title: '', other: null, notes };
    sts = regroup(sts);
    // a heading that repeats the song's opening words ("ஆகாரின் தேவன்" over "ஆகாரின் தேவன் என்னை பெயர்...")
    const f0 = sts[0].lines;
    if (f0.length >= 2 && f0[0].split(' ').length <= 4 && key(f0[1]).startsWith(key(f0[0])) && key(f0[1]).length > key(f0[0]).length) f0.shift();
    // an index entry left at the end ("Charge to Keep I Have, A")
    const lastSt = sts[sts.length - 1];
    if (sts.length > 2 && lastSt.lines.length === 1 && /,\s*(A|An|The)$/.test(lastSt.lines[0])) sts.pop();
    sts.forEach(s => cues(s, sts)); sts = sts.filter(s => s.lines.length);
    // ---- another language pasted under the song ----
    sts.forEach(s => { s.lang = lang(s); });
    const mainIndic = sts.some(s => s.lang === 'indic' || s.lang === 'paired');
    let other = null;
    if (mainIndic) {
      const extra = sts.filter(s => s.lang === 'english' || s.lang === 'latin');
      if (extra.length) {
        const k = extra.filter(s => s.lang === 'english').length >= extra.length / 2 ? 'translation' : 'transliteration';
        other = { kind: k, lyrics: extra.map(s => s.lines.join('\n')).join('\n\n') };
        sts = sts.filter(s => !extra.includes(s));
      }
    }
    const K = st => key(st.lines.join(' '));
    // ---- written out in full (the chorus copied after each verse): keep that order, only clean and label it ----
    const freq = new Map(); sts.forEach(st => freq.set(K(st), (freq.get(K(st)) || 0) + 1));
    const rep = [...freq.entries()].filter(e => e[1] >= 2).sort((a, b) => b[1] - a[1]);
    if (rep.length && !sts.some(st => st.cues.some(c => c >= 0))) {
      const ck = rep[0][0], cst = sts.find(st => K(st) === ck), cl = new Set(cst.lines.map(key)), vk = new Map(); let n = 0;
      const numberedV = sts.some(st => st.num != null);
      const seqA = sts.map(st => {
        const k = K(st);
        if (k === ck || st.lines.every(l => cl.has(key(l)))) return ['C', st];       // the chorus, or the chorus sung twice
        if (!vk.has(k)) vk.set(k, st.tag === 'anu' || (numberedV && st.num == null && !st.inVerses) ? 'A' : 'V' + (st.num || ++n));
        return [vk.get(k), st];
      });
      return finish(seqA, other, notes);
    }
    // ---- which stanza is the chorus ----
    let ci = sts.findIndex(s => s.tag === 'chorus');
    const counts = new Map(); sts.forEach(s => s.cues.forEach(c => c >= 0 && counts.set(c, (counts.get(c) || 0) + 1)));
    if (ci < 0 && counts.size) { const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]; ci = top[0]; }
    const numbered = sts.filter(s => s.num != null).length;
    if (ci < 0 && numbered >= 2) {
      // hymn with a refrain: the one unnumbered stanza among numbered verses (before verse 1 = pallavi, after = refrain)
      const un = sts.filter(s => s.num == null && !s.inVerses && s.tag !== 'anu');
      if (un.length === 1) ci = sts.indexOf(un[0]);
    }
    if (ci < 0) {
      // the same stanza written out again later: that is the chorus (written once from here on)
      for (let i = 0; i < sts.length && ci < 0; i++) for (let j = i + 1; j < sts.length; j++) if (key(sts[i].lines.join(' ')) === key(sts[j].lines.join(' '))) { ci = i; break; }
    }
    const chorus = ci >= 0 ? sts[ci] : null;
    const anu = sts.find(s => s.tag === 'anu') || null;
    const same = (a, b) => a && b && key(a.lines.join(' ')) === key(b.lines.join(' '));
    // ---- the order it is sung ----
    // each verse once (a sheet that pasted the song twice), never a copy of the chorus
    const seenV = new Set(), verses = sts.filter(s => { if (s === chorus || s === anu || same(s, chorus)) return false; const k = K(s); if (seenV.has(k)) return false; seenV.add(k); return true; });
    const cueAny = sts.some(s => s.cues.length);
    const repeat = !!chorus && (cueAny || chorus.tag === 'chorus' || numbered >= 2 || sts.filter(s => same(s, chorus)).length > 1);
    const seq = [];
    const chorusFirst = chorus && sts.indexOf(chorus) === 0;
    if (chorus && (chorusFirst || !verses.length)) seq.push(['C', chorus]);
    else if (anu && !chorus) seq.push(['A', anu]);
    let vn = 0;
    const cI = chorus ? sts.indexOf(chorus) : -2;
    verses.forEach(v => {
      vn = v.num || vn + 1; seq.push(['V' + vn, v]);
      // with cues in the sheet: the chorus where a cue says so; without: after every verse
      const after = !chorus ? false : (cI > 0 && sts[cI - 1] === v) || (cueAny ? v.cues.includes(cI) || v.cues.includes(-1) : repeat);
      if (after) seq.push(['C', chorus]);
      for (const c of v.cues) if (c >= 0 && c !== cI && sts[c] && sts[c] !== v) seq.push([sts[c] === anu ? 'A' : 'V', sts[c]]);
    });
    if (chorus && !seq.some(x => x[1] === chorus)) seq.push(['C', chorus]);
    // the anupallavi is sung once, after the first pallavi
    if (anu && chorus) { const i = seq.findIndex(x => x[1] === chorus); seq.splice(i + 1, 0, ['A', anu]); }
    return finish(seq, other, notes);
  }
  function finish(seq, other, notes) {
    // ---- slides ----
    let slides = [], parts = [];
    for (const [tag, st] of seq) for (const sl of split(st.lines, st.lang === 'paired')) { slides.push(sl); parts.push(tag); }
    // a stanza of one line ("ஆகாரின் தேவன் என் பெயர் சொல்லி அழைத்தார்") joins the slide before it when that fits
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].length !== 1 || slides.length === 1) continue;
      const j = i > 0 && slides[i - 1].length <= 3 ? i - 1 : i + 1 < slides.length && slides[i + 1].length <= 3 ? i + 1 : -1;
      if (j < 0) continue;
      slides[j] = j < i ? slides[j].concat(slides[i]) : slides[i].concat(slides[j]);
      slides.splice(i, 1); parts.splice(i, 1); i--;
    }
    const first = (seq[0] && seq[0][1].lines[0]) || '';
    return { lyrics: slides.map(s => s.join('\n')).join('\n\n'), parts, title: first.replace(/[,;:.!?\s]+$/, ''), other, notes };
  }

  /** A title as people search for it: no "song lyrics", no trailing punctuation, no doubled spaces. */
  function tidyTitle(t) {
    return clean(String(t || '').replace(/\|.*$/, '').replace(/\s*[-–]\s*(?:song\s*)?lyrics?\b.*$/i, '').replace(/பாடல் வரிகள்|ഗാനം\s*വരികൾ/g, '')).replace(/[,;:.\s]+$/, '');
  }

  /** Short fingerprint of a song's text: tells a song the user edited from one a pack update may replace. */
  function hash(t) { let h = 5381; t = String(t || '').replace(/\s+/g, ' ').trim(); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  const API = { tidy, tidyTitle, split, stanzas, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.LFTidy = API;
})(typeof window !== 'undefined' ? window : globalThis);
