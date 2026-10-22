/* Lyric Follow — Bible quiz: a question the preacher asks ("who is the son of Abraham?", "ஆபிரகாமின் மகன் யார்?",
 * "അബ്രാഹാമിന്റെ മകൻ ആര്?") is matched against a prepared list, and its answer can go on the screen in every
 * language the church shows. Matching is local and works on the English-letter form of the words, so a question
 * asked in one language matches the same question written in any of the three.
 *
 * Nothing is shown unless a question word was said (who/what/how many/யார்/എന്ത്...) and most of the question's
 * own words were heard, with a clear lead over the next closest question. */
(function (root) {
  'use strict';
  const Core = root.LFCore || (typeof require !== 'undefined' ? require('./core.js') : null);
  const LANGS = ['en', 'ta', 'ml'];
  const sw = s => Core.seqWords(s);
  // question words, in the English-letter form seqWords gives
  const CUES = new Set(sw('who whom whose what which where when how many much complete ' +
    'யார் யாரு யாருடைய யாரை யாரிடம் யாருக்கு யாரால் என்ன எது எதை எதைப் எதில் எதினால் எதால் எவை எவர் எந்த எந்தப் எந்தக் எந்தச் எந்தத் ' +
    'எங்கே எங்கு எப்போது எத்தனை எத்தனையாம் எப்படி எப்படித் ' +
    'ആര് ആരു ആരാണ് ആരുടെ ആരെ ആരോട് ആരോടു ആരാ എന്ത് എന്തു എന്താണ് എന്തിനാൽ എന്തിന് ഏത് ഏതു ഏതാണ് ഏവ ഏവർ എവിടെ എവിടെയാണ് ' +
    'എപ്പോൾ എത്ര എത്രാം എങ്ങനെ aaru aaranu yaaru yaar enna entha ethu evide ethra'));
  // words that say nothing about which question it is
  const STOP = new Set(sw('the a an of is was were are did does do to in on at by for from with and or his her their its ' +
    'this that he she it they be been has had have who what which where when how many much name bible ' +
    'யார் என்ன எது எந்த எங்கே எத்தனை அவன் அவள் அந்த இந்த ' +
    'ആര് എന്ത് ഏത് ഏതു എവിടെ എത്ര അവൻ അവൾ ആ ഈ'));

  let Q = [], IX = [], IDF = new Map();
  function load(list) {
    Q = list || []; IX = []; IDF = new Map(); VC.clear();
    const docs = [];
    Q.forEach((q, qi) => LANGS.forEach(l => {
      if (!q.q || !q.q[l]) return;
      const ws = [...new Set(sw(q.q[l]).filter(w => w.length >= 3 && !STOP.has(w) && !CUES.has(w)))];
      if (!ws.length) return;
      IX.push({ qi, l, ws }); docs.push(ws);
    }));
    const df = new Map(); docs.forEach(ws => ws.forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const N = docs.length || 1;
    df.forEach((n, w) => IDF.set(w, Math.log(1 + N / n)));
    return Q.length;
  }
  const VC = new Map();
  function inVocab(h) {
    if (IDF.has(h)) return true;
    if (!VC.has(h)) { let v = false; for (const w of IDF.keys()) if (hit(h, w) >= .78) { v = true; break; } VC.set(h, v); if (VC.size > 5000) VC.clear(); }
    return VC.get(h);
  }
  const idf = w => IDF.get(w) || Math.log(1 + IX.length);
  // a heard word counts for a question word when it is the same word, a near spelling, or the same word with a
  // Tamil/Malayalam ending added ("apirakamin" for "apirakam")
  function hit(h, w) {
    if (h === w) return 1;
    let cp = 0; while (cp < h.length && cp < w.length && h[cp] === w[cp]) cp++;
    if (cp >= 5 && cp >= .7 * Math.min(h.length, w.length)) return .9;      // ஆபிரகாமுடைய / ஆபிரகாமின்
    if (h.length >= 4 && w.length >= 4 && (h.startsWith(w) || w.startsWith(h)) && Math.min(h.length, w.length) >= .6 * Math.max(h.length, w.length)) return .95;
    return Core.wsimP(h, w);
  }
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
    const best = new Map();       // question index -> best score over its languages
    for (const e of IX) {
      let tot = 0, got = 0, n = 0;
      const used = new Set();
      for (const w of e.ws) {
        const wt = idf(w); tot += wt;
        let b = 0, bh = null; for (const h of H) { const s = hit(h, w); if (s > b) { b = s; bh = h; } if (b === 1) break; }
        if (b >= .78) { got += wt * b; n++; used.add(bh); }
      }
      // how much of the question was heard, and how much of what was heard is this question: "Abraham's son
      // through Hagar" is the Ishmael question, not the shorter Isaac one it also contains
      const rec = tot ? got / tot : 0, prec = HV.length ? HV.filter(h => used.has(h)).length / HV.length : 1;
      const score = rec * (.6 + .4 * prec);
      const need = Math.min(2, e.ws.length);
      if (n < need) continue;
      const cur = best.get(e.qi);
      if (!cur || score > cur.score) best.set(e.qi, { qi: e.qi, score, lang: e.l, n });
    }
    const list = [...best.values()].sort((a, b) => b.score - a.score);
    const top = list[0]; if (!top) return null;
    // a question is short; a long sentence that shares a question's words is usually a verse being read or a story
    // being told ("These are the three sons of Noah"), so it must fit much better
    const min = opts.min || (H.length <= 7 ? .62 : .82);
    if (top.score < min) return null;
    // another question with a different answer close behind: not sure which one was asked
    const rival = list.find(x => x !== top && Q[x.qi].a.en !== Q[top.qi].a.en);
    if (rival && top.score - rival.score < .1) return null;
    return { q: Q[top.qi], i: top.qi, score: top.score, lang: top.lang };
  }
  const Quiz = { load, match, count: () => Q.length, all: () => Q };
  if (typeof module !== 'undefined' && module.exports) module.exports = Quiz; else root.LFQuiz = Quiz;
})(typeof self !== 'undefined' ? self : this);
