/* Lyric Follow — Bible quiz: a question the preacher asks ("who is the son of Abraham?", "ஆபிரகாமின் மகன் யார்?",
 * "അബ്രാഹാമിന്റെ മകൻ ആര്?") is matched against a prepared list, and its answer can go on the screen in every
 * language the church shows. Matching is local and works on the English-letter form of the words, so a question
 * asked in one language matches the same question written in any of the three.
 *
 * Two lists: the core list (vendor/quiz.json, the questions pastors ask most) and the full list (vendor/quiz/*.json,
 * verse by verse through every book). A full-list question has to fit more closely, since with tens of thousands of
 * questions some will share words with almost anything said.
 *
 * Nothing is shown unless a question word was said (who/what/how many/யார்/എന്ത്...) and most of the question's
 * own words were heard, with a clear lead over the next closest question that has a different answer. */
(function (root) {
  'use strict';
  const Core = root.LFCore || (typeof require !== 'undefined' ? require('./core.js') : null);
  const LANGS = ['en', 'ta', 'ml'];
  const sw = s => Core.seqWords(s);
  // question words, in the English-letter form seqWords gives
  const CUES = new Set(sw('who whom whose what which where when why how many much complete ' +
    'யார் யாரு யாருடைய யாரை யாரைச் யாரிடம் யாருக்கு யாருக்குச் யாரால் யாரோடு என்ன என்னென்ன எது எதை எதைப் எதில் எதினால் எதால் எதற்கு எதாக எவை எவர் எந்த எந்தப் எந்தக் எந்தச் எந்தத் ' +
    'எங்கே எங்கு எங்கிருந்து எப்போது எப்பொழுது எத்தனை எத்தனையாம் எப்படி எப்படித் ஏன் ' +
    'ആര് ആരു ആർ ആരാണ് ആരുടെ ആരെ ആരോട് ആരോടു ആർക്കു ആർക്ക് ആരാ എന്ത് എന്തു എന്താണ് എന്തിനാൽ എന്തിന് എന്തിന്നു എന്തെല്ലാം ഏത് ഏതു ഏതാണ് ഏവ ഏവർ എവിടെ എവിടെയാണ് എവിടെനിന്നു ' +
    'എപ്പോൾ എത്ര എത്രാം എങ്ങനെ എന്തുകൊണ്ട് aaru aaranu yaaru yaar enna entha ethu evide ethra'));
  // what kind of answer the question word asks for: "who denied Jesus three times" is not "how many times"
  const KIND = {};
  const kinds = { who: 'who whom whose யார் யாரு யாருடைய யாரை யாரைச் யாரிடம் யாருக்கு யாருக்குச் யாரால் யாரோடு எவர் ആര് ആരു ആർ ആരാണ് ആരുടെ ആരെ ആരോട് ആരോടു ആർക്കു ആർക്ക് ആരാ ഏവർ aaru aaranu yaaru yaar',
    many: 'many much எத்தனை எத்தனையாம் എത്ര എത്രാം ethra', where: 'where எங்கே எங்கு எங்கிருந்து എവിടെ എവിടെയാണ് എവിടെനിന്നു evide',
    when: 'when எப்போது எப்பொழுது എപ്പോൾ', why: 'why ஏன் എന്തുകൊണ്ട്' };
  for (const [k, ws] of Object.entries(kinds)) for (const w of sw(ws)) KIND[w] = k;
  const kindOf = ws => { for (const w of ws) if (KIND[w]) return KIND[w]; return null; };
  // words that say nothing about which question it is
  const STOP = new Set(sw('the a an of is was were are did does do to in on at by for from with and or his her their its ' +
    'this that he she it they be been has had have him them unto upon into who what which where when why how many much name bible ' +
    'யார் என்ன எது எந்த எங்கே எத்தனை அவன் அவள் அவர் அந்த இந்த ' +
    'ആര് എന്ത് ഏത് ഏതു എവിടെ എത്ര അവൻ അവൾ അവർ ആ ഈ'));

  let Q = [], IX = [], IDF = new Map(), DFC = new Map(), NC = 1, BUCK = new Map(), N = 1;
  const bkey = w => w.slice(0, 3);
  function index(from) {
    for (let qi = from; qi < Q.length; qi++) {
      const q = Q[qi];
      // the question in each language, and other ways of asking it (q.alt)
      for (const [l, text] of LANGS.map(l => [l, q.q && q.q[l]]).concat((q.alt || []).map(t => ['en', t]))) {
        if (!text) continue;
        const all = sw(text);
        const ws = [...new Set(all.filter(w => w.length >= 3 && !STOP.has(w) && !CUES.has(w)))];
        if (!ws.length) continue;
        const e = { qi, l, ws, kind: kindOf(all) }, ei = IX.length; IX.push(e);
        for (const w of ws) { IDF.set(w, (IDF.get(w) || 0) + 1); if (!q.full) DFC.set(w, (DFC.get(w) || 0) + 1); const k = bkey(w); let b = BUCK.get(k); if (!b) BUCK.set(k, b = []); b.push(ei); }
      }
    }
    N = IX.length || 1; NC = IX.filter(e => !Q[e.qi].full).length || 1; VC.clear();
  }
  /** the core list (replaces everything loaded) */
  function load(list) { Q = []; IX = []; IDF = new Map(); DFC = new Map(); BUCK = new Map(); return add(list, false); }
  /** more questions, e.g. one book of the full list */
  function add(list, full) {
    const from = Q.length;
    for (const q of list || []) Q.push(full ? Object.assign({ full: true }, q) : q);
    index(from); return Q.length;
  }
  // the core list keeps its own word weights, so adding the verse-by-verse list does not change how it matches
  const idf = (w, full) => full ? Math.log(1 + N / (IDF.get(w) || 1)) : Math.log(1 + NC / (DFC.get(w) || 1));
  const VC = new Map();
  function near(h) {           // index entries that have a word sharing h's first letters
    const out = new Set(); const k = bkey(h);
    for (const ei of BUCK.get(k) || []) out.add(ei);
    return out;
  }
  function inVocab(h) {
    if (IDF.has(h)) return true;
    if (!VC.has(h)) {
      let v = false; const k = bkey(h);
      for (const ei of BUCK.get(k) || []) { if (IX[ei].ws.some(w => bkey(w) === k && hit(h, w) >= .78)) { v = true; break; } }
      VC.set(h, v); if (VC.size > 5000) VC.clear();
    }
    return VC.get(h);
  }
  // a heard word counts for a question word when it is the same word, a near spelling, or the same word with a
  // Tamil/Malayalam ending added ("apirakamin" for "apirakam")
  function hit(h, w) {
    if (h === w) return 1;
    let cp = 0; while (cp < h.length && cp < w.length && h[cp] === w[cp]) cp++;
    if (cp >= 5 && cp >= .7 * Math.min(h.length, w.length)) return .9;      // ஆபிரகாமுடைய / ஆபிரகாமின்
    if (h.length >= 4 && w.length >= 4 && (h.startsWith(w) || w.startsWith(h)) && Math.min(h.length, w.length) >= .6 * Math.max(h.length, w.length)) return .95;
    if (cp < 1) return 0;
    return Core.wsimP(h, w);
  }
  const normA = s => String(s || '').toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const sameAnswer = (a, b) => { const x = normA(a.a.en), y = normA(b.a.en); return x === y || (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x))); };
  /** text: what was heard lately (a few sentences). Returns {q, score, lang} or null. */
  function match(text, opts) {
    opts = opts || {};
    if (!IX.length) return null;
    const heard = sw(text || '');
    if (!heard.some(h => CUES.has(h))) return null;
    const H = [...new Set(heard.filter(h => h.length >= 3 && !STOP.has(h) && !CUES.has(h)))];
    if (H.length < 1) return null;
    // heard words that belong to some question (other sermon words do not count against any question)
    const HV = H.filter(inVocab);
    const kindsHeard = new Set(heard.map(h => KIND[h]).filter(Boolean));
    // only questions that share a word (by its first letters) with what was heard
    const cand = new Set(); for (const h of H) for (const ei of near(h)) cand.add(ei);
    const best = new Map();       // question index -> best score over its languages
    for (const ei of cand) {
      const e = IX[ei];
      if (e.kind && kindsHeard.size && !kindsHeard.has(e.kind)) continue;     // asked "who", this one is "how many"
      let tot = 0, got = 0, n = 0;
      const used = new Set();
      let rare = 0;
      for (const w of e.ws) {
        const wt = idf(w, Q[e.qi].full); tot += wt;
        let b = 0, bh = null; for (const h of H) { const s = hit(h, w); if (s > b) { b = s; bh = h; } if (b === 1) break; }
        if (b >= .78) { got += wt * b; n++; used.add(bh); if ((IDF.get(w) || 0) < N * .002) rare++; }
      }
      // how much of the question was heard, and how much of what was heard is this question: "Abraham's son
      // through Hagar" is the Ishmael question, not the shorter Isaac one it also contains
      const rec = tot ? got / tot : 0, prec = HV.length ? HV.filter(h => used.has(h)).length / HV.length : 1;
      const score = rec * (.6 + .4 * prec);
      const full = Q[e.qi].full;
      const need = Math.min(full ? 3 : 2, e.ws.length);
      if (n < need) continue;
      // the full list: words like God, Lord, people are in thousands of questions - at least two of the
      // question's less common words must be heard, and most of what was heard must belong to it
      if (full && (rare < Math.min(2, e.ws.length) || prec < .7)) continue;
      const cur = best.get(e.qi);
      if (!cur || score > cur.score) best.set(e.qi, { qi: e.qi, score, lang: e.l, n, full });
    }
    const list = [...best.values()].sort((a, b) => b.score - a.score || (a.full ? 1 : 0) - (b.full ? 1 : 0));
    if (opts.debug) return list.slice(0, 5).map(x => [x.score.toFixed(2), x.full ? "F" : "C", Q[x.qi].a.en, Q[x.qi].q[x.lang]]);
    // a question is short; a long sentence that shares a question's words is usually a verse being read or a story
    // being told ("These are the three sons of Noah"), so it must fit much better - and more so for the full list
    const minOf = x => opts.min || (x.full ? (H.length <= 7 ? .8 : .9) : (H.length <= 7 ? .62 : .82));
    // the core list (the questions pastors ask most) comes first: a verse-by-verse question with the same
    // words does not make a well-known question unsure, unless it fits clearly better
    const core = list.filter(x => !x.full), topCore = core.find(x => x.score >= minOf(x));
    const topFull = list.find(x => x.full && x.score >= minOf(x));
    const useCore = topCore && !(topFull && topFull.score > topCore.score + .15 && !sameAnswer(Q[topFull.qi], Q[topCore.qi]));
    const top = useCore ? topCore : list.find(x => x.score >= minOf(x)); if (!top) return null;
    // another question with a different answer close behind: not sure which one was asked
    const rival = (useCore ? core : list).find(x => x !== top && !sameAnswer(Q[x.qi], Q[top.qi]));
    if (rival && top.score - rival.score < .1) return null;
    return { q: Q[top.qi], i: top.qi, score: top.score, lang: top.lang };
  }
  const Quiz = { load, add, match, count: () => Q.length, all: () => Q };
  if (typeof module !== 'undefined' && module.exports) module.exports = Quiz; else root.LFQuiz = Quiz;
})(typeof self !== 'undefined' ? self : this);
