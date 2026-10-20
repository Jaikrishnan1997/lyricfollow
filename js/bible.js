/* Lyric Follow — offline Bible: versions, reference parser (EN/ML/TA, typed or spoken), word index, search. */
(function (root) {
  'use strict';
  const Core = root.LFCore || (typeof require !== 'undefined' ? require('./core.js') : null);

  const VERSIONS = [
    { id: 'mal1910', short: 'MAL', lang: 'ml', name: 'സത്യവേദപുസ്തകം (1910)' },
    { id: 'tamov', short: 'TAM', lang: 'ta', name: 'தமிழ் பழைய மொழிபெயர்ப்பு' },
    { id: 'kjv', short: 'KJV', lang: 'en', name: 'King James Version' },
    { id: 'web', short: 'WEB', lang: 'en', name: 'World English Bible' },
    { id: 'bsb', short: 'BSB', lang: 'en', name: 'Berean Standard Bible' },
    { id: 'asv', short: 'ASV', lang: 'en', name: 'American Standard Version' }
  ];

  // [English, abbreviations, Malayalam, Tamil, chapters, extra aliases]
  const B = [
    ['Genesis','gen ge gn','ഉല്പത്തി','ஆதியாகமம்',50,'ഉൽപത്തി'],['Exodus','exo ex exod','പുറപ്പാട്','யாத்திராகமம்',40],
    ['Leviticus','lev lv','ലേവ്യപുസ്തകം','லேவியராகமம்',27],['Numbers','num nm nb','സംഖ്യാപുസ്തകം','எண்ணாகமம்',36],
    ['Deuteronomy','deut dt deu','ആവർത്തനം','உபாகமம்',34],['Joshua','josh jos','യോശുവ','யோசுவா',24],
    ['Judges','judg jdg jg','ന്യായാധിപന്മാർ','நியாயாதிபதிகள்',21],['Ruth','rut ru','രൂത്ത്','ரூத்',4],
    ['1 Samuel','1sam 1sa 1sm','1 ശമൂവേൽ','1 சாமுவேல்',31],['2 Samuel','2sam 2sa 2sm','2 ശമൂവേൽ','2 சாமுவேல்',24],
    ['1 Kings','1kgs 1ki 1kg','1 രാജാക്കന്മാർ','1 இராஜாக்கள்',22,'1 ராஜாக்கள்'],['2 Kings','2kgs 2ki 2kg','2 രാജാക്കന്മാർ','2 இராஜாக்கள்',25,'2 ராஜாக்கள்'],
    ['1 Chronicles','1chr 1ch','1 ദിനവൃത്താന്തം','1 நாளாகமம்',29],['2 Chronicles','2chr 2ch','2 ദിനവൃത്താന്തം','2 நாளாகமம்',36],
    ['Ezra','ezr','എസ്രാ','எஸ்றா',10],['Nehemiah','neh ne','നെഹെമ്യാവു','நெகேமியா',13],
    ['Esther','est esth','എസ്ഥേർ','எஸ்தர்',10],['Job','jb','ഇയ്യോബ്','யோபு',42],
    ['Psalms','ps psa psalm pss','സങ്കീർത്തനങ്ങൾ','சங்கீதம்',150,'സങ്കീർത്തനം'],['Proverbs','prov pro prv pr','സദൃശ്യവാക്യങ്ങൾ','நீதிமொழிகள்',31,'സദൃശവാക്യങ്ങൾ'],
    ['Ecclesiastes','eccl ecc qoh','സഭാപ്രസംഗി','பிரசங்கி',12],['Song of Solomon','song sos sng canticles','ഉത്തമഗീതം','உன்னதப்பாட்டு',8,'song of songs'],
    ['Isaiah','isa is','യെശയ്യാ','ஏசாயா',66,'യെശയ്യാവ്'],['Jeremiah','jer je jr','യിരെമ്യാവു','எரேமியா',52,'യിരമ്യാവു'],
    ['Lamentations','lam la','വിലാപങ്ങൾ','புலம்பல்',5],['Ezekiel','ezek eze ezk','യെഹെസ്കേൽ','எசேக்கியேல்',48,'യെഹേസ്കേൽ'],
    ['Daniel','dan dn da','ദാനീയേൽ','தானியேல்',12],['Hosea','hos ho','ഹോശേയ','ஓசியா',14],['Joel','jl','യോവേൽ','யோவேல்',3],
    ['Amos','am','ആമോസ്','ஆமோஸ்',9],['Obadiah','obad ob','ഓബദ്യാവു','ஒபதியா',1],['Jonah','jnh jonah','യോനാ','யோனா',4],
    ['Micah','mic mc','മീഖാ','மீகா',7],['Nahum','nah na','നഹൂം','நாகூம்',3],['Habakkuk','hab hb','ഹബക്കൂക്ക്','ஆபகூக்',3],
    ['Zephaniah','zeph zep zp','സെഫന്യാവു','செப்பனியா',3],['Haggai','hag hg','ഹഗ്ഗായി','ஆகாய்',2],
    ['Zechariah','zech zec zc','സെഖര്യാവു','சகரியா',14],['Malachi','mal ml','മലാഖി','மல்கியா',4],
    ['Matthew','matt mt mat','മത്തായി','மத்தேயு',28],['Mark','mrk mk mr','മർക്കൊസ്','மாற்கு',16,'മർക്കോസ്'],
    ['Luke','luk lk','ലൂക്കോസ്','லூக்கா',24],['John','jn jhn joh','യോഹന്നാൻ','யோவான்',21],
    ['Acts','act ac','പ്രവൃത്തികൾ','அப்போஸ்தலர்',28,'അപ്പൊസ്തലപ്രവൃത്തികൾ|அப்போஸ்தலருடைய நடபடிகள்'],['Romans','rom ro rm','റോമർ','ரோமர்',16],
    ['1 Corinthians','1cor 1co','1 കൊരിന്ത്യർ','1 கொரிந்தியர்',16],['2 Corinthians','2cor 2co','2 കൊരിന്ത്യർ','2 கொரிந்தியர்',13],
    ['Galatians','gal ga','ഗലാത്യർ','கலாத்தியர்',6],['Ephesians','eph ephes','എഫെസ്യർ','எபேசியர்',6],
    ['Philippians','phil php pp','ഫിലിപ്പിയർ','பிலிப்பியர்',4],['Colossians','col','കൊലൊസ്സ്യർ','கொலோசெயர்',4],
    ['1 Thessalonians','1thess 1th','1 തെസ്സലൊനീക്യർ','1 தெசலோனிக்கேயர்',5],['2 Thessalonians','2thess 2th','2 തെസ്സലൊനീക്യർ','2 தெசலோனிக்கேயர்',3],
    ['1 Timothy','1tim 1ti','1 തിമൊഥെയൊസ്','1 தீமோத்தேயு',6],['2 Timothy','2tim 2ti','2 തിമൊഥെയൊസ്','2 தீமோத்தேயு',4],
    ['Titus','tit ti','തീത്തൊസ്','தீத்து',3],['Philemon','phlm phm','ഫിലേമോൻ','பிலேமோன்',1],
    ['Hebrews','heb','എബ്രായർ','எபிரெயர்',13],['James','jas jm','യാക്കോബ്','யாக்கோபு',5],
    ['1 Peter','1pet 1pe 1pt','1 പത്രൊസ്','1 பேதுரு',5],['2 Peter','2pet 2pe 2pt','2 പത്രൊസ്','2 பேதுரு',3],
    ['1 John','1jn 1jhn 1jo','1 യോഹന്നാൻ','1 யோவான்',5],['2 John','2jn 2jhn 2jo','2 യോഹന്നാൻ','2 யோவான்',1],
    ['3 John','3jn 3jhn 3jo','3 യോഹന്നാൻ','3 யோவான்',1],['Jude','jud jd','യൂദാ','யூதா',1],
    ['Revelation','rev re rv revelations','വെളിപ്പാട്','வெளிப்படுத்தின விசேஷம்',22,'വെളിപാട്|வெளி']
  ];
  const BOOKS = B.map((r, i) => ({ i, en: r[0], ml: r[2], ta: r[3], ch: r[4] }));

  const kn = s => Core.keyWords(s).replace(/\s+/g, '');
  const ALIAS = new Map();   // phonetic key -> book index
  const RAW = [];            // [lower-case written name, book index] for typing suggestions
  function addAlias(s, i, spoken) {
    const k = kn(s); if (k && !ALIAS.has(k)) ALIAS.set(k, i);
    if (!spoken) RAW.push([s.toLowerCase().replace(/\s+/g, ''), i, k]);
  }
  B.forEach((r, i) => {
    addAlias(r[0], i); addAlias(r[2], i); addAlias(r[3], i);
    r[1].split(' ').forEach(a => addAlias(a, i));
    if (r[5]) r[5].split('|').forEach(a => addAlias(a, i));
  });
  // English book names as Tamil/Malayalam speech recognisers write them ("ஜான்", "ജോൺ").
  const SPOKEN = {
    0:'ஜெனிசிஸ் ജെനസിസ്', 1:'எக்ஸோடஸ் എക്സോഡസ്', 18:'சாம்ஸ் சங்கீதங்கள் സാംസ് സങ്കീർത്തനങ്ങളിൽ', 19:'ப்ராவர்ப்ஸ் പ്രോവെർബ്സ്', 22:'ஏசாயா ஐசையா ഐസയ്യ ഏശയ്യാ',
    39:'மேத்யூ மத்தேயு மாத்யூ മാത്യു മത്തായിയുടെ', 40:'மார்க் மாற்கு മാർക്ക് മർക്കോസിന്റെ', 41:'லூக் லூக்கா ലൂക്ക് ലൂക്കോസിന്റെ',
    42:'ஜான் ஜோன் யோவான் ജോൺ ജോൺസ് യോഹന്നാന്റെ', 43:'ஆக்ட்ஸ் ആക്ട്സ്', 44:'ரோமன்ஸ் റോമൻസ്', 45:'கொரிந்தியன்ஸ்', 57:'ஹீப்ரூஸ் ഹീബ്രൂസ്',
    58:'ஜேம்ஸ் ജെയിംസ്', 65:'ரெவலேஷன் റെവലേഷൻ വെളിപാട്'
  };
  const SPOKENKEYS = new Set();
  for (const [i, names] of Object.entries(SPOKEN)) names.split(' ').forEach(a => { addAlias(a, +i, true); SPOKENKEYS.add(kn(a)); });
  const ALIAS_LIST = [...ALIAS.entries()];
  // Full book names (any language). In speech, short abbreviations like "is", "am", "ps" are too easy to hear by accident.
  const FULLNAMES = new Set(); B.forEach(r => [r[0], r[2], r[3]].forEach(n => FULLNAMES.add(kn(n))));

  // Words that mark a chapter or verse number in speech (English, Malayalam, Tamil, Hindi, and their English-letter forms).
  const CUE = new Set(['chapter','chapters','verse','verses','versus','ch','v','vs','അദ്ധ്യായം','അധ്യായം','വാക്യം','വചനം','അദ്ധ്യായത്തിൽ','വാക്യത്തിൽ','அதிகாரம்','வசனம்','வசனங்கள்','अध्याय','पद','आयत',
    'adhyayam','athyayam','adyayam','adhyaayam','vakyam','vaakyam','vachanam','vakyem','athikaram','adhikaram','vasanam','vasanam','adhyay'].map(w => Core.keyWords(w).replace(/\s+/g, '')).filter(Boolean));
  function hasCue(toks) { return toks.some(t => { const k = t.replace(/[^a-z]/g, ''); if (CUE.has(k)) return true; for (const c of CUE) if (c.length >= 5 && k.length >= 5 && k.startsWith(c.slice(0, 5))) return true; return false; }); }
  const ORD = { first: '1', '1st': '1', second: '2', '2nd': '2', third: '3', '3rd': '3', ii: '2', iii: '3', onnam: '1', rantam: '2', munam: '3' };
  // Spoken text is normalised by keyWords before lookup ("second" -> "secont"), so index the normalised forms too.
  for (const k of Object.keys(ORD)) { const n = Core.keyWords(k).replace(/\s+/g, ''); if (n && !ORD[n]) ORD[n] = ORD[k]; }

  function bookName(i, lang) { const b = BOOKS[i]; return (lang && b[lang]) || b.en; }

  function lev(a, b) {
    const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  /** Find a book in phonetic tokens. exactOnly is used for live speech to avoid false hits. */
  function findBook(toks, exactOnly) {
    let best = null;
    for (let i = 0; i < toks.length; i++) {
      for (let len = 1; len <= 4 && i + len <= toks.length; len++) {
        const k = toks.slice(i, i + len).join('');
        if (k.length < 2 || /^\d+$/.test(k)) continue;
        if (exactOnly && k.length < 4 && !FULLNAMES.has(k) && !SPOKENKEYS.has(k)) continue;
        let hit = ALIAS.has(k) ? { b: ALIAS.get(k), exact: true } : null;
        if (!hit && !exactOnly && k.length >= 3 && !/\d$/.test(k)) {
          let cand = null;
          for (const [a, b] of ALIAS_LIST) if (a.startsWith(k) && (!cand || a.length < cand.a.length || (a.length === cand.a.length && b < cand.b))) cand = { a, b };
          if (cand) hit = { b: cand.b, exact: false };
        }
        if (!hit && !exactOnly && k.length >= 4 && !/\d/.test(k)) {
          const max = k.length >= 7 ? 2 : 1; let cand = null;
          for (const [a, b] of ALIAS_LIST) {
            if (Math.abs(a.length - k.length) > max) continue;
            const d = lev(a, k);
            if (d <= max && (!cand || d < cand.d)) cand = { b, d };
          }
          if (cand) hit = { b: cand.b, exact: false, fuzzy: true };
        }
        // Speech recognisers sometimes glue words together ("ininamukkuyohannan"): look for a book name at the end of a long word.
        if (!hit && exactOnly && len === 1 && k.length >= 8 && !/\d/.test(k)) {
          let cand = null;
          for (const [a, b] of ALIAS_LIST) if (a.length >= 5 && !/\d/.test(a) && k.endsWith(a) && (!cand || a.length > cand.a.length)) cand = { a, b };
          if (cand) hit = { b: cand.b, exact: true };
        }
        if (hit) {
          const score = k.length + (hit.exact ? 2 : 0) - (hit.fuzzy ? 3 : 0);
          // For speech, the most recent book mentioned wins; for typing, the best match wins.
          const better = !best || (exactOnly ? (i + len > best.end || (i + len === best.end && score > best.score)) : score > best.score);
          if (better) best = { book: hit.b, start: i, end: i + len, score };
        }
      }
    }
    return best;
  }

  /** Parse "John 3:16", "jn 3 16-18", "യോഹന്നാൻ 3:16", "யோவான் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்". */
  function parseRef(text, opts) {
    opts = opts || {};
    const toks = Core.keyWords(text).split(/\s+/).filter(Boolean).map(t => ORD[t] || t);
    if (!toks.length) return null;
    let f = findBook(toks, opts.exactOnly);
    // Speech: a badly spelled book name right before "chapter verse" numbers ("vohmar 8 28" = Romans 8:28).
    if (!f && opts.exactOnly) {
      for (let i = toks.length - 2; i >= 0; i--) {
        if (/\d/.test(toks[i]) || toks[i].length < 3 || !Core.numbers(toks[i + 1]).length) continue;   // must sit right before the numbers
        const after = Core.numbers(toks.slice(i + 1).join(' ')); if (after.length < 2 && !(after.length === 1 && after[0] >= 100)) continue;
        // The word before the numbers, or that word glued to the previous one ("yo kanan" = yohanan).
        const cands = [[toks[i], i]]; if (i > 0 && !/\d/.test(toks[i - 1])) cands.push([toks[i - 1] + toks[i], i - 1]);
        let best = null;
        for (const [w, st] of cands) { if (w.length < 5) continue;
          for (const [a, b] of ALIAS_LIST) { if (a.length < 5 || /\d/.test(a) || Math.abs(a.length - w.length) > 2) continue; const d = lev(a, w); if (d <= (w.length >= 6 ? 2 : 1) && (!best || d < best.d)) best = { b, d, st }; } }
        if (best) { f = { book: best.b, start: best.st, end: i + 1, score: 0 }; break; }
      }
      if (!f) return null;
    }
    if (!f) return null;
    let nums = Core.numbers(toks.slice(f.end).join(' '));
    if (opts.needChapter && !nums.length) return null;
    const book = BOOKS[f.book];
    // Speech models often glue chapter and verse into one number ("828" for 8:28): split it where both parts are valid.
    if (nums.length === 1 && nums[0] > book.ch && book.ch > 1) {
      const d = String(nums[0]); let best = null;
      for (let i = 1; i < d.length; i++) { const c = +d.slice(0, i), v = +d.slice(i); if (c >= 1 && c <= book.ch && v >= 1 && v <= 176 && !d.slice(i).startsWith('0')) best = best || [c, v]; }
      if (best) nums = best;
    }
    if (opts.needVerse && nums.length < 2 && book.ch > 1) return null;
    let ch = nums[0] || 1, v = nums[1] || 1, ve = nums[2] && nums[2] > v ? nums[2] : v;
    if (book.ch === 1 && nums.length === 1) { v = ch; ve = v; ch = 1; }
    if (ch < 1 || ch > book.ch) return null;
    // Validate against the loaded text when available (e.g. Matthew 1 has 25 verses, so 1:191 is noise).
    const loadedId = Object.keys(DATA)[0];
    if (loadedId) { const n = chapter(loadedId, f.book, ch).length; if (n && v > n) return null; if (n && ve > n) ve = n; }
    else if (v > 176) return null;
    const after = toks.slice(f.end);
    const cue = hasCue(after);
    // "tight": the numbers come straight after the book name with nothing else between (strong signal in speech).
    const tight = after.length > 0 && Core.numbers(after.slice(0, 2).join(' ')).length >= 1 && after.slice(0, 1).every(t => Core.numbers(t).length || CUE.has(t.replace(/[^a-z]/g, '')));
    return { book: f.book, ch, v, ve, hasVerse: nums.length >= 2 || book.ch === 1, cue, tight, fuzzy: f.score === 0 };
  }

  function refLabel(r, lang) {
    if (!r) return '';
    return `${bookName(r.book, lang)} ${r.ch}:${r.v}${r.ve > r.v ? '–' + r.ve : ''}`;
  }

  /* ---------- Loading version files (script tags work from a folder and online) ---------- */
  const DATA = {}, LOADING = {};
  root.LF_BIBLE_LOAD = function (b) { DATA[b.id] = b; };
  function load(id, base) {
    if (DATA[id]) return Promise.resolve(DATA[id]);
    if (LOADING[id]) return LOADING[id];
    if (typeof document === 'undefined' && typeof importScripts === 'function') {
      // Inside the background worker.
      LOADING[id] = new Promise((res, rej) => { try { importScripts((base || '../bible/') + id + '.js'); DATA[id] ? res(DATA[id]) : rej(new Error('empty')); } catch (e) { delete LOADING[id]; rej(e); } });
      return LOADING[id];
    }
    LOADING[id] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = (base || 'bible/') + id + '.js';
      s.onload = () => DATA[id] ? res(DATA[id]) : rej(new Error('empty'));
      s.onerror = () => { delete LOADING[id]; rej(new Error('missing ' + id)); };
      document.head.appendChild(s);
    });
    return LOADING[id];
  }
  function loaded(id) { return !!DATA[id]; }
  function chapter(id, b, c) { const d = DATA[id]; return d && d.data[b] && d.data[b][c - 1] || []; }
  function verse(id, b, c, v) { return chapter(id, b, c)[v - 1] || ''; }
  function chapterCount(id, b) { const d = DATA[id]; return d ? d.data[b].length : BOOKS[b].ch; }

  /* ---------- Word index (built in small chunks so slow laptops stay responsive) ---------- */
  const IDX = {};
  function ensureIndex(id, onProgress) {
    if (IDX[id] && IDX[id].ready) return Promise.resolve(IDX[id]);
    if (IDX[id] && IDX[id].promise) return IDX[id].promise;
    const ix = IDX[id] = { ready: false, refs: [], words: new Map(), nwords: [] };
    ix.promise = load(id).then(d => new Promise(res => {
      const list = [];
      d.data.forEach((bk, b) => bk.forEach((chv, c) => chv.forEach((t, v) => list.push([b, c + 1, v + 1, t]))));
      let i = 0;
      const step = () => {
        const end = Math.min(list.length, i + 1500);
        for (; i < end; i++) {
          const [b, c, v, t] = list[i];
          ix.refs.push(b * 65536 + c * 256 + v);
          const ws = new Set(Core.keyWords(t).split(' ').filter(w => w.length >= 2));
          ix.nwords.push(ws.size);
          for (const w of ws) { let p = ix.words.get(w); if (!p) ix.words.set(w, p = []); p.push(i); }
        }
        if (onProgress) onProgress(i / list.length);
        if (i < list.length) setTimeout(step, 0);
        else { ix.keys = [...ix.words.keys()].sort(); ix.ready = true; res(ix); }
      };
      step();
    }));
    return ix.promise;
  }
  const unpack = n => ({ book: n >> 16, ch: (n >> 8) & 255, v: n & 255 });

  function prefixKeys(ix, p, limit) {
    let lo = 0, hi = ix.keys.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ix.keys[m] < p) lo = m + 1; else hi = m; }
    const out = [];
    for (let i = lo; i < ix.keys.length && ix.keys[i].startsWith(p) && out.length < limit; i++) out.push(ix.keys[i]);
    return out;
  }

  /** Keyword search. Every word must match (word start), in Bible order. */
  function search(id, q, limit) {
    const ix = IDX[id]; if (!ix || !ix.ready) return [];
    const toks = Core.keyWords(q).split(' ').filter(w => w.length >= 2);
    if (!toks.length) return [];
    let acc = null;
    for (const t of toks) {
      const set = new Set();
      for (const k of prefixKeys(ix, t, 60)) for (const p of ix.words.get(k)) set.add(p);
      acc = acc ? new Set([...acc].filter(x => set.has(x))) : set;
      if (!acc.size) return [];
    }
    return [...acc].sort((a, b) => a - b).slice(0, limit || 150).map(i => Object.assign(unpack(ix.refs[i]), { idx: i }));
  }

  /** Spoken quote → most likely verses. */
  function quote(id, heard, limit) {
    const ix = IDX[id]; if (!ix || !ix.ready) return [];
    const ws = [...new Set(Core.keyWords(heard).split(' ').filter(w => w.length >= 3))].slice(-14);
    if (ws.length < 4) return [];
    const hits = new Map();
    for (const w of ws) {
      const p = ix.words.get(w); if (!p || p.length > 4000) continue;
      for (const i of p) hits.set(i, (hits.get(i) || 0) + 1);
    }
    const out = [];
    for (const [i, h] of hits) {
      if (h < 3) continue;
      const s = h / Math.min(ix.nwords[i], ws.length);
      if (s >= .5) out.push(Object.assign(unpack(ix.refs[i]), { score: s, hits: h }));
    }
    return out.sort((a, b) => b.score - a.score || b.hits - a.hits).slice(0, limit || 3);
  }

  // Books preached from most often come first when several names fit.
  const POPULAR = new Set([42, 39, 18, 44, 41, 40, 43, 0, 22, 19, 57, 65, 48, 45, 58, 49, 1, 23]);
  /** Books whose name (in any language or spelling) starts with what the user typed. */
  function suggestBooks(text, limit) {
    const toks = String(text || '').trim().split(/\s+/).filter(Boolean);
    const cut = toks.findIndex((t, i) => i > 0 && /^\d/.test(t));
    const typed = (cut > 0 ? toks.slice(0, cut) : toks).join('').toLowerCase().replace(/^(first|1st)/, '1').replace(/^(second|2nd)/, '2').replace(/^(third|3rd)/, '3');
    if (!typed || /^\d+$/.test(typed)) return [];
    const q = kn(typed);
    const best = new Map();
    for (const [raw, b, k] of RAW) {
      let sc = null;
      if (raw === typed) sc = 0;
      else if (raw.startsWith(typed)) sc = 1;
      else if (k === q) sc = 1.5;
      else if (q && k.startsWith(q)) sc = 2;
      else if (q.length >= 4 && !/\d/.test(q) && lev(k.slice(0, q.length), q) <= 1) sc = 3;
      if (sc == null) continue;
      if (POPULAR.has(b)) sc -= .4;
      if (!best.has(b) || sc < best.get(b)) best.set(b, sc);
    }
    return [...best.entries()].sort((x, y) => x[1] - y[1] || x[0] - y[0]).slice(0, limit || 8).map(([b]) => b);
  }

  const Bible = { suggestBooks, VERSIONS, BOOKS, bookName, parseRef, refLabel, load, loaded, chapter, verse, chapterCount, ensureIndex, search, quote, findBook };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bible; else root.LFBible = Bible;
})(typeof window !== 'undefined' ? window : globalThis);
