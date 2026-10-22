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
  // More spoken forms collected from how people actually say the books (Malayalam, Tamil and English letters).
  Object.assign(SPOKEN, {
    0: (SPOKEN[0] || '') + ' ulpatti ulpathi aatiyakamam',
    17: 'yop yopu iyyob ഇയ്യോബിന്റെ',
    18: SPOKEN[18] + ' சங்கீத சங்கீதப் സങ്കീർത്തന sankirtanam sankeerthanam sangeetham',
    19: (SPOKEN[19] || '') + ' സദൃശ സദൃശ്യ സദൃശ്യവാക്യം സദൃശവാക്യം സദൃശ്യവാക്യങ്ങളിൽ',
    42: SPOKEN[42] + ' യോഹന്നാനിൽ யோவானில் yohannan yovan',
    44: SPOKEN[44] + ' റോമാ ரோமாபுரி roma roman',
    53: 'തിമോത്തി തിമൊഥെയൊസ് தீமோத்தி timothy',
    57: SPOKEN[57] + ' എബ്രായ എബ്രായലേഖനം எபிரேயர் ebraya',
    65: SPOKEN[65] + ' வெளிப்படுத்தல் வெளிப்படுத்துதல் வெளிப்படுத்தின வெளிப்படுத்தின்விசேஷங்கள் വെളിപ്പാടു velippad'
  });
  const FULLNAMES = new Set(); B.forEach(r => [r[0], r[2], r[3]].forEach(n => FULLNAMES.add(kn(n))));
  const SPOKENKEYS = new Set();
  for (const [i, names] of Object.entries(SPOKEN)) names.split(' ').filter(Boolean).forEach(a => { addAlias(a, +i, true); SPOKENKEYS.add(kn(a)); });
  // Numbered books said with a number word ("ഒന്നാം കൊരിന്ത്യർ", "முதலாம் யோவான்", "first Peter") also answer to
  // their digit form; Timothy's spoken short form is registered for both letters.
  // 1/2/3 John said with any spelling of John ("first jon", "1 jhon", "ഒന്നാം യോഹന്നാൻ").
  ['jon', 'jhon', 'jaan', 'yohan', 'yohannan', 'yovan', 'ജോൺ', 'ஜான்', 'യോഹന്നാൻ', 'யோவான்'].forEach(a => { const k = kn(a); [1, 2, 3].forEach(n => { if (!ALIAS.has(n + k)) ALIAS.set(n + k, 60 + n); FULLNAMES.add(n + k); }); });
  // English recognisers mishear "Kings" after the number: "2 Kays", "2 Canes", "1 Keens".
  ['kays', 'canes', 'kins', 'keens', 'kinks', 'kingz'].forEach(a => { const k = kn(a); ALIAS.set('1' + k, 10); ALIAS.set('2' + k, 11); FULLNAMES.add('1' + k); FULLNAMES.add('2' + k); });
  ['തിമോത്തി', 'timothy', 'timoti', 'timotti'].forEach(a => { const k = kn(a); ALIAS.set('1' + k, 53); ALIAS.set('2' + k, 54); FULLNAMES.add('1' + k); FULLNAMES.add('2' + k); });
  // Words that only decorate a book name in speech: "പുസ്തകം" (book), "ലേഖനം" (letter), "സുവിശേഷം"/"சுவிசேஷம்" (gospel),
  // "நிருபம்" (epistle), "எழுதிய/எழுதின" (written), "gospel of", "book of".
  const NOISE = new Set(['പുസ്തകം', 'പുസ്തകത്തിൽ', 'ലേഖനം', 'ലേഖനത്തിൽ', 'സുവിശേഷം', 'സുവിശേഷത്തിൽ', 'புஸ்தகம்', 'புத்தகம்', 'சுவிசேஷம்', 'சுவிசேஷத்தில்', 'நிருபம்', 'நிருபத்தில்',
    'எழுதிய', 'எழுதின', 'தீர்க்கதரிசி', 'gospel', 'book', 'letter', 'epistle', 'pustakam', 'pusthakam', 'lekhanam', 'suvisesham', 'suvishesham', 'nirupam'].map(kn));
  const FILLER = new Set(['അതായത്', 'പിന്നെ', 'അതാവത്', 'அதாவது', 'அந்த', 'இந்த', 'uh', 'um', 'the', 'that', 'okay', 'ok', 'so', 'is'].map(kn));
  // "first/second/third" in the three languages, as said before a book name.
  const BOOKORD = new Map([['മുതലാം', 1], ['முதலாம்', 1], ['முதல்', 1], ['மூதலாம்', 1]].map(([w, n]) => [kn(w), n]));
  // Case and possessive endings that hang on a book name in speech ("യോഹന്നാന്റെ", "റോമർക്കുള്ള", "ஆதியாகமத்தில்", "ரோமருக்கு").
  const SUFFIXES = ['ukkulla', 'kkulla', 'kulla', 'ukula', 'kula', 'arkku', 'ukku', 'kku', 'uku', 'ku', 'inte', 'nte', 'yute', 'ute', 'tile', 'til', 'ttil', 'yil', 'il', 'atil', 'in', 'e', 'um', 'ai', 'utaiya', 'ate'];
  function stemBook(k) {
    if (ALIAS.has(k)) return k;
    for (const v of ['u', 'a', 'e']) if (ALIAS.has(k + v)) return k + v;                   // "യിരെമ്യാവ്" = "യിരെമ്യാവു"
    if (/[aeiu]$/.test(k) && ALIAS.has(k.slice(0, -1))) return k.slice(0, -1);
    for (const suf of SUFFIXES) if (k.length - suf.length >= 3 && k.endsWith(suf)) {
      const st = k.slice(0, -suf.length); if (ALIAS.has(st)) return st;
      if (ALIAS.has(st + 'm')) return st + 'm';           // "ஆதியாகமத்தில்" -> atiyakamat + til -> atiyakamam
      if (st.endsWith('t') && ALIAS.has(st.slice(0, -1) + 'm')) return st.slice(0, -1) + 'm';
      if (ALIAS.has(st + 'r')) return st + 'r';
    }
    return null;
  }
  const ALIAS_LIST = [...ALIAS.entries()];
  // Full book names (any language). In speech, short abbreviations like "is", "am", "ps" are too easy to hear by accident.

  // Words that mark a chapter or verse number in speech (English, Malayalam, Tamil, Hindi, and their English-letter forms).
  const CUE = new Set(['chapter','chapters','verse','verses','versus','ch','v','vs','അദ്ധ്യായം','അധ്യായം','വാക്യം','വചനം','അദ്ധ്യായത്തിൽ','വാക്യത്തിൽ','அதிகாரம்','வசனம்','வசனங்கள்','अध्याय','पद','आयत',
    'adhyayam','athyayam','adyayam','adhyaayam','vakyam','vaakyam','vachanam','vakyem','adhayam','athayam','adhyam','athikaram','adhikaram','vasanam','vasanam','adhyay','adhayam','athayam','adhyam','vakkam','vakam','vakem','vaakkam'].map(w => Core.keyWords(w).replace(/\s+/g, '')).filter(Boolean));
  const CH_CUE = new Set(['chapter','chapters','ch','അദ്ധ്യായം','അധ്യായം','അദ്ധ്യായത്തിൽ','அதிகாரம்','अध्याय','adhyayam','athyayam','adyayam','adhyaayam','athikaram','adhikaram','adhyay'].map(w => Core.keyWords(w).replace(/\s+/g, '')));
  const V_CUE = new Set(['verse','verses','versus','v','vs','വാക്യം','വചനം','വാക്യത്തിൽ','வசனம்','வசனங்கள்','पद','आयत','vakyam','vaakyam','vachanam','vakyem','vasanam','vakkam','vakam','vakem','vaakkam'].map(w => Core.keyWords(w).replace(/\s+/g, '')));
  function cueKind(tok) {
    if (!tok) return '';
    const k = tok.replace(/[^a-z]/g, ''); if (!k) return '';
    for (const c of CH_CUE) if (k === c || (c.length >= 5 && k.length >= 5 && k.startsWith(c.slice(0, 5)))) return 'ch';
    for (const c of V_CUE) if (k === c || (c.length >= 5 && k.length >= 5 && k.startsWith(c.slice(0, 5)))) return 'v';
    return '';
  }
  /** Numbers in speech order, each with the chapter/verse word next to it, if any:
   *  Tamil and Malayalam often say the verse first ("2-ாம் வசனம் 3-ாம் அதிகாரம்" = chapter 3 verse 2). */
  function labelledNumbers(toks) {
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i]; if (cueKind(t)) continue;
      let n = Core.numbers(t); let span = 1;
      // "முதலாம் அதிகாரம்", "first chapter": the word for first before a chapter/verse word is the number 1
      if (!n.length && BOOKORD.has(kn(t)) && cueKind(toks[i + 1])) n = [1];
      if (!n.length && toks[i + 1] && !cueKind(toks[i + 1])) { const j = Core.numbers(t + ' ' + toks[i + 1]); if (j.length === 1) { n = j; span = 2; } }
      if (!n.length) continue;
      let val = n[0];
      const prev = out[out.length - 1];
      if (prev && prev.end === i && prev.word && !/^\d/.test(t) && prev.val % 10 === 0 && prev.val >= 20 && val < 10) { prev.val += val; prev.end = i + span; continue; }
      // English says the word first ("chapter 3"); Malayalam/Tamil say it after the number ("3-ാം അധ്യായം"),
      // sometimes with an ordinal particle in between ("16 ஆம் வசனம்").
      const EN = /^(chapter|chapters|ch|verse|verses|versus|v|vs)$/;
      let next = toks[i + span]; if (next && !cueKind(next) && /^(am|aam|vatu|avatu|m)$/.test(next.replace(/[^a-z]/g, ''))) next = toks[i + span + 1];
      const prevTok = toks[i - 1] || '';
      // A Malayalam/Tamil cue word belongs to the number before it, so it never labels the number that follows it.
      const prevEn = cueKind(prevTok) && EN.test(prevTok.replace(/[^a-z]/g, ''));
      const kind = prevEn ? cueKind(prevTok) : (cueKind(next) || '');
      out.push({ val, start: i, end: i + span, word: !/^\d/.test(t), kind });
      i += span - 1;
    }
    return out;
  }
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
        let k = toks.slice(i, i + len).join('');
        if (k.length < 2 || /^\d+$/.test(k)) continue;
        // A book name split in two by the recogniser loses its "y" glide: "ஆதி ஆகமம்" = ஆதியாகமம் (ati + akamam).
        if (len === 2 && !ALIAS.has(k) && /[aeiou]$/.test(toks[i]) && /^[aeiou]/.test(toks[i + 1]) && ALIAS.has(toks[i] + 'y' + toks[i + 1])) k = toks[i] + 'y' + toks[i + 1];
        if (exactOnly && k.length < 4 && !FULLNAMES.has(k) && !SPOKENKEYS.has(k)) continue;
        const sk = ALIAS.has(k) ? k : (k.length >= 4 ? stemBook(k) : null);
        let hit = sk ? { b: ALIAS.get(sk), exact: true } : null;
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
    const toks = prepToks(text);
    if (!toks.length) return null;
    return parseToks(toks, opts);
  }
  function prepToks(text) {
    // Decoration words ("book", "gospel", "ലേഖനം"...) and fillers ("ആ", "ഈ", "அதாவது", "uh", "the") are dropped.
    let toks = Core.keyWords(text).split(/\s+/).filter(Boolean).filter(t => !NOISE.has(t) && !FILLER.has(t) && !/^[aeiou]{1,2}$/.test(t));
    toks = toks.filter((t, i) => !(t === 'of' && i === 0));
    // "3-ാം" / "3-ஆம்" arrive as "3 m" / "3 am": glue the ordinal ending back onto its number.
    toks = toks.reduce((a, t) => { if (/^(m|am|aam|avatu|vatu|atu)$/.test(t) && /^\d+$/.test(a[a.length - 1] || '')) a[a.length - 1] += t; else a.push(t); return a; }, []);
    // Number word before a numbered book ("രണ്ടാം രാജാക്കന്മാർ", "இரண்டாம் கொரிந்தியர்", "second Kings", "II Kings") -> digit.
    for (let i = 0; i + 1 < toks.length; i++) {
      if (/^\d/.test(toks[i]) && !/^[123](st|nd|rd|nt|rt)?$/.test(toks[i])) continue;
      let n = /^[123](st|nd|rd|nt|rt)?$/.test(toks[i]) ? +toks[i][0] : ORD[toks[i]] ? +ORD[toks[i]] : BOOKORD.get(toks[i]);
      if (n == null) { const ns = Core.numbers(toks[i]); n = ns.length === 1 && ns[0] <= 3 ? ns[0] : null; }
      if (n == null) continue;
      for (let len = 1; len <= 2 && i + len < toks.length; len++) {
        // Only full book names count here: "first time" must not become "1 tim" (1 Timothy).
        const k = n + toks.slice(i + 1, i + 1 + len).join(''), st = stemBook(k);
        if (st && (FULLNAMES.has(st) || SPOKENKEYS.has(st) || st.length >= 6)) { toks[i] = String(n); break; }
        // A slightly misheard numbered book ("1 jhon", "2nd corundians"): nearest numbered book name, same number.
        if (len === 1 && k.length >= 6) {
          let best = null, bd = 9;
          for (const [a] of ALIAS_LIST) { if (a[0] !== String(n) || !/^\d[a-z]+$/.test(a) || Math.abs(a.length - k.length) > 2) continue; const d = lev(a, k); if (d < bd) { bd = d; best = a; } }
          if (best && bd <= (k.length >= 8 ? 2 : 1)) { toks[i] = String(n); toks[i + 1] = best.slice(1); break; }
        }
      }
    }
    // Words said twice ("യോഹന്നാൻ യോഹന്നാൻ", "പതിമൂന്നാം പതിമൂന്നാം") count once; a number said twice ("Hebrews 7 7 28",
    // "Isaiah 5 5 5") counts once when another number still follows (after an optional chapter/verse word).
    toks = toks.filter((t, i) => {
      if (/^\d+$/.test(t) && toks[i + 1] && toks[i + 1] !== t && toks[i + 1].replace(/\D+$/, '') === t) return false;   // "3 3ஆம்"
      if (i === 0 || t !== toks[i - 1]) return true;
      if (!/^\d+$/.test(t)) return false;
      let j = i + 1; while (j < toks.length && cueKind(toks[j])) j++;
      return !(j < toks.length && (/^\d+$/.test(toks[j]) || Core.numbers(toks[j]).length));
    });
    return toks;
  }
  function parseToks(toks, opts) {
    let f = findBook(toks, opts.exactOnly);
    // Speech: a badly spelled book name right before "chapter verse" numbers ("vohmar 8 28" = Romans 8:28).
    if (!f && opts.exactOnly) {
      for (let i = toks.length - 2; i >= 0; i--) {
        let nx = i + 1; while (nx < toks.length && cueKind(toks[nx])) nx++;          // "യിരെമ്യാവ് chapter 23"
        if (/\d/.test(toks[i]) || toks[i].length < 3 || cueKind(toks[i]) || nx >= toks.length || !Core.numbers(toks[nx]).length) continue;   // must sit right before the numbers
        const after = Core.numbers(toks.slice(nx).join(' ')); if (after.length < 2 && !(after.length === 1 && after[0] >= 100)) continue;
        // The word before the numbers, or that word glued to the previous one ("yo kanan" = yohanan).
        const cands = [[toks[i], i]]; if (i > 0 && !/\d/.test(toks[i - 1])) { cands.push([toks[i - 1] + toks[i], i - 1]); if (/[aeiou]$/.test(toks[i - 1]) && /^[aeiou]/.test(toks[i])) cands.push([toks[i - 1] + 'y' + toks[i], i - 1]); }
        const num = i > 0 && /^[123]$/.test(toks[i - 1]);       // "2 Canes" / "2 Kays" = 2 Kings: compare with numbered books
        if (num) cands.push([toks[i - 1] + toks[i], i - 1]);
        let best = null, tie = false;
        for (const [w, st] of cands) { if (w.length < 5) continue; const dig = /^\d/.test(w);
          for (const [a, b] of ALIAS_LIST) { if (a.length < 5 || /\d/.test(a) !== dig || (dig && a[0] !== w[0]) || Math.abs(a.length - w.length) > 2) continue; const d = lev(a, w);
            // Books in the sermon plan are expected: they may be heard a little worse and still win.
            const pf = opts.prefer && opts.prefer.has(b) ? 1 : 0, dd = d - pf * .5;
            if (d <= (dig ? (w.length >= 7 ? 2 : 1) : w.length >= 6 ? 2 : 1) + pf && (!best || dd < best.d)) { tie = false; best = { b, d: dd, st }; } else if (best && dd === best.d && b !== best.b) tie = true; } }
        if (best && tie && /^\d/.test(toks[best.st])) best = null;
        if (best) { f = { book: best.b, start: best.st, end: i + 1, score: 0 }; break; }
      }
      if (!f) return null;
    }
    if (!f) return null;
    let nums = Core.numbers(toks.slice(f.end).join(' '));
    // Tamil/Malayalam sometimes put the book last: "ஒன்பதாவது அதிகாரம் இரண்டாவது வசனம் மத்தேயு" (Matthew 9:2).
    let numToks = toks.slice(f.end);
    if (!nums.length && f.start > 0 && f.end >= toks.length - 1) {
      const before = toks.slice(Math.max(0, f.start - 6), f.start);
      if (Core.numbers(before.join(' ')).length >= 1 && hasCue(before)) { numToks = before; nums = Core.numbers(before.join(' ')); }
    }
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
    // Spoken order may be verse-first: trust the chapter/verse words when both kinds are present.
    const lab = labelledNumbers(numToks);
    const chs = lab.filter(x => x.kind === 'ch'), vs = lab.filter(x => x.kind === 'v');
    if (chs.length && vs.length) { ch = chs[0].val; v = vs[0].val; ve = vs[1] && vs[1].val > v ? vs[1].val : (lab.find(x => x.start > vs[0].end && !x.kind && x.val > v) || { val: v }).val; }
    else if (vs.length === 1 && lab.length === 2 && !chs.length) { const other = lab.find(x => x !== vs[0]); ch = other.val; v = vs[0].val; ve = v; }
    else if (chs.length === 1 && lab.length === 2 && !vs.length) { const other = lab.find(x => x !== chs[0]); ch = chs[0].val; v = other.val; ve = v; }
    if (ch < 1 || ch > book.ch) return null;
    // Validate against the loaded text when available (e.g. Matthew 1 has 25 verses, so 1:191 is noise).
    const loadedId = Object.keys(DATA)[0];
    if (loadedId) { const n = chapter(loadedId, f.book, ch).length; if (n && v > n) return null; if (n && ve > n) ve = n; }
    else if (v > 176) return null;
    const after = numToks;
    const cue = hasCue(after);
    // "tight": the numbers come straight after the book name with nothing else between (strong signal in speech).
    const tight = after.length > 0 && Core.numbers(after.slice(0, 2).join(' ')).length >= 1 && after.slice(0, 1).every(t => Core.numbers(t).length || CUE.has(t.replace(/[^a-z]/g, '')));
    return { book: f.book, ch, v, ve, hasVerse: nums.length >= 2 || book.ch === 1, cue, tight, fuzzy: f.score === 0 };
  }

  /** Part of a reference, for references spoken in pieces or with one misheard number:
   *  "மத்தேயு ஒண்ணாவது வசனம் <misheard> அதிகாரம்" -> { book: Matthew, v: 1 }; then "அஞ்சாம் அதிகாரம்" -> { ch: 5 }.
   *  Without a book name only numbers labelled by a chapter/verse word count ("verse 17", "17-ാം വാക്യം"). */
  function parsePartial(text) {
    const toks = prepToks(text); if (!toks.length) return null;
    const f = findBook(toks, true);
    const lab = labelledNumbers(f ? toks.slice(f.end) : toks);
    const c = lab.find(x => x.kind === 'ch'), v = lab.find(x => x.kind === 'v');
    const out = { book: f ? f.book : null, ch: c ? c.val : null, v: v ? v.val : null };
    if (f && !c && !v && lab.length === 1) out.ch = lab[0].val;          // "Matthew 5" ... "verse 3"
    if (!f && !c && !v && lab.length === 1) {                              // "വാക്യം 20", "அதிகாரம் 5": the word before the only number
      const k = cueKind(toks[lab[0].start - 1] || ''); if (k === 'ch') out.ch = lab[0].val; else if (k === 'v') out.v = lab[0].val;
    }
    if (out.book == null && out.ch == null && out.v == null) return null;
    return out;
  }
  /** True when the verse exists (checked against a loaded Bible when there is one). */
  function validRef(book, ch, v) {
    const b = BOOKS[book]; if (!b || !(ch >= 1 && ch <= b.ch) || !(v >= 1 && v <= 176)) return false;
    const id = Object.keys(DATA)[0]; if (!id) return true;
    const n = chapter(id, book, ch).length; return !n || v <= n;
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
    out.sort((a, b) => b.score - a.score || b.hits - a.hits);
    // How much of the verse was heard IN ORDER (longest common run of words, a word heard once counting once):
    // a verse read out keeps its word order; an explanation that only shares some of its words does not.
    // ord: share of the verse's words, ordN: how many.
    const hw = Core.keyWords(heard).split(' ').filter(w => w.length >= 3).slice(-45);
    const eq = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5));
    for (const q of out.slice(0, 8)) {
      const vw = Core.keyWords(verse(id, q.book, q.ch, q.v)).split(' ').filter(w => w.length >= 3);
      const m = vw.length, n = hw.length, dp = new Array(n + 1).fill(0);
      for (let a = 1; a <= m; a++) { let prev = 0; for (let b = 1; b <= n; b++) { const t = dp[b]; dp[b] = eq(vw[a - 1], hw[b - 1]) ? prev + 1 : Math.max(dp[b], dp[b - 1]); prev = t; } }
      q.ordN = dp[n]; q.ord = m ? dp[n] / m : 0;
    }
    return out.slice(0, limit || 3);
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

  const Bible = { parsePartial, validRef, suggestBooks, VERSIONS, BOOKS, bookName, parseRef, refLabel, load, loaded, chapter, verse, chapterCount, ensureIndex, search, quote, findBook };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bible; else root.LFBible = Bible;
})(typeof window !== 'undefined' ? window : globalThis);
