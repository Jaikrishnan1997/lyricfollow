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
  // The same words in any case form ("പുസ്തകത്തിന്റെ", "புஸ்தகத்தில்", "ലേഖനത്തിലെ", "pusthakam"...), on their phonetic key.
  const DECOR = /^(pustak|putak|lekan|suvises|cuvices|nirup)(am|at(il|ile|in|inte|ilulla|ilum)?)$/;
  const isNoise = t => NOISE.has(t) || DECOR.test(t);
  // "<book> written first letter" ("യോഹന്നാൻ എഴുതിയ ഒന്നാം ലേഖനം", "கொரிந்தியருக்கு எழுதின முதலாம் நிருபம்") names 1 John / 1 Corinthians.
  const WRITTEN = new Set(['എഴുതിയ', 'எழுதிய', 'எழுதின', 'written', 'wrote'].map(kn));
  const LETTER = /^(lekan|nirup)(am|at(il|ile|in|inte)?)$|^(leter|epistle)$/;
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
  const CUE = new Set(['chapter','chapters','verse','verses','versus','ch','v','vs','അദ്ധ്യായം','അധ്യായം','വാക്യം','വചനം','അദ്ധ്യായത്തിൽ','അദ്ധ്യായത്തിലെ','അദ്ധ്യായത്തിന്റെ','വാക്യത്തിൽ','വാക്യങ്ങൾ','அதிகாரம்','அதிகாரத்தில்','அதிகாரத்தின்','வசனம்','வசனங்கள்','வசனத்தில்','अध्याय','पद','आयत',
    'adhyayam','athyayam','adyayam','adhyaayam','vakyam','vaakyam','vachanam','vakyem','adhayam','athayam','adhyam','athikaram','adhikaram','vasanam','vasanam','adhyay','adhayam','athayam','adhyam','vakkam','vakam','vakem','vaakkam'].map(w => Core.keyWords(w).replace(/\s+/g, '')).filter(Boolean));
  const CH_CUE = new Set(['chapter','chapters','ch','അദ്ധ്യായം','അധ്യായം','അദ്ധ്യായത്തിൽ','അദ്ധ്യായത്തിലെ','അദ്ധ്യായത്തിന്റെ','அதிகாரம்','அதிகாரத்தில்','அதிகாரத்தின்','अध्याय','adhyayam','athyayam','adyayam','adhyaayam','athikaram','adhikaram','adhyay'].map(w => Core.keyWords(w).replace(/\s+/g, '')));
  const V_CUE = new Set(['verse','verses','versus','v','vs','വാക്യം','വചനം','വാക്യത്തിൽ','വാക്യങ്ങൾ','வசனம்','வசனங்கள்','வசனத்தில்','पद','आयत','vakyam','vaakyam','vachanam','vakyem','vasanam','vakkam','vakam','vakem','vaakkam'].map(w => Core.keyWords(w).replace(/\s+/g, '')));
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
      // (tokens arrive as phonetic keys: "chapter" is "capter", "ch" is "c")
      const EN = /^(chapter|chapters|capter|capters|ch|c|verse|verses|versus|v|vs)$/;
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
  // The book is the last word that matters: at most two words after it, none a number or a chapter/verse word.
  function bookIsLast(toks, end) { const rest = toks.slice(end); return rest.length <= 2 && rest.every(t => !/\d/.test(t) && !Core.numbers(t).length && !cueKind(t)); }
  // Number words said as ordinals, on their sound key: "மூணாவது", "മൂന്നാം", "3-ஆம்" (3am), "third" (tirt), "16वाँ" (16t).
  const ORDTOK = new RegExp('^(\\d+[a-z]+|[a-z]*(am|avatu|vatu)|' + ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth','thirtieth'].map(w => Core.keyWords(w)).join('|') + ')$');
  // Book names that are also everyday words in the other languages (Tamil "வெளி" = outside, "roma"): not enough alone.
  const WEAK = new Set(['வெளி', 'roma', 'யோப்', 'ரோமா'].map(kn));
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
        // "verse 16 chapter 3 John": a number straight after an English chapter/verse word is not "3 John".
        if (/^\d/.test(toks[i]) && i > 0 && /^(capter|capters|c|verse|verses|versus|v|vs)$/.test(toks[i - 1])) continue;
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
    let raw = Core.keyWords(text).split(/\s+/).filter(Boolean);
    // Tamil "நாள்" (day) has the same sound key as Malayalam "നാല്" (four): in Tamil text it is a day, never a number.
    if (/[\u0B80-\u0BFF]/.test(text)) raw = raw.map(t => t === 'nal' ? 'day' : t);
    // "<book> (written) first letter" -> "1 <book>", before the letter word is dropped as decoration.
    for (let i = 2; i < raw.length; i++) {
      if (!LETTER.test(raw[i])) continue;
      const n = ordValue(raw[i - 1]); if (!n) continue;
      let j = i - 2; if (WRITTEN.has(raw[j]) && j > 0) j--;
      const st = numberedStem(n, raw[j]); if (st) { raw.splice(j, i - j + 1, String(n), st.slice(1)); i = j + 1; }
    }
    let toks = raw.filter(t => !isNoise(t) && !FILLER.has(t) && !/^[aeiou]{1,2}$/.test(t));
    toks = toks.filter((t, i) => !(t === 'of' && i === 0));
    // "3-ാം" / "3-ஆம்" arrive as "3 m" / "3 am": glue the ordinal ending back onto its number.
    toks = toks.reduce((a, t) => { if (/^(m|am|aam|avatu|vatu|atu)$/.test(t) && /^\d+$/.test(a[a.length - 1] || '')) a[a.length - 1] += t; else a.push(t); return a; }, []);
    // Tamil "முதலாம் / முதல்" (first) right before the chapter or verse word is the number 1, not a book ordinal.
    toks = toks.map((t, i) => BOOKORD.has(t) && cueKind(toks[i + 1]) ? '1' : t);
    // Malayalam possessive chapter, "യോഹന്നാൻ മൂന്നിന്റെ പതിനാറ്" (John 3's 16): only between a book name and a number.
    toks = toks.map((t, i) => {
      const m = t.match(/^([a-z]{2,})(inte|nte)$/); if (!m || !i || !toks[i + 1] || !findBook([toks[i - 1]], true) || !Core.numbers(toks[i + 1]).length) return t;
      const n = Core.numbers(m[1]); return n.length === 1 ? String(n[0]) : t;
    });
    // The Psalm number said before the word Psalm ("ഇരുപത്തിമൂന്നാം സങ്കീർത്തനം ഒന്നാം വാക്യം", "23rd Psalm verse 1"):
    // moved after it, but only when a verse number with its verse word follows straight after.
    for (let p = 1; p < toks.length; p++) {
      const f = findBook([toks[p]], true); if (!f || f.book !== 18) continue;
      const lab = labelledNumbers(toks.slice(p + 1)); if (!lab.length || lab[0].kind !== 'v' || lab[0].start > (cueKind(toks[p + 1]) ? 1 : 0)) continue;
      let k = 0;
      if (p >= 2 && Core.numbers(toks[p - 2]).length && Core.numbers(toks.slice(p - 2, p).join(' ')).length === 1 && !cueKind(toks[p - 2])) k = 2;
      else if (Core.numbers(toks[p - 1]).length === 1 && !cueKind(toks[p - 1])) k = 1;
      if (!k || cueKind(toks[p - k - 1]) || Core.numbers(toks.slice(p - k, p).join(' '))[0] > 150) continue;
      const moved = toks.splice(p - k, k); toks.splice(p - k + 1, 0, ...moved); break;
    }
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
      if (!/^\d+$/.test(t) && !Core.numbers(t).length) return false;      // "Genesis one one" keeps both
      let j = i + 1; while (j < toks.length && cueKind(toks[j])) j++;
      return !(j < toks.length && (/^\d+$/.test(toks[j]) || Core.numbers(toks[j]).length));
    });
    return toks;
  }
  function ordValue(t) { if (ORD[t]) return +ORD[t]; if (BOOKORD.has(t)) return BOOKORD.get(t); const n = Core.numbers(t); return n.length === 1 && n[0] <= 3 && !/^\d/.test(t) ? n[0] : 0; }
  // A numbered book's key from a number and a book word with its case ending ("കൊരിന്ത്യർക്ക്", "கொரிந்தியருக்கு"), or null.
  function numberedStem(n, w) {
    if (!w) return null;
    for (const c of [w, w.replace(/(uku|ku|k)$/, '')]) { const st = stemBook(n + c); if (st && /^\d/.test(BOOKS[ALIAS.get(st)].en)) return st; }
    return null;
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
    // Only when the book is the last word that matters (a lead-out like "வாசிப்போம்" may follow), and only numbers
    // that no earlier book in the same text has already taken: in "ஆதியாகமம் 3-ஆம் அதிகாரம் 4-ஆம் வசனம் உபாகமம்" the 3 and 4
    // are Genesis's, and Deuteronomy waits for its own (the live flip: Genesis, Deuteronomy 3:4, Genesis...).
    let numToks = toks.slice(f.end), bookLast = false;
    if (!nums.length && f.start > 0 && bookIsLast(toks, f.end)) {
      let from = Math.max(0, f.start - 6);
      const prev = parseToks(toks.slice(0, f.start), { exactOnly: opts.exactOnly, needChapter: true, needVerse: true, prefer: opts.prefer });
      if (prev) from = Math.max(from, prev.used);
      const before = toks.slice(from, f.start);
      if (Core.numbers(before.join(' ')).length >= 1 && hasCue(before)) { numToks = before; nums = Core.numbers(before.join(' ')); bookLast = true; }
      else if (prev && prev.book === f.book) return prev;        // "John 3 16 ... John": the book said again
    }
    // The book in the middle: "verse 16 of John chapter 3", "in the third chapter of John verse 16". Only when the number
    // on each side carries its own chapter/verse word and the two words differ.
    let split = null;
    if (f.start > 0 && nums.length === 1) {
      const la = labelledNumbers(toks.slice(f.end)), lb = labelledNumbers(toks.slice(Math.max(0, f.start - 6), f.start));
      // "verse 1 of Psalm 23": a bare number straight after the book is the chapter when the verse word came before it.
      if (la.length === 1 && !la[0].kind && la[0].start === 0 && lb.length === 1 && lb[0].kind === 'v') la[0] = Object.assign({}, la[0], { kind: 'ch' });
      if (la.length === 1 && lb.length === 1 && la[0].kind && lb[0].kind && lb[0].kind !== la[0].kind) {
        split = la[0].kind === 'ch' ? { ch: la[0].val, v: lb[0].val } : { ch: lb[0].val, v: la[0].val };
        nums = [split.ch, split.v]; numToks = [];
      }
    }
    // Live speech with no chapter or verse word at all: only numbers said one after the other right after the book count
    // ("John 3 16", "യോഹന്നാൻ മൂന്ന് പതിനാറ്"), so "John was 3 years old when 16 people came" is not John 3:16. Up to two
    // words may still sit between: the rest of a longer book name that is not one of its spellings here ("அப்போஸ்தலர்
    // நடபடிகள் 10 8", "Acts of the Apostles 2 38", "yeshayya pravachakan 53 5").
    let bare = null;
    if (opts.exactOnly && !split && !hasCue(numToks) && numToks[0] === toks[f.end]) {
      const isNum = t => Core.numbers(t).length && !/^(are|on|for)$/.test(t);   // English words that sound like numbers
      let a = 0; while (a < 2 && a < numToks.length && !isNum(numToks[a])) a++;
      let m = a; while (m < numToks.length && (isNum(numToks[m]) || (m > a && /^(colon|kolan|and|to|tu|ant)$/.test(numToks[m])))) m++;
      nums = Core.numbers(numToks.slice(a, m).join(' ')); bare = numToks.slice(a, m); bare.end = m;
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
    const lab = split ? [] : labelledNumbers(numToks);
    // An end verse only from a number said next to the verse ("16 to 18", "4-ஆம் வசனம் முதல் 6-ஆம் வசனம் வரை"): a number
    // said later in running talk ("... and the serpent said 3 times") is not a range (seen live: Genesis 3:4-24).
    const near = (x, y) => x && y && y.start - x.end <= 2;
    let ch = nums[0] || 1, v = nums[1] || 1, ve = nums[2] && nums[2] > v && (bare || split || lab.length < 3 || near(lab[1], lab[2])) ? nums[2] : v;
    if (book.ch === 1 && nums.length === 1) { v = ch; ve = v; ch = 1; }
    // Spoken order may be verse-first: trust the chapter/verse words when both kinds are present.
    const chs = lab.filter(x => x.kind === 'ch'), vs = lab.filter(x => x.kind === 'v');
    let usedIn = lab.length >= 2 ? Math.max(lab[0].end, lab[1].end) : numToks.length;   // tokens of numToks this reference used
    if (chs.length && vs.length) {
      ch = chs[0].val; v = vs[0].val;
      const e = vs[1] && vs[1].start - vs[0].end <= 3 && vs[1].val > v ? vs[1] : lab.find(x => x.start >= vs[0].end && !x.kind && x.val > v && x.start - vs[0].end <= 2);
      ve = e ? e.val : v; usedIn = Math.max(chs[0].end, vs[0].end, e ? e.end : 0);
    }
    else if (vs.length === 1 && lab.length === 2 && !chs.length) { const other = lab.find(x => x !== vs[0]); ch = other.val; v = vs[0].val; ve = v; }
    else if (chs.length === 1 && lab.length === 2 && !vs.length) { const other = lab.find(x => x !== chs[0]); ch = chs[0].val; v = other.val; ve = v; }
    if (ch < 1 || ch > book.ch) return null;
    // Validate against the loaded text when available (e.g. Matthew 1 has 25 verses, so 1:191 is noise).
    const loadedId = Object.keys(DATA)[0];
    if (loadedId) { const n = chapter(loadedId, f.book, ch).length; if (n && v > n) return null; if (n && ve > n) ve = n; }
    else if (v > 176) return null;
    const after = split ? toks.slice(f.end) : numToks;
    const cue = hasCue(after);
    // "tight": the numbers come straight after the book name with nothing else between (strong signal in speech).
    const tight = after.length > 0 && Core.numbers(after.slice(0, 2).join(' ')).length >= 1 && after.slice(0, 1).every(t => Core.numbers(t).length || CUE.has(t.replace(/[^a-z]/g, '')));
    // used: the token after the last one this reference took (a later book in the same text may use what follows).
    const used = bookLast ? f.end : split ? toks.length : f.end + (bare ? bare.end : usedIn);
    // Without a chapter/verse word, ordinals ("மூணாவது", "രണ്ടാം", "third") and book names that are also everyday words
    // ("வெளி" = outside) are how casual talk sounds ("மூணாவது தடவை", "the third time"): such a match may be offered, never sure.
    const ordinal = !cue && (bare || numToks).some(t => Core.numbers(t).length && ORDTOK.test(t));
    const weak = WEAK.has(toks.slice(f.start, f.end).join(''));
    return { book: f.book, ch, v, ve, hasVerse: nums.length >= 2 || book.ch === 1, cue, tight, fuzzy: f.score === 0, used, ordinal, weak };
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
  /* ---------- What the two Preach modes do with each recognised update ----------
   * Pure (no DOM, no clock of its own): app.js and tests/ref_stream_test.js call the same code, so the stream test
   * sees exactly what the screen would get. st is kept by the caller between updates: { vbText, partRef }. */
  function newRefState() { return { vbText: '', partRef: null, cand: '', utt: { spent: [], shown: null, done: [] } }; }
  const bcv = r => `${r.book}.${r.ch}.${r.v}`;
  const wkey = w => Core.keyWords(w).replace(/\s+/g, '');
  // How many leading words of this update are words this utterance already used up (recognisers revise a word or two
  // of a partial, so 60% the same is enough; a partial that took words back is spent as far as it goes).
  function spentCount(words, spent) {
    if (!spent.length) return 0;
    const n = Math.min(words.length, spent.length); let same = 0;
    for (let i = 0; i < n; i++) if (wkey(words[i]) === spent[i]) same++;
    return same >= Math.ceil(n * .6) ? n : 0;
  }
  // Parse words[s..k), at most the last 90 characters (whole words), as the tail of the old onBibleSpeech did.
  function parseWin(words, s, k, opts) {
    let i = k, len = 0; while (i > s && len + words[i - 1].length + 1 <= 91) { len += words[i - 1].length + 1; i--; }
    if (i === k) i = k - 1;
    return parseRef(words.slice(i, k).join(' '), opts);
  }
  // One reference becoming another as its last number is still being said: "twenty" -> "twenty one", "100" -> "119",
  // or only the end verse arriving ("16" -> "16 to 18").
  const grow = (x, y) => x === y || ((x % 10 === 0 && x >= 20 && y > x && y < x + 10) || (x === 100 && y > 100 && y < 200));
  const grows = (a, b) => a.book === b.book && ((a.ch === b.ch && grow(a.v, b.v)) || (a.v === b.v && grow(a.ch, b.ch)));
  /** The references in a run of words, in order, each with the words it spans ([from, to)) and whether something
   *  followed that ends it (closed: a new book or other talk that no longer parses with it). A reference ends where the
   *  next one starts, so its numbers are never given to a later book. */
  function refSegments(words, opts) {
    const out = []; let s = 0, cur = null;
    for (let k = 1; k <= words.length; k++) {
      const r = parseWin(words, s, k, opts);
      if (r && !cur) { cur = { r, from: s, to: k }; continue; }
      if (r && (bcv(r) === bcv(cur.r) || grows(cur.r, r))) { if (bcv(r) !== bcv(cur.r) || r.ve !== cur.r.ve) { cur.r = r; cur.to = k; } continue; }
      if (!cur) continue;
      cur.closed = true; out.push(cur); s = cur.to; k = s; cur = null;      // start again right after it
    }
    if (cur) { cur.closed = false; out.push(cur); }
    return out;
  }
  // Last word of a reference that cannot become another one: its chapter/verse word ("... பதினாறாம் வசனம்"), or the
  // book said last ("chapter 3 verse 16 of John"). A number said last may still grow ("twenty" -> "twenty one").
  function closedEnd(words, sg) {
    const t = prepToks(words.slice(Math.max(sg.from, sg.to - 2), sg.to).join(' ')); const last = t[t.length - 1];
    return !!last && (!!cueKind(last) || (!Core.numbers(last).length && !!findBook([last], true)));
  }
  function sureOf(r, text, conf, ctx) {
    // If what was heard matches a song line, it is singing (e.g. Tamil "நான்" heard as "John"), not a reference.
    if (ctx.singing && ctx.singing(text)) return false;
    // Sure: chapter/verse words were said, or the numbers follow the book name directly with a confident transcript.
    // Repeated numbers ("18 18", "1 1") are the usual shape of mishearings, so they need more confidence.
    const indic = /[ऀ-ॿ஀-௿ഀ-ൿ]/.test(text);   // Indian script: the recogniser was sure of the words
    const need = r.ch === r.v ? .85 : indic ? .4 : .72;
    // The offline engine spells Malayalam/Tamil book names phonetically ("Vohmar" = Romans), so a near-match book is normal there.
    const bookOk = !r.fuzzy || ctx.engine === 'local';
    const loose = !r.cue && (r.ordinal || r.weak);
    const planned = !!(ctx.inPlan && ctx.inPlan(r));
    return r.cue || (!loose && ((r.tight && bookOk && conf >= need) || (r.tight && conf >= .9))) || (planned && (r.tight || conf >= .5));
  }
  /** ev: { finals, interim (best alternative), conf }. ctx: { engine, prefer (Set of planned books), plan ([{book,ch,v}]),
   *  inPlan(r), singing(text) -> bool, screen (verse on screen while the Bible is shown, else null), screenAny
   *  (the last verse shown, even under a song), lastRefAt, now }.
   *  Returns { acts: [{ kind: 'ref', r, sure } | { kind: 'piece', r }], stop } - stop: nothing else may use this update.
   *
   *  A partial holds the whole utterance so far. Rules (tests/ref_stream_test.js):
   *  - once a reference is shown, the words up to its end are spent for the rest of the utterance: later partials and
   *    the final parse only what follows (the old 90-character tail kept re-reading them, and a book said next took
   *    their numbers: Genesis 3:4 -> "Deuteronomy 3:4");
   *  - from a partial, a sure reference goes on screen when it can no longer change: something followed it, or it ends
   *    on its chapter/verse word or its book, or two partials in a row gave the same book, chapter and verse;
   *    otherwise it waits (at most one partial) - the final always decides;
   *  - an unsure one is only offered (asked) on the final. */
  function refStep(st, ev, ctx) {
    const finals = ev.finals || '', conf = ev.conf == null ? .75 : ev.conf;
    const u = st.utt || (st.utt = { spent: [], shown: null, done: [] });
    const words = (finals || ev.interim || '').split(/\s+/).filter(Boolean);
    const n = spentCount(words, u.spent), rest = words.slice(n);
    // Before the new words: the reference already shown in this utterance (so a range said after it still extends it),
    // or the unused end of earlier finals (a book said, a pause, then its numbers).
    const base = u.shown ? u.shown.words : st.vbText.split(/\s+/).filter(Boolean);
    const all = base.concat(rest);
    const opts = { exactOnly: true, needChapter: true, needVerse: true, prefer: ctx.prefer };
    const segs = all.length ? refSegments(all, opts) : [];
    const prevCand = st.cand; st.cand = '';
    const acts = []; let usedTo = -1, waiting = false;
    for (const sg of segs) {
      const k = bcv(sg.r);
      if (u.shown && sg.from === 0) {           // the one already shown: only a longer range of it is news
        if (k === bcv(u.shown.r) && sg.r.ve !== u.shown.r.ve && sg.r.ve > sg.r.v) { u.shown.r = sg.r; acts.push({ kind: 'ref', r: { book: sg.r.book, ch: sg.r.ch, v: sg.r.v, ve: sg.r.ve }, sure: u.shown.sure }); }
        usedTo = sg.to; continue;
      }
      if (u.done.includes(k)) { usedTo = sg.to; continue; }   // a revised partial or the final repeating it
      const sure = sureOf(sg.r, all.slice(sg.from, sg.to).join(' '), conf, ctx);
      let go = !!finals;
      if (!finals && sure) go = sg.closed || closedEnd(all, sg) || prevCand === k;
      if (!go) { if (!finals && sure) st.cand = k; waiting = true; break; }
      acts.push({ kind: 'ref', r: { book: sg.r.book, ch: sg.r.ch, v: sg.r.v, ve: sg.r.ve }, sure });
      u.done.push(k); usedTo = sg.to;
      u.shown = { words: all.slice(sg.from, sg.to), r: sg.r, sure };
    }
    if (usedTo >= 0) {
      // Spend this update's words up to the end of the last reference used.
      const inRest = Math.max(0, usedTo - base.length);
      u.spent = words.slice(0, n + inRest).map(wkey);
      st.vbText = ''; st.partRef = null;
    }
    if (finals) {
      // The utterance is over: what it said after its last reference stays as context for the next one.
      const left = usedTo >= 0 ? all.slice(usedTo) : rest;
      st.vbText = ((usedTo >= 0 ? '' : st.vbText) + ' ' + left.join(' ')).trim().slice(-400);
      st.utt = { spent: [], shown: null, done: [] }; st.cand = '';
      if (!segs.length) { const p = pieceStep(st, rest.join(' '), ctx); if (p) return { acts: [p], stop: true }; }
    }
    return { acts, stop: segs.length > 0 || waiting };
  }
  // A reference said in pieces, or with one number misheard: "மத்தேயு 1-ஆம் வசனம் <misheard> அதிகாரம்" keeps
  // Matthew ?:1 waiting, and "அஞ்சாம் அதிகாரம்" said next completes it. "Verse 17" alone, said soon after a
  // verse was shown, moves within that chapter. The screen never sits on an old verse without saying what it heard.
  function pieceStep(st, text, ctx) {
    const p = parsePartial(text); if (!p) return null;
    const now = ctx.now, plan = ctx.plan || [], scr = ctx.screen, any = ctx.screenAny;
    if (p.book != null) st.partRef = { book: p.book, ch: p.ch, v: p.v, at: now };
    else if (st.partRef && now - st.partRef.at < 30000) { if (p.ch != null) st.partRef.ch = p.ch; if (p.v != null) st.partRef.v = p.v; st.partRef.at = now; }
    else if (p.ch != null && plan.filter(x => x.ch === p.ch).length === 1 && !(any && any.ch === p.ch)) {
      const m = plan.find(x => x.ch === p.ch); st.partRef = { book: m.book, ch: p.ch, v: p.v, at: now };   // another planned chapter
    }
    else if (p.v != null && scr && now - ctx.lastRefAt < 300000) st.partRef = { book: scr.book, ch: p.ch != null ? p.ch : scr.ch, v: p.v, at: now };
    else if (p.ch != null) {                  // "<misheard book> 5-ാം അധ്യായം 3-ാം വാക്യം": the one planned chapter 5
      const m = plan.filter(x => x.ch === p.ch); if (m.length !== 1) return null;
      st.partRef = { book: m[0].book, ch: p.ch, v: p.v, at: now };
    }
    else return null;
    const r = st.partRef;
    if (r.ch == null) { const m = plan.filter(x => x.book === r.book); if (m.length && m.every(x => x.ch === m[0].ch)) r.ch = m[0].ch; }
    if (r.ch == null && r.v == null) return null;           // only a book name so far: wait quietly
    if (r.ch != null && r.v != null) {
      st.partRef = null;
      if (!validRef(r.book, r.ch, r.v)) return null;
      st.vbText = '';
      return { kind: 'ref', r: { book: r.book, ch: r.ch, v: r.v, ve: r.v }, sure: true };
    }
    return { kind: 'piece', r: { book: r.book, ch: r.ch, v: r.v } };
  }
  const refKey = r => `${r.book}.${r.ch}.${r.v}.${r.ve}`;
  /** The heard-reference list (newest first, at most 10). o: { auto (show sure ones on screen), screenKey }.
   *  Returns { h (the entry), dup (it was already there), show (put it on screen) }. The same book, chapter and verse
   *  heard again within half a minute is the same entry: an end verse said after it ("... verses 16 to 18") updates it
   *  rather than adding a near-duplicate (seen live: Genesis 3:4, Genesis 3:4-24 in the same second). */
  function heardAdd(list, r, src, sure, now, o) {
    o = o || {}; const k = refKey(r);
    const prev = list.find(x => bcv(x.r) === bcv(r));
    if (prev && now - prev.at < 30000) {
      // No duplicate in the list; re-show only if the screen moved away (or the range on it changed).
      if (refKey(prev.r) !== k) prev.r = Object.assign({}, r);
      prev.at = now; if (sure) prev.sure = true;
      return { h: prev, dup: true, show: !!o.auto && (sure || prev.sure) && o.screenKey !== k };
    }
    const h = { r, src, at: now, sure: !!sure }; list.unshift(h); list.length = Math.min(list.length, 10);
    return { h, dup: false, show: !!o.auto && !!sure };
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

  // Per verse, how many of its words (3+ letters) are usable by quote(), i.e. in 4000 verses or fewer. Worked out once.
  function rareCounts(ix) {
    if (ix.nrare) return ix.nrare;
    const n = new Uint16Array(ix.refs.length);
    for (const [w, p] of ix.words) if (w.length >= 3 && p.length <= 4000) for (const i of p) n[i]++;
    return (ix.nrare = n);
  }
  /** Spoken quote → most likely verses. */
  function quote(id, heard, limit) {
    const ix = IDX[id]; if (!ix || !ix.ready) return [];
    // The 14 most recent words that can tell verses apart: very common words ("the", "and", "lord", more than 4000
    // verses) and words not in this Bible are passed over instead of using up a slot (English verses are full of them).
    const all = Core.keyWords(heard).split(' ').filter(w => w.length >= 3), ws = [], seen = new Set();
    for (let k = all.length - 1; k >= 0 && ws.length < 14; k--) { const w = all[k]; if (seen.has(w)) continue; seen.add(w); const p = ix.words.get(w); if (p && p.length <= 4000) ws.push(w); }
    if (ws.length < 4) return [];
    const hits = new Map();
    for (const w of ws) for (const i of ix.words.get(w)) hits.set(i, (hits.get(i) || 0) + 1);
    const nr = rareCounts(ix), out = [];
    for (const [i, h] of hits) {
      if (h < 3) continue;
      // Scored against the verse's own usable words (at least 4), so a short verse made mostly of common words can still
      // score 1, while one with only 3 such words cannot win on them alone ("And the word of the LORD came unto him, saying").
      const s = h / Math.min(Math.max(nr[i], 4), ws.length);
      if (s >= .5) out.push(Object.assign(unpack(ix.refs[i]), { score: s, hits: h }));
    }
    out.sort((a, b) => b.score - a.score || b.hits - a.hits);
    // How much of the verse was heard IN ORDER (longest common run of words, a word heard once counting once):
    // a verse read out keeps its word order; an explanation that only shares some of its words does not.
    // ord: share of the verse's words, ordN: how many.
    const hw = Core.keyWords(heard).split(' ').filter(w => w.length >= 3).slice(-45);
    const eq = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5));
    const lcs = (vw, hw) => { const n = hw.length, dp = new Array(n + 1).fill(0);
      for (let a = 1; a <= vw.length; a++) { let prev = 0; for (let b = 1; b <= n; b++) { const t = dp[b]; dp[b] = eq(vw[a - 1], hw[b - 1]) ? prev + 1 : Math.max(dp[b], dp[b - 1]); prev = t; } }
      return dp[n]; };
    // distinctive: in 1500 verses or fewer ("know", "angel"; not "what", "are", "they")
    const usable = w => { const p = ix.words.get(w); return !!p && p.length <= 1500; }, hwU = hw.filter(usable);
    for (const q of out.slice(0, 8)) {
      const vw = Core.keyWords(verse(id, q.book, q.ch, q.v)).split(' ').filter(w => w.length >= 3);
      q.ordN = lcs(vw, hw); q.ord = vw.length ? q.ordN / vw.length : 0;
      // A run made of everyday words ("...when you do not know what they are going through") is ordinary talk, not
      // Zechariah 4:5 read out: at least 3 of the verse's distinctive words must be in it, or it never counts as read out.
      if (q.ordN >= 4 && lcs(vw.filter(usable), hwU) < 3) { q.ordN = 3; q.ord = vw.length ? 3 / vw.length : 0; }
    }
    // A verse that explains fewer of the heard words in order than another one is dropped: the preacher reading on into a
    // longer verse ("And Rehoboam slept with his fathers, and was buried with his fathers...") is not the short one that
    // shares its start ("So David slept with his fathers..."). A verse heard to its end keeps its place unless another
    // explains clearly more (2 words) or as large a share.
    const top = out.slice(0, 8), kw = q => q.kw || (q.kw = Core.keyWords(verse(id, q.book, q.ch, q.v)));
    const keep = top.filter(q => !top.some(r => r.ordN > q.ordN && (r.ord >= q.ord || r.ordN >= q.ordN + 2 || q.ord < .95)));
    keep.sort((a, b) => b.ordN - a.ordN || b.ord - a.ord);
    // Two different verses that fit the words heard so far equally well (parallel passages read half way: "And he did that
    // which was right in the sight of the LORD, according...") cannot be told apart yet: neither may take the screen until
    // more is heard (the next call, 5 words later, usually decides).
    const b0 = keep[0], b1 = keep.find(q => q !== b0 && kw(q) !== kw(b0));
    if (b0 && b1 && b1.ordN === b0.ordN && b0.ordN >= 4 && b0.ord < .95 && b0.ord - b1.ord < .2) for (const q of keep) if (q.ordN === b0.ordN) q.score = Math.min(q.score, .59);
    keep.forEach(q => delete q.kw);
    return keep.concat(out.slice(8)).slice(0, limit || 3);
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

  const Bible = { newRefState, refStep, pieceStep, heardAdd, refKey, parsePartial, validRef, suggestBooks, VERSIONS, BOOKS, bookName, parseRef, refLabel, load, loaded, chapter, verse, chapterCount, ensureIndex, search, quote, findBook };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bible; else root.LFBible = Bible;
})(typeof window !== 'undefined' ? window : globalThis);
