/* Lyric Follow — operator app. Plain JavaScript, no build step, so it runs from a folder or a website. */
(() => {
  'use strict';
  const Core = window.LFCore, Bible = window.LFBible, Store = window.LFStore, Stage = window.LFStage;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const SONG_LANGS = [['ml-IN', 'മലയാളം'], ['ta-IN', 'தமிழ்'], ['en-IN', 'English (India)'], ['en-US', 'English (US)'], ['hi-IN', 'हिन्दी']];
  const LANG_SHORT = { 'ml-IN': 'ML', 'ta-IN': 'TA', 'en-IN': 'EN', 'en-US': 'EN', 'hi-IN': 'HI' };
  const DEF = {
    lang: 'en', mode: 'slide', thr: 50, blankAfter: 8, autoSwitch: true, low: false, net: 'online', v: 6, autoMode: false,
    bgChurch: 'b:navy', bgBible: 'b:slate', church: '',
    theme: { textScale: 1, pos: 'center', shadow: true, color: 'auto' },
    versions: ['mal1910', 'kjv'], vbLang: 'auto', vbAuto: true, bk: 42, gemini: false, geminiKey: '', geminiModel: 'gemini-2.5-flash-lite', groq: false, groqKey: '', groqModel: 'whisper-large-v3', groqBible: false, cfUrl: '', cfKey: '', sarvamKey: '', sarvam: true, sarvamCap: 0, vbAI: true, vbAiCap: 20, followFast: true, micNs: true, trackAuto: false, trackVol: 70, trackSize: 'compact', verseFollow: true, plan: '', ch: 3, autoFollow: true, listenMode: 'songs', psalmMode: false, psalmN: 23, psalmV: 1, quiz: 'show', quizDelay: 4
  };
  const SAMPLES = [
    { title: 'Amazing Grace', lang: 'en-IN', lyrics: "Amazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see\n\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved\nHow precious did that grace appear\nThe hour I first believed" },
    { title: 'യേശുവേ നീ എൻ രക്ഷകൻ (sample)', lang: 'ml-IN', lyrics: 'യേശുവേ നീ എൻ രക്ഷകൻ\nനിൻ സ്നേഹം എന്നും മതിയേ\nഇരുളിൽ നീ എൻ വെളിച്ചം\nഞാൻ നിന്നെ സ്തുതിച്ചിടും\n\nഹാലേലൂയാ പാടിടാം\nനന്ദിയോടെ വാഴ്ത്തിടാം\nഎന്നും നിന്റെ കരുണയിൽ\nആശ്രയിച്ചു ജീവിക്കാം' },
    { title: 'இயேசுவே நீர் என் மீட்பர் (sample)', lang: 'ta-IN', lyrics: 'இயேசுவே நீர் என் மீட்பர்\nஉம் அன்பு என்றும் போதுமே\nஇருளில் நீர் என் வெளிச்சம்\nநான் உம்மை துதிப்பேன்\n\nஅல்லேலூயா பாடுவோம்\nநன்றியோடு போற்றுவோம்\nஎன்றும் உம் கிருபையில்\nநம்பி வாழ்ந்திடுவோம்' }
  ];

  /* ---------- state ---------- */
  let S = JSON.parse(JSON.stringify(DEF));     // settings
  let songs = [];                              // all songs
  let service = [];                            // song ids for today
  const media = new Map();                     // id -> {id,name,type,url}
  let song = null, lines = [], slides = [], slideParts = '', navGen = 0;   // navGen: bumped when the operator moves the screen or opens a song
  const follow = { cur: -1, pend: -1, hits: 0, score: 0 };
  const screen = { kind: 'idle', black: false, bgOnly: false, autoBlank: false, bible: null, quiz: null };
  let tab = 'live', editingId = null, selBg = null;

  /* ---------- text ---------- */
  function t(k) { const d = window.LF_I18N; return (d[S.lang] && d[S.lang][k]) || d.en[k] || k; }
  function applyI18n() {
    document.documentElement.lang = S.lang;
    document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
    document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('sel', b.dataset.lang === S.lang));
  }
  let toastTimer;
  function toast(msg) { const e = $('toast'); e.textContent = msg; e.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => e.classList.remove('show'), 2600); }

  let saveTimer;
  // Several tabs of the app share one settings record. Each tab tells the others what it saved, so an older tab
  // never writes back stale settings over a newer change (seen: a Groq key pasted in one tab was overwritten by
  // another tab still holding the old one).
  const settingsBus = (() => { try { return new BroadcastChannel('lyricfollow-settings'); } catch (e) { return null; } })();
  // Keys and the AI switches carry the time they were last changed (S.keysAt): whichever tab changed them last wins,
  // both when a tab saves (the stored record is read first) and when another tab announces its settings.
  const KEYS = ['groq', 'groqKey', 'groqModel', 'groqBible', 'cfUrl', 'cfKey', 'sarvamKey', 'sarvam', 'gemini', 'geminiKey', 'geminiModel'];
  function saveSettings() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { const kr = await Store.get('keys'); if (kr) { let ch = false; for (const k of KEYS) if (k in kr && kr[k] !== S[k]) { S[k] = kr[k]; ch = true; } if (ch) showKeys(); } } catch (e) {}
      Store.set('settings', S).catch(() => {});
      try { settingsBus && settingsBus.postMessage(JSON.parse(JSON.stringify(S))); } catch (e) {}
    }, 300);
  }
  function showKeys() {
    const set = (id, v, chk) => { const el2 = document.getElementById(id); if (el2) chk ? (el2.checked = !!v) : (el2.value = v || ''); };
    set('stWhOn', S.groq, true); set('stWhKey', S.groqKey); set('stCfUrl', S.cfUrl); set('stCfKey', S.cfKey); set('stSvKey', S.sarvamKey); set('stSvOn', S.sarvam !== false, true); set('stGemOn', S.gemini, true); set('stGemKey', S.geminiKey);
  }
  if (settingsBus) settingsBus.onmessage = e => {
    const n = e.data || {}; if (typeof n !== 'object') return;
    if ((n.keysAt || 0) > (S.keysAt || 0)) { for (const k of KEYS) if (k in n) S[k] = n[k]; S.keysAt = n.keysAt; showKeys(); }
    for (const k of ['plan', 'packs', 'packVer']) if (k in n) S[k] = n[k];
    const pi = document.getElementById('planInput'); if (pi && document.activeElement !== pi) pi.value = S.plan || '';
  };
  function saveService() { Store.set('service', service).catch(() => {}); }

  /* ---------- songs ---------- */
  function parseLyrics(text, parts) {
    // A sheet with the chorus written once is followed (and shown) in the order it is sung: chorus after every verse.
    // Songs from the packs carry their order already (parts).
    let order = null; if (!parts && window.LFTidy && LFTidy.singOrder) { const so = LFTidy.singOrder(text); if (so) { text = so.text; order = so.parts; } }
    const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
    const ls = [], sl = [];
    blocks.forEach((b, si) => { const idx = []; b.forEach(x => { idx.push(ls.length); ls.push({ text: x, slide: si }); }); sl.push(idx); });
    Core.prepare(ls.map(l => l.text)).forEach((p, i) => Object.assign(ls[i], p));
    // Many song sheets put a transliteration (or translation) right under each line. Such a pair is one sung line:
    // the second line becomes an alternative spelling of the first, not a separate step for the follower.
    const indic = t => /[\u0900-\u0DFF]/.test(t), latin = t => /[a-z]/i.test(t) && !indic(t);
    for (let i = 1; i < ls.length; i++) {
      const a = ls[i - 1], b = ls[i];
      if (a.slide !== b.slide || a.alt || !(indic(a.text) && latin(b.text) || latin(a.text) && indic(b.text))) continue;
      const main = indic(a.text) ? a : b, other = main === a ? b : a;
      if (other.key.length < 3) continue;
      main.alts = (main.alts || []).concat([{ key: other.key, g: other.g, sk: other.sk, skb: other.skb, w: other.w, wu: other.wu }]);
      other.alt = true; other.key = ''; other.g = new Set(); other.w = []; other.wu = new Set(); other.main = main === a ? i - 1 : i;
      if (main === b) { b.slideFirst = i - 1; }
    }
    return { ls, sl, order };
  }
  const prepCache = new Map();
  function prepared(s) {
    const k = s.id + ':' + (s.updated || 0);
    if (!prepCache.has(k)) prepCache.set(k, parseLyrics(s.lyrics, s.parts).ls);
    return prepCache.get(k);
  }
  const songById = id => songs.find(s => s.id === id);

  function loadSong(id, opts) {
    // The song already on screen opened again (tapped in the service list, auto-detected, edited): keep its place.
    if (song && song.id === id && follow.cur >= 0 && !(opts && (opts.line != null || opts.restart))) {
      const s2 = songById(id); if (s2 && s2.lyrics === song.lyrics) { song = s2; renderService(); renderLive(); Track.show(song.yt); return; }
    }
    song = songById(id) || null; navGen++;
    // A song the operator opened is trusted like one the audio confirmed: Whisper gets its lyrics as the hint
    // straight away (that is what made it write the lines almost word for word). Songs opened automatically
    // must first be confirmed by the singing.
    if (song && (!opts || opts.restart)) { try { Svc.okId = song.id; Svc.okAt = Date.now() + 10 * 60000; Svc.mineAt = Date.now(); } catch (e) { /* first song at start-up, before Svc exists */ } }
    const p = parseLyrics(song ? song.lyrics : '', song ? song.parts : '');
    lines = p.ls; slides = p.sl; slideParts = p.order ? p.order.join(' ') : (song ? song.parts || '' : '');
    const startLine = opts && opts.line != null && lines[opts.line] ? opts.line : -1;
    follow.cur = startLine; follow.pend = -1; follow.hits = 0; follow.score = 0; if (typeof Lead !== 'undefined') Lead.reset();
    heardKey = ''; lastMatchAt = Date.now(); screen.autoBlank = false; hideSuggest();
    if (!opts || !opts.keepScreen) { screen.kind = song ? 'song' : 'idle'; screen.bgOnly = false; }
    if (song && Listen.mode === 'bible') { S.listenMode = 'songs'; saveSettings(); Listen.start('songs'); }
    else if (Listen.mode === 'songs' && song && Listen.lang !== song.lang) Listen.setLang(song.lang);
    renderService(); renderLive(); output();
    Track.show(song ? song.yt : null);
  }

  /* ---------- screen output ---------- */
  function payload() {
    const p = { black: screen.black };
    if (screen.kind === 'bible' && screen.bible) {
      p.bg = S.bgBible; p.kind = 'bible';
      const r = screen.bible;
      p.items = S.versions.filter(Bible.loaded).map(vid => {
        const v = Bible.VERSIONS.find(x => x.id === vid);
        const parts = [];
        for (let n = r.v; n <= r.ve; n++) { const tx = Bible.verse(vid, r.book, r.ch, n); if (tx) parts.push((r.ve > r.v ? n + ' ' : '') + tx); }
        return { text: parts.join(' '), label: v.short };
      }).filter(x => x.text);
      const lang = S.versions[0] ? Bible.VERSIONS.find(v => v.id === S.versions[0]).lang : 'en';
      p.ref = Bible.refLabel(r, lang) + (lang !== 'en' ? '  ·  ' + Bible.refLabel(r, 'en') : '');
      return p;
    }
    if (screen.kind === 'quiz' && screen.quiz) {
      // the question, then (after the pause the pastor set) the answer, in each language the church shows
      p.bg = S.bgBible; p.kind = 'quiz';
      const q = screen.quiz.q, langs = [...new Set(S.versions.map(v => (Bible.VERSIONS.find(x => x.id === v) || {}).lang).filter(Boolean))];
      if (!langs.length) langs.push('en');
      p.items = langs.map(l => ({ q: q.q[l] || q.q.en, a: screen.quiz.shown ? (q.a[l] || q.a.en) : '' }));
      const [b, c, v] = q.ref, l0 = langs[0];
      p.ref = screen.quiz.shown ? Bible.refLabel({ book: b, ch: c, v, ve: v }, l0) + (l0 !== 'en' ? '  ·  ' + Bible.refLabel({ book: b, ch: c, v, ve: v }, 'en') : '') : '';
      return p;
    }
    if (screen.kind === 'song' && song) {
      p.bg = song.bg || S.bgChurch;
      if (screen.bgOnly || screen.autoBlank || follow.cur < 0 || !lines[follow.cur]) { p.kind = 'blank'; return p; }
      p.kind = 'lyrics';
      const cur = lines[follow.cur];
      if (S.mode === 'pair') { p.lines = [{ t: cur.text, on: true }]; if (lines[follow.cur + 1]) p.lines.push({ t: lines[follow.cur + 1].text, on: false }); }
      else p.lines = slides[cur.slide].map(i => ({ t: lines[i].text, on: S.mode === 'plain' || i === follow.cur || (lines[i].alt && lines[i].main === follow.cur) }));
      return p;
    }
    p.bg = S.bgChurch; p.kind = screen.bgOnly ? 'blank' : 'idle'; p.idle = S.church;
    return p;
  }
  function stageOpts(preview) { return { media, theme: S.theme, low: S.low, preview }; }
  function output() {
    const p = payload();
    Stage.render($('preview'), p, stageOpts(true));
    if (projWin && !projWin.closed) { try { Stage.render(projWin.document.getElementById('stage'), p, stageOpts(false)); } catch (e) {} }
    const st = $('screenState');
    st.textContent = screen.black ? t('black') : p.kind === 'lyrics' ? t('tab_songs') : p.kind === 'bible' ? t('tab_bible') : p.kind === 'quiz' ? t('quiz') : p.kind === 'blank' ? t('bg_only') : t('screen_idle');
    st.classList.toggle('on', !screen.black && (p.kind === 'lyrics' || p.kind === 'bible' || p.kind === 'quiz'));
    $('btnBlack').classList.toggle('on', screen.black);
    $('btnBlack').textContent = screen.black ? t('unblack') : t('black');
    $('btnBgOnly').classList.toggle('on', screen.bgOnly);
    $('btnBgOnly').textContent = screen.bgOnly ? t('text_back') : t('bg_only');
  }

  /* ---------- projector window ---------- */
  let projWin = null, wakeLock = null;
  function openProjector() {
    if (projWin && !projWin.closed) { projWin.focus(); return; }
    projWin = window.open('', 'lfProjector', 'width=1024,height=576');
    if (!projWin) { toast(t('popup_blocked')); return; }
    const d = projWin.document;
    d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Lyric Follow · ${t('projector')}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Latin:wght@500;600;700&family=Anek+Malayalam:wght@500;600;700&family=Anek+Tamil:wght@500;600;700&display=swap">
<style>${Stage.CSS}
html,body{margin:0;height:100%;background:#000;overflow:hidden}
#stage{position:fixed;inset:0}
#fs{position:fixed;right:16px;bottom:16px;font:15px system-ui,sans-serif;padding:10px 16px;border-radius:8px;border:1px solid #555;background:#111;color:#eee;cursor:pointer;z-index:9}
#tip{position:fixed;left:16px;bottom:20px;font:14px system-ui,sans-serif;color:#aaa;z-index:9}
body.full #fs,body.full #tip{display:none} body.full{cursor:none}</style></head>
<body><div id="stage"></div><div id="tip">${t('projector_tip')}</div><button id="fs">${t('fullscreen')}</button></body></html>`);
    d.close();
    d.getElementById('fs').onclick = () => { const r = d.documentElement; (r.requestFullscreen ? r.requestFullscreen() : Promise.reject()).catch(() => {}); };
    d.addEventListener('fullscreenchange', () => d.body.classList.toggle('full', !!d.fullscreenElement));
    d.addEventListener('dblclick', () => d.getElementById('fs').click());
    projWin.addEventListener('keydown', onKey);
    projWin.addEventListener('resize', () => output());
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => { wakeLock = w; }).catch(() => {}); } catch (e) {}
    setTimeout(output, 150); setTimeout(output, 900);
  }

  /* ---------- navigation on screen ---------- */
  function jumpLine(i) {
    if (!lines.length) return;
    navGen++;
    screen.kind = 'song'; screen.bgOnly = false; screen.autoBlank = false;
    i = Math.max(0, Math.min(lines.length - 1, i)); if (lines[i] && lines[i].alt) i = lines[i].main;
    follow.cur = i; follow.pend = -1; heardKey = ''; lastMatchAt = Date.now();
    renderSlides(); output();
  }
  function jumpSlide(dir) {
    if (!lines.length) return;
    navGen++;
    const cur = follow.cur < 0 ? (dir > 0 ? -1 : 0) : lines[follow.cur].slide;
    const s = Math.max(0, Math.min(slides.length - 1, cur + dir));
    jumpLine(slides[s][0]);
  }
  function step(dir) {
    if (screen.kind === 'bible' && screen.bible) {
      const r = screen.bible, n = Bible.chapter(S.versions[0], r.book, r.ch).length || 200;
      let v = (dir > 0 ? r.ve : r.v) + dir, ch = r.ch;
      if (v < 1) { if (ch > 1) { ch--; v = Bible.chapter(S.versions[0], r.book, ch).length || 1; } else v = 1; }
      else if (v > n) { if (ch < Bible.chapterCount(S.versions[0], r.book)) { ch++; v = 1; } else v = n; }
      showBible({ book: r.book, ch, v, ve: v }); return;
    }
    jumpLine(follow.cur + dir);
  }

  /* ---------- render: live ---------- */
  function renderService() {
    const ol = $('service'); ol.innerHTML = '';
    service = service.filter(id => songById(id));
    if (!service.length) { ol.appendChild(el('li', 'empty', t('service_empty'))).style.border = '0'; return; }
    service.forEach((id, i) => {
      const s = songById(id), li = el('li', song && song.id === id ? 'cur' : '');
      const b = el('button', 't', (favs.has(id) ? '★ ' : '') + s.title); b.title = s.title; b.onclick = () => loadSong(id, { restart: true });
      const chip = el('span', 'chip', LANG_SHORT[s.lang] || '');
      const up = el('button', 'ic', '↑'); up.title = t('up'); up.disabled = i === 0;
      up.onclick = () => { [service[i - 1], service[i]] = [service[i], service[i - 1]]; saveService(); renderService(); };
      const dn = el('button', 'ic', '↓'); dn.title = t('down'); dn.disabled = i === service.length - 1;
      dn.onclick = () => { [service[i + 1], service[i]] = [service[i], service[i + 1]]; saveService(); renderService(); };
      const x = el('button', 'ic', '✕'); x.title = t('remove');
      x.onclick = () => { service.splice(i, 1); saveService(); renderService(); };
      li.append(b, chip, up, dn, x); ol.appendChild(li);
    });
  }
  function renderLive() {
    $('liveTitle').textContent = song ? song.title : t('no_song');
    $('liveLang').textContent = song ? (LANG_SHORT[song.lang] || '') : '';
    $('liveLang').hidden = !song; $('btnLiveEdit').hidden = !song;
    renderSlides();
  }
  // "Chorus", "Verse 2" for a tidied song (its parts), otherwise "Slide 3"
  function slideLabel(si) {
    const p = slideParts ? slideParts.split(' ')[si] : '';
    if (!p || !slides || slideParts.split(' ').length !== slides.length) return t('slide') + ' ' + (si + 1);
    return (p === 'C' ? t('part_chorus') : p === 'A' ? t('part_anu') : t('part_verse') + (p.length > 1 ? ' ' + p.slice(1) : '')) + ' · ' + (si + 1);
  }
  function renderSlides() {
    const box = $('slides'); box.innerHTML = '';
    if (!song) { box.appendChild(el('div', 'empty', t('service_empty'))); return; }
    if (!lines.length) { box.appendChild(el('div', 'empty', t('lyrics_hint'))); return; }
    const curSlide = follow.cur >= 0 && lines[follow.cur] ? lines[follow.cur].slide : -1;
    slides.forEach((idx, si) => {
      const d = el('div', 'slide' + (si === curSlide && screen.kind === 'song' ? ' live' : ''));
      const n = el('div', 'n'); n.append(el('span', '', slideLabel(si)), el('span', '', si === curSlide && screen.kind === 'song' ? t('on_screen') : ''));
      d.appendChild(n);
      idx.forEach(i => { const b = el('button', 'ln' + (i === follow.cur ? ' cur' : ''), lines[i].text); b.onclick = () => jumpLine(i); d.appendChild(b); });
      box.appendChild(d);
    });
    const live = box.querySelector('.slide.live');
    if (live && tab === 'live') live.scrollIntoView({ block: 'nearest', behavior: S.low ? 'auto' : 'smooth' });
  }

  /* ---------- render: songs ---------- */
  function fillLangSelect(sel, withAll) {
    sel.innerHTML = '';
    if (withAll) sel.appendChild(new Option(t('all_langs'), ''));
    SONG_LANGS.forEach(([v, n]) => sel.appendChild(new Option(n, v)));
  }
  function bgOptions(sel, withDefault) {
    const v = sel.value; sel.innerHTML = '';
    if (withDefault) sel.appendChild(new Option(t('bg_default'), ''));
    Stage.BUILTIN.forEach(b => sel.appendChild(new Option(b.name, 'b:' + b.id)));
    media.forEach(m => sel.appendChild(new Option(m.name, 'm:' + m.id)));
    sel.value = v;
  }
  function songMatches(s, q, qk) {
    if (!q) return true;
    if (s.title.toLowerCase().includes(q) || s.lyrics.toLowerCase().includes(q)) return true;
    if (qk.length < 3) return false;
    if (!s._k || s._ku !== s.updated) { s._k = Core.key(s.title + ' ' + s.lyrics); s._ku = s.updated; }
    return s._k.includes(qk);
  }
  /* ---------- Favourites: songs this church sings, starred on this device; listed first and found first ---------- */
  let favs = new Set();
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    Store.set('favs', [...favs]).catch(() => {});
    renderSongList(); renderService(); if ($('pickDlg').open) renderPicker(); renderFavBtn();
  }
  function star(id) {
    const st = el('span', 'star' + (favs.has(id) ? ' on' : ''), favs.has(id) ? '★' : '☆');
    st.title = t('favourite'); st.setAttribute('role', 'button');
    st.onclick = e => { e.stopPropagation(); toggleFav(id); };
    return st;
  }
  function addFavOption(sel) { const o = document.createElement('option'); o.value = 'fav'; o.textContent = '★ ' + t('favourites'); sel.insertBefore(o, sel.options[1] || null); }
  function renderFavBtn() { const b = $('sfFav'); if (!b) return; const on = editingId && favs.has(editingId); b.hidden = !editingId; b.textContent = (on ? '★ ' : '☆ ') + t('favourite'); b.classList.toggle('on', !!on); }
  function sortedSongs(q, lang) {
    const ql = (q || '').trim().toLowerCase(), qk = Core.key(ql);
    const onlyFav = lang === 'fav'; if (onlyFav) lang = '';
    return songs.filter(s => (!lang || s.lang === lang) && (!onlyFav || favs.has(s.id)) && songMatches(s, ql, qk))
      .sort((a, b) => (favs.has(b.id) - favs.has(a.id)) || a.title.localeCompare(b.title));
  }
  function renderSongList() {
    const ul = $('songList'); ul.innerHTML = '';
    const list = sortedSongs($('songSearch').value, $('songLangFilter').value);
    if (!list.length) { ul.appendChild(el('li', 'empty', t('no_songs'))); return; }
    list.forEach(s => {
      const li = el('li'), b = el('button', s.id === editingId ? 'sel' : '');
      b.append(star(s.id), el('span', 't', s.title), el('span', 'chip', LANG_SHORT[s.lang] || ''));
      if (s.yt && s.yt.id) b.append(el('span', 'chip yt', '▶'));
      if (service.includes(s.id)) b.append(el('span', 'chip', '✓'));
      b.onclick = () => editSong(s.id);
      li.appendChild(b); ul.appendChild(li);
    });
  }
  function editSong(id) {
    editingId = id || null;
    const s = id ? songById(id) : null;
    $('sfTitle').value = s ? s.title : '';
    $('sfLang').value = s ? s.lang : (S.lang === 'ta' ? 'ta-IN' : S.lang === 'en' ? 'en-IN' : 'ml-IN');
    bgOptions($('sfBg'), true); $('sfBg').value = s ? (s.bg || '') : '';
    $('sfLyrics').value = s ? s.lyrics : '';
    $('sfYt').value = s && s.yt ? Track.link(s.yt) : ''; Track.describe();
    $('sfDelete').hidden = !s; renderFavBtn();
    $('sfService').hidden = !s;
    $('sfService').textContent = s && service.includes(s.id) ? t('in_service') : t('add_to_service');
    $('sfService').disabled = !!(s && service.includes(s.id));
    renderSongList();
    if (!s) $('sfTitle').focus();
  }
  async function saveSong(data, id) {
    const now = Date.now();
    let s = id ? songById(id) : null;
    if (s) { if (data.lyrics != null && data.lyrics !== s.lyrics && !('parts' in data)) s.parts = ''; Object.assign(s, data, { updated: now }); }
    else { s = Object.assign({ id: uid(), bg: '', created: now, updated: now }, data); songs.push(s); }
    await Store.put('songs', { id: s.id, title: s.title, lang: s.lang, lyrics: s.lyrics, bg: s.bg || '', yt: s.yt || null, src: s.src || '', parts: s.parts || '', pk: s.pk || '', created: s.created || now, updated: s.updated });
    songsChanged();
    if (song && song.id === s.id) loadSong(s.id, { keepScreen: true });
    return s;
  }

  /* ---------- Bible ---------- */
  async function ensureVersions() {
    const ids = S.versions.length ? S.versions : ['kjv'];
    await Promise.all(ids.map(id => Bible.load(id).catch(() => null)));
  }
  function renderVChips() {
    const box = $('vchips'); box.innerHTML = '';
    Bible.VERSIONS.forEach(v => {
      const i = S.versions.indexOf(v.id);
      const b = el('button', i >= 0 ? 'sel' : ''); b.type = 'button'; b.title = v.name;
      if (i >= 0) b.appendChild(el('span', 'ord', String(i + 1)));
      b.appendChild(document.createTextNode(v.short));
      b.onclick = async () => {
        const j = S.versions.indexOf(v.id);
        if (j >= 0) { if (S.versions.length > 1) S.versions.splice(j, 1); }
        else { S.versions.push(v.id); if (S.versions.length > 3) S.versions.splice(2, 1); }
        saveSettings(); renderVChips(); await ensureVersions(); renderBibleNav(); output();
      };
      box.appendChild(b);
    });
  }
  function bookLabel(i) {
    const v = Bible.VERSIONS.find(x => x.id === S.versions[0]);
    const lang = S.lang !== 'en' ? S.lang : (v ? v.lang : 'en');
    const loc = Bible.bookName(i, lang), en = Bible.bookName(i, 'en');
    return loc === en ? en : loc + ' · ' + en;
  }
  async function renderBibleNav() {
    const bk = $('bkSel'), ch = $('chSel');
    if (!bk.options.length || bk.dataset.lang !== S.lang + S.versions[0]) {
      bk.innerHTML = ''; Bible.BOOKS.forEach((b, i) => bk.appendChild(new Option(bookLabel(i), i))); bk.dataset.lang = S.lang + S.versions[0];
    }
    bk.value = S.bk;
    const n = Bible.chapterCount(S.versions[0], S.bk);
    if (ch.options.length !== n || ch.dataset.bk !== String(S.bk)) { ch.innerHTML = ''; for (let i = 1; i <= n; i++) ch.appendChild(new Option(i, i)); ch.dataset.bk = S.bk; }
    if (S.ch > n) S.ch = 1;
    ch.value = S.ch;
    const ol = $('verseList'); ol.innerHTML = '';
    const pv = S.versions[0];
    if (!Bible.loaded(pv)) {
      ol.appendChild(el('li', 'empty', t('loading'))); await ensureVersions();
      if (!Bible.loaded(pv)) {   // the data file did not arrive (app server closed?) - say so and offer a retry
        ol.innerHTML = ''; const li = el('li', 'empty'), b = el('button', 'clearbtn', t('version_failed')); b.onclick = () => renderBibleNav(); li.appendChild(b); ol.appendChild(li); return;
      }
    }
    const vs = Bible.chapter(pv, S.bk, S.ch);
    const r = screen.kind === 'bible' ? screen.bible : null;
    vs.forEach((txt, i) => {
      if (!txt) return;
      const li = el('li'), b = el('button', r && r.book === S.bk && r.ch === S.ch && i + 1 >= r.v && i + 1 <= r.ve ? 'cur' : '');
      b.append(el('span', 'vn', String(i + 1)), el('span', '', txt));
      b.onclick = () => showBible({ book: S.bk, ch: S.ch, v: i + 1, ve: i + 1 });
      li.appendChild(b); ol.appendChild(li);
    });
    const cur = ol.querySelector('.cur'); if (cur && tab === 'bible') cur.scrollIntoView({ block: 'nearest' });
  }
  let lastBible = null;
  async function showBible(r) {
    await ensureVersions(); lastBible = r;
    screen.kind = 'bible'; screen.bible = r; screen.bgOnly = false; screen.black = false; screen.autoBlank = false; screen.quiz = null; clearTimeout(quizTimer);
    if (Listen.mode === 'songs') { S.listenMode = 'bible'; saveSettings(); Listen.start('bible'); }
    if (S.bk !== r.book || S.ch !== r.ch) { S.bk = r.book; S.ch = r.ch; saveSettings(); }
    output(); renderBibleNav(); renderSlides();
    document.querySelectorAll('#bsResults button,#heardRefs button,#heardRefs2 button').forEach(b => b.classList.toggle('cur', b.dataset.ref === refKey(r)));
  }
  const refKey = r => `${r.book}.${r.ch}.${r.v}.${r.ve}`;
  function refButton(r, text) {
    const li = el('li'), b = el('button'); b.dataset.ref = refKey(r);
    const lang = (Bible.VERSIONS.find(v => v.id === S.versions[0]) || {}).lang;
    const w = el('span', 'rwrap'); w.append(el('span', 'rref', Bible.refLabel(r, lang)), el('span', 'rt', text || Bible.verse(S.versions[0], r.book, r.ch, r.v)));
    b.appendChild(w); b.onclick = () => showBible(r);
    li.appendChild(b); return li;
  }
  let searchSeq = 0;
  async function bibleSearch(q) {
    const seq = ++searchSeq, out = $('bsResults'), st = $('bsStatus');
    out.innerHTML = '';
    if (!q.trim()) { st.textContent = ''; return; }
    const r = Bible.parseRef(q);
    const pv = S.versions[0];
    st.textContent = t('indexing') + '…';
    let res = [];
    try { res = await BibleBG.call('search', pv, q, 150, p => { if (seq === searchSeq) st.textContent = `${t('indexing')} ${Math.round(p * 100)}%`; }) || []; } catch (e) { res = []; }
    if (seq !== searchSeq) return;
    st.textContent = res.length ? `${res.length}${res.length === 150 ? '+' : ''} ${t('results')}` : (r ? '' : t('no_results'));
    if (r && r.hasVerse) out.appendChild(refButton({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }));
    res.forEach(x => out.appendChild(refButton({ book: x.book, ch: x.ch, v: x.v, ve: x.v })));
  }
  function gotoRef(text) {
    const r = Bible.parseRef(text), msg = $('refMsg');
    if (!r) { msg.textContent = t('ref_bad'); msg.hidden = false; return; }
    msg.hidden = true;
    S.bk = r.book; S.ch = r.ch; saveSettings();
    if (r.hasVerse) showBible({ book: r.book, ch: r.ch, v: r.v, ve: Math.min(r.ve, r.v + 7) }); else renderBibleNav();
  }

  /* ---------- book name suggestions while typing ---------- */
  let sugItems = [], sugIdx = -1;
  function primaryBookName(i) { return Bible.bookName(i, S.lang === 'en' ? 'en' : S.lang); }
  function renderSuggest() {
    const inp = $('refInput'), ul = $('refSuggest'), v = inp.value;
    const typingNumbers = /\S\s+\d/.test(v.trim()) || /\d[:.\s]/.test(v.replace(/^\s*[123]\s*/, ''));
    sugItems = typingNumbers ? [] : Bible.suggestBooks(v, 8);
    if (sugItems.length === 1 && Core.key(primaryBookName(sugItems[0])) === Core.key(v)) sugItems = [];
    ul.innerHTML = ''; sugIdx = sugItems.length ? 0 : -1;
    sugItems.forEach((b, i) => {
      const li = el('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sugIdx));
      const names = ['en', 'ml', 'ta'].map(l => Bible.bookName(b, l));
      const main = primaryBookName(b);
      li.append(el('span', 'bn', main), el('span', 'bo', names.filter(n => n !== main).join(' · ')), el('span', 'bc', Bible.BOOKS[b].ch + ' ' + t('ch_n')));
      li.onmousedown = e => { e.preventDefault(); pickSuggest(i); };
      ul.appendChild(li);
    });
    ul.hidden = !sugItems.length; inp.setAttribute('aria-expanded', String(!ul.hidden));
  }
  function moveSuggest(d) {
    if (!sugItems.length) return;
    sugIdx = (sugIdx + d + sugItems.length) % sugItems.length;
    [...$('refSuggest').children].forEach((li, i) => li.setAttribute('aria-selected', String(i === sugIdx)));
    $('refSuggest').children[sugIdx].scrollIntoView({ block: 'nearest' });
  }
  function hideSuggestBox() { sugItems = []; sugIdx = -1; $('refSuggest').hidden = true; $('refInput').setAttribute('aria-expanded', 'false'); }
  function pickSuggest(i) {
    const b = sugItems[i]; if (b == null) return;
    $('refInput').value = primaryBookName(b) + ' ';
    hideSuggestBox(); $('refInput').focus();
    S.bk = b; S.ch = 1; saveSettings(); renderBibleNav();
  }

  /* ---------- heard references (voice Bible) ---------- */
  const heardRefs = []; let lastRefAt = 0;
  try { for (const h of JSON.parse(sessionStorage.getItem('lf-heard-refs') || '[]')) if (h && h.r) heardRefs.push(h); } catch (e) {}
  function pushHeardRef(r, src, sure, listOnly) {
    const k = refKey(r);
    const prev = heardRefs.find(x => refKey(x.r) === k);
    lastRefAt = Date.now(); if (sure) hunt.lockedAt = lastRefAt;
    if (prev && Date.now() - prev.at < 30000) {
      // Same reference again within half a minute: no duplicate in the list; re-show it only if the screen moved away.
      prev.at = Date.now(); if (sure) prev.sure = true;
      if (S.vbAuto && (sure || prev.sure) && !(screen.kind === 'bible' && screen.bible && refKey(screen.bible) === k)) showBible(r);
      renderHeardRefs(); return;
    }
    heardRefs.unshift({ r, src, at: Date.now(), sure: !!sure }); heardRefs.length = Math.min(heardRefs.length, 10);
    try { sessionStorage.setItem('lf-heard-refs', JSON.stringify(heardRefs)); } catch (e) {}
    renderHeardRefs();
    if (S.vbAuto && sure) { showBible(r); hideAsk(); }
    else if (!sure && Listen.mode === 'bible' && !listOnly) askRef(r);
    else if (listOnly) return;
    else toast(Bible.refLabel(r, 'en'));
  }
  // Unsure reference: a big "Did the preacher say Matthew 5:1?" with Show (Enter) / Ignore (Esc) - one tap, never stuck.
  let asked = null, askTimer = 0;
  function askRef(r) {
    asked = r; const lang = (Bible.VERSIONS.find(v => v.id === S.versions[0]) || {}).lang;
    $('refAskLabel').textContent = Bible.refLabel(r, lang) + (lang === 'en' ? '' : ' · ' + Bible.refLabel(r, 'en'));
    $('refAsk').hidden = false; clearTimeout(askTimer); askTimer = setTimeout(hideAsk, 15000);
  }
  function hideAsk() { asked = null; clearTimeout(askTimer); const b = $('refAsk'); if (b) b.hidden = true; }
  function acceptAsk() { const r = asked; hideAsk(); if (r) { const h = heardRefs.find(x => refKey(x.r) === refKey(r)); if (h) h.sure = true; renderHeardRefs(); showBible(r); } }

  /* ---------- Sermon plan: the passages for today, typed before the service ("Matthew 5; Romans 8:28") ----------
   * Planned books may be heard a little worse and still be found, a planned chapter completes a half-heard
   * reference, planned references show without asking, and each passage is one tap away. */
  let planCache = { text: null, list: [] };
  function planList() {
    if (planCache.text === S.plan) return planCache.list;
    const list = String(S.plan || '').split(/;|\n|,(?=\s*[^\d\s])/).map(x => x.trim()).filter(Boolean)
      .map(x => { const r = Bible.parseRef(x); return r ? { book: r.book, ch: r.ch, v: r.hasVerse ? r.v : 0, ve: r.hasVerse ? r.ve : 0 } : null; }).filter(Boolean);
    planCache = { text: S.plan, list }; return list;
  }
  const planBooks = () => new Set(planList().map(p => p.book));
  const inPlan = r => planList().some(p => p.book === r.book && p.ch === r.ch);
  function renderPlan() {
    const box = $('planChips'); if (!box) return; box.innerHTML = '';
    const lang = (Bible.VERSIONS.find(v => v.id === S.versions[0]) || {}).lang;
    planList().forEach(p => {
      const r = { book: p.book, ch: p.ch, v: p.v || 1, ve: p.v ? p.ve : 1 };
      const b = el('button', '', p.v ? Bible.refLabel(r, lang) : Bible.bookName(p.book, lang) + ' ' + p.ch); b.type = 'button';
      b.onclick = () => { hideAsk(); showBible(r); }; box.appendChild(b);
    });
  }
  function renderHeardRefs() {
    for (const id of ['heardRefs', 'heardRefs2']) {
      const ol = $(id); ol.innerHTML = '';
      heardRefs.forEach(h => { const li = refButton(h.r); const b = li.querySelector('button'); if (!h.sure) b.classList.add('unsure'); if (h.src === 'ai') { b.classList.add('ai'); b.title = t('ai_found'); } ol.appendChild(li); });
      if (heardRefs.length) { const li = el('li'); const b = el('button', 'clearbtn', t('clear_history')); b.onclick = () => { heardRefs.length = 0; renderHeardRefs(); }; li.appendChild(b); ol.appendChild(li); }
    }
    $('heardRefsBox').hidden = !heardRefs.length;
  }

  /* ---------- listening: two engines ----------
   * Offline: open-source Whisper speech model running on this computer (voice engine started by "Start Lyric Follow.bat").
   * Online:  speech recognition built into Chrome / Edge (needs internet).
   * Both feed the same matcher; the operator chooses with the Offline / Online switch in the header. */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LOCAL_PORTS = { ml: 6011, ta: 6012, en: 6013, hi: 6014 };
  const HOSTED = location.protocol === 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const localUrl = lang => 'ws://127.0.0.1:' + (LOCAL_PORTS[String(lang || 'ml').slice(0, 2)] || 6011);
  /* Diagnostics, in memory only (nothing is saved or sent): every recognised text from every listening mode with
   * its times - audio end (clip modes), answer, screen updated - and every hand-over between recognition services. */
  const Diag = {
    log: [], hand: [], clipEnd: 0, prov: '',
    add(e) { this.log.push(e); if (this.log.length > 400) this.log.shift(); },
    handoff(e) { this.hand.push(Object.assign({ at: Date.now() }, e)); if (this.hand.length > 60) this.hand.shift(); }
  };
  let heardKey = '', lastMatchAt = Date.now(), lastSpeechAt = 0, lastEventAt = 0, vbText = '', vbWordsAtQuote = 0;
  let detect = { id: null, n: 0 }, lastDetectAt = 0, suggestId = null, songIx = null, quoteBusy = false;

  // One microphone capture shared by the level meter and the offline engine.
  const Mic = {
    stream: null, ac: null, an: null, proc: null, raf: 0, ring: null, pos: 0, rate: 16000, filled: 0,
    async start() {
      if (this.stream) return true;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: S.micNs !== false, autoGainControl: true, channelCount: 1 } });
      } catch (e) { this.stream = null; return false; }
      const AC = window.AudioContext || window.webkitAudioContext;
      try { this.ac = new AC({ sampleRate: 16000 }); } catch (e) { this.ac = new AC(); }
      this.rate = this.ac.sampleRate;
      const raw = this.ac.createMediaStreamSource(this.stream);
      // Voice band only: cuts hall rumble, hum and the sharp top of claps before anything is recognised.
      const hp = this.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110; hp.Q.value = .7;
      const lp = this.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = .7;
      raw.connect(hp); hp.connect(lp); const src = lp;
      this.an = this.ac.createAnalyser(); this.an.fftSize = 512; src.connect(this.an);
      this.ring = new Float32Array(this.rate * 10); this.pos = 0; this.filled = 0; this.total = 0; this.chunks = [];
      this.proc = this.ac.createScriptProcessor(2048, 1, 1);
      this.proc.onaudioprocess = ev => {
        const d = ev.inputBuffer.getChannelData(0), r = this.ring;
        let e = 0;
        for (let i = 0; i < d.length; i++) { r[this.pos] = d[i]; this.pos = (this.pos + 1) % r.length; e += d[i] * d[i]; }
        this.filled = Math.min(r.length, this.filled + d.length); this.total += d.length;
        this.chunks.push({ end: this.total, n: d.length, rms: Math.sqrt(e / d.length) });
        const keep = this.rate * 10; while (this.chunks.length && this.total - this.chunks[0].end > keep) this.chunks.shift();
      };
      src.connect(this.proc); this.proc.connect(this.ac.destination);
      const buf = new Uint8Array(this.an.fftSize); let last = 0; this.hist = [];
      const tick = ts => {
        if (!this.stream) return;
        if (ts - last > (S.low ? 200 : 70)) {
          last = ts; this.an.getByteTimeDomainData(buf);
          let p = 0; for (const v of buf) { const x = Math.abs(v - 128); if (x > p) p = x; }
          const w = Math.min(100, p / 1.1) + '%'; $('level').style.width = w; $('level2').style.width = w;
          this.health(ts, p);
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
      return true;
    },
    // Microphone health for the operator (never on the projector): over the last 8 s, nothing at all, only a weak
    // signal, or the top of the waveform cut off (the mixer send or input gain is too high).
    health(ts, p) {
      const h = this.hist; h.push([ts, p]); while (h.length && ts - h[0][0] > 8000) h.shift();
      if (ts - (this.hAt || 0) < 1000 || !h.length || ts - h[0][0] < 4000) return;
      this.hAt = ts;
      const max = Math.max(...h.map(x => x[1])), clip = h.filter(x => x[1] >= 126 && ts - x[0] < 3000).length;
      const k = max < 2 ? 'mic_none' : clip >= 3 ? 'mic_clip' : max < 14 ? 'mic_weak' : 'mic_ok';
      if (k === this.hk) return; this.hk = k;
      for (const id of ['micHealth', 'micHealth2']) { const e = $(id); if (e) { e.textContent = t(k); e.className = 'pill mic ' + k; e.hidden = false; } }
    },
    warm() { return !IOS && location.protocol !== 'file:' && S.micWarm !== false; },
    ns(on) { const tr = this.stream && this.stream.getAudioTracks()[0]; if (tr) return tr.applyConstraints({ echoCancellation: false, noiseSuppression: !!on, autoGainControl: true }).then(() => tr.getSettings().noiseSuppression).catch(() => null); return Promise.resolve(null); },
    /** The phrase being sung right now: from the last pause to now. {from, to, ended} in sample counts. */
    phrase() {
      const c = this.chunks; if (!c || c.length < 4) return null;
      const sorted = c.map(x => x.rms).sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length * .2)] || 0;
      const loud = sorted[Math.floor(sorted.length * .9)] || 0;
      const thr = Math.max(.008, floor * 2.2, floor + (loud - floor) * .18);
      const gapN = Math.round(this.rate * .32), maxN = Math.round(this.rate * 7);
      // Claps and bangs: a single chunk far louder than both neighbours is treated as silence.
      for (let k = 1; k < c.length - 1; k++) { const a = c[k - 1].rms, b = c[k + 1].rms; if (c[k].rms > 4 * Math.max(a, b, thr) ) c[k].rms = Math.min(a, b); }
      let i = c.length - 1, trail = 0;
      while (i >= 0 && c[i].rms < thr) { trail += c[i].n; i--; }
      if (i < 0) return null;
      const to = c[i].end; let from = to - c[i].n, gap = 0;
      for (let j = i - 1; j >= 0; j--) {
        if (to - c[j].end + c[j].n > maxN) break;
        if (c[j].rms < thr) { gap += c[j].n; if (gap >= gapN) break; } else gap = 0;
        from = c[j].end - c[j].n;
      }
      return { from: Math.max(from - Math.round(this.rate * .12), this.total - this.filled), to: Math.min(this.total, to + Math.round(this.rate * .15)), ended: trail >= gapN };
    },
    /** Audio between two sample counts, resampled to 16 kHz. */
    slice(from, to) {
      const r = this.ring, n = Math.max(0, Math.min(to - from, this.filled)), out = new Float32Array(n);
      const start = ((this.pos - (this.total - from)) % r.length + r.length) % r.length;
      for (let i = 0; i < n; i++) out[i] = r[(start + i) % r.length];
      if (this.rate === 16000) return out;
      const ratio = this.rate / 16000, m = Math.floor(n / ratio), res = new Float32Array(m);
      for (let i = 0; i < m; i++) res[i] = out[Math.floor(i * ratio)];
      return res;
    },
    /** Last `sec` seconds of audio, resampled to 16 kHz. */
    last(sec) {
      const n = Math.min(this.filled, Math.round(this.rate * sec)), r = this.ring, out = new Float32Array(n);
      let start = (this.pos - n + r.length) % r.length;
      for (let i = 0; i < n; i++) out[i] = r[(start + i) % r.length];
      if (this.rate === 16000) return out;
      const ratio = this.rate / 16000, m = Math.floor(n / ratio), res = new Float32Array(m);
      for (let i = 0; i < m; i++) res[i] = out[Math.floor(i * ratio)];
      return res;
    },
    stop() {
      cancelAnimationFrame(this.raf);
      if (this.stream) this.stream.getTracks().forEach(x => x.stop());
      try { this.proc && this.proc.disconnect(); this.ac && this.ac.close(); } catch (e) {}
      this.stream = this.ac = this.proc = this.an = null;
      $('level').style.width = '0'; $('level2').style.width = '0'; this.hk = ''; for (const id of ['micHealth', 'micHealth2']) { const e = $(id); if (e) e.hidden = true; }
    }
  };

  // Online engine (browser speech recognition). A fresh recogniser is created on every restart: Edge in particular
  // can stop delivering results silently, so a watchdog restarts it when nothing arrives for a while.
  // iPhone/iPad Safari rejects a recogniser that is started from a timer ("not-allowed"): it must be restarted
  // straight away inside the previous session's end event, on the same object, without aborting it.
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const Cloud = {
    rec: null, lang: '', timer: null, fails: 0, unsupported: new Set(), startTimer: null, stalled: false,
    // Some devices (iPhone) only recognise a few languages: fall back to Indian English, which still catches
    // Tamil/Malayalam words well enough for the phonetic matching used everywhere in this app.
    pick(lang) { if (!this.unsupported.has(lang)) return lang; return ['en-IN', 'ta-IN', 'ml-IN', 'en-US'].find(l => !this.unsupported.has(l)) || 'en-US'; },
    start(lang) {
      this.stop(); lang = this.pick(lang); this.lang = lang; Listen.lang = lang; lastEventAt = Date.now();
      const rec = this.rec = new SR();
      rec.lang = lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = S.low ? 1 : 3;
      const alive = () => { lastEventAt = Date.now(); clearTimeout(this.startTimer); };
      rec.onaudiostart = rec.onsoundstart = rec.onspeechstart = alive;
      // If the recogniser never reports that it started (phone browsers do this after a while), try again,
      // and after a few tries ask for a tap - a user gesture is what those browsers need to reopen the microphone.
      clearTimeout(this.startTimer);
      this.startTimer = setTimeout(() => { if (this.rec !== rec || !Listen.mode) return; this.fails++; if (this.fails >= 3) { this.stalled = true; updateListenUI(); setStatus(t('tap_resume'), false); } else this.start(this.lang); }, 5000);
      rec.onstart = () => { alive(); clearTimeout(this.startTimer); this.stalled = false; if (this.fails < 3) updateListenUI(); };
      rec.onresult = e => {
        alive(); if (this.fails >= 3) { this.fails = 0; updateListenUI(); } this.fails = 0;
        let finals = '', interim = [], conf = 0, nconf = 0;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            // Several guesses may arrive for a finished phrase: while singing, keep the one that fits the song best.
            let pick = r[0];
            if (r.length > 1 && Listen.mode === 'songs' && song && lines.length) {
              let bs = -1; for (let a = 0; a < r.length; a++) { const sc = Core.songScore(Core.key(r[a].transcript), lines); if (sc > bs) { bs = sc; pick = r[a]; } }
            }
            finals += ' ' + pick.transcript; if (pick.confidence > 0) { conf += pick.confidence; nconf++; }
          }
          else for (let a = 0; a < r.length; a++) interim.push(r[a].transcript);
        }
        onText(finals, interim, nconf ? conf / nconf : 0.75);
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          // Phones revoke the microphone when the screen locks or the app goes to the background: ask for a tap.
          if (this.fails >= 1 || HOSTED) { this.stalled = true; clearTimeout(this.timer); updateListenUI(); setStatus(t('tap_resume'), false); }
          else { Listen.stop(); toast(t('mic_blocked')); }
          this.fails++;
        }
        else if (e.error === 'language-not-supported') { this.unsupported.add(this.lang); toast(t('lang_unsupported') + ': ' + langName(this.lang)); }
        else if (e.error === 'network') { this.fails++; if (this.fails >= 3) setStatus(navigator.onLine ? t('speech_service_down') : t('no_internet'), false); }
        else if (e.error === 'aborted' || e.error === 'no-speech') { /* normal on phones: the end event restarts it */ }
        else if (e.error === 'audio-capture') { this.fails++; if (this.fails >= 2) { this.stalled = true; updateListenUI(); setStatus(t('tap_resume'), false); } }
      };
      rec.onend = () => {
        if (this.rec !== rec || !Listen.mode || this.stalled) return;
        clearTimeout(this.timer);
        if (IOS && rec.lang === this.pick(this.lang)) { try { rec.start(); lastEventAt = Date.now(); return; } catch (e) {} }
        this.timer = setTimeout(() => { if (this.rec === rec && Listen.mode && !this.stalled) this.start(this.lang); }, Math.min(5000, 150 + this.fails * 1000));
      };
      try { rec.start(); } catch (e) { this.fails++; if (this.fails >= 3) { this.stalled = true; updateListenUI(); setStatus(t('tap_resume'), false); } }
    },
    // Called from a tap on the listen button while stalled: restart with a fresh user gesture.
    resume() { this.fails = 0; this.stalled = false; this.start(this.lang); },
    stop() { clearTimeout(this.timer); clearTimeout(this.startTimer); this.stalled = false; if (this.rec) { const r = this.rec; this.rec = null; try { r.onend = null; r.onresult = null; r.abort(); } catch (e) {} } }
  };

  // Offline engine: cuts the microphone audio at natural pauses and sends each phrase to the local voice engines.
  // One engine per language (started by "Start Lyric Follow.bat"). Songs use the song's language; the preacher's
  // speech goes to the speaker's language AND English, because references are often said in English.
  // Offline Whisper (whisper.cpp's server, started by Start Lyric Follow.bat when "Setup offline Whisper" was run).
  const LOCAL_WHISPER = 'http://127.0.0.1:6020';
  const LocalWh = {
    ok: false,
    async check() {
      if (HOSTED) return false;
      try { const c = new AbortController(), tm = setTimeout(() => c.abort(), 1500); const r = await fetch(LOCAL_WHISPER + '/health', { signal: c.signal, cache: 'no-store' }); clearTimeout(tm); this.ok = r.ok; }
      catch (e) { this.ok = false; }
      if (this.ok && !this.warmed) this.warm();
      return this.ok;
    },
    // The first clip after the engine starts is very slow on some graphics cards (83 s seen on a GTX 1650 while the
    // card prepares its code): send one short clip of near-silence as soon as the engine is seen, before the singing.
    warmed: false,
    async warm() {
      this.warmed = true;
      try {
        const a = new Float32Array(16000); for (let i = 0; i < a.length; i++) a[i] = (Math.random() - .5) * .002;
        const fd = new FormData(); fd.append('file', new Blob([Uint8Array.from(atob(Gemini.wav(a)), c => c.charCodeAt(0))], { type: 'audio/wav' }), 'warm.wav');
        fd.append('response_format', 'json'); fd.append('audio_ctx', '768'); fd.append('temperature_inc', '0');
        await fetch(LOCAL_WHISPER + '/inference', { method: 'POST', body: fd });
      } catch (e) { this.warmed = false; }
    }
  };
  if (!HOSTED) setTimeout(() => LocalWh.check(), 3000);   // finds (and warms up) offline Whisper at start-up
  /** A recognised clip of singing (offline engine): shown as heard, then the service tracker and the line timing. */
  function songClip(text, clipEnd) {
    if (!text || !Listen.mode) return;
    Diag.clipEnd = clipEnd || 0; onText(text, [], .85);
    if (Listen.mode === 'songs') { Trk.heard(text); Lead.heard(text, clipEnd || Date.now()); }
  }
  const Local = {
    conns: {}, timer: null, ok: false, retry: null, sentEnd: -1, sentFinalTo: -1, lang: '', lastMs: 0, fails: 0, guard: null,
    conn(lang) {
      const url = localUrl(lang), c = this.conns[url];
      if (c && c.ws && c.ws.readyState <= 1) return c;
      const me = this.conns[url] = { ws: null, busy: false, final: false, sentAt: 0, url };
      let ws; try { ws = me.ws = new WebSocket(url); } catch (e) { me.ws = null; return me; }
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { if (url === localUrl(this.lang)) { this.ok = true; this.fails = 0; updateListenUI(); } lastEventAt = Date.now(); };
      ws.onmessage = ev => {
        const final = me.final; me.busy = false; lastEventAt = Date.now(); this.lastMs = Date.now() - me.sentAt;
        let txt = ''; try { txt = (JSON.parse(ev.data).text || '').trim(); } catch (e) { txt = String(ev.data || '').trim(); }
        txt = txt.replace(/\[[^\]]*\]|\([^)]*\)?|\*[^*]*\*/g, ' ').replace(/\s+/g, ' ').trim();   // drop "[Music]" style tags
        // Speech models invent filler from background noise: ignore text with too few letters or the usual phrases.
        const letters = (txt.match(/\p{L}/gu) || []).length;
        if (letters < 4 || /^(thank you|thanks for watching|you|bye|okay|subtitles by.*|music)[.!\s]*$/i.test(txt)) return;
        me.conf = .85;
        if (me.clip) { me.clip = false; songClip(txt, me.clipEnd); return; }
        if (me.secondary) {   // English helper engine: only counts when the main engine found nothing in this phrase
          const r = Bible.parseRef(txt, { exactOnly: true, needChapter: true, needVerse: true });
          if (!r) return;
          const sure = r.cue && !r.fuzzy;   // another language's engine: only chapter/verse words make it certain
          if (sure) { if (Listen.mode === 'bible') pushHeardRef({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }, 'ref', true); return; }
          return;   // uncertain hits from another language's engine are ignored (too often mishearings)
        }
        onText(final ? txt : '', [txt], .85);
      };
      ws.onclose = () => { me.ws = null; me.busy = false; if (url === localUrl(this.lang)) { this.ok = false; if (Listen.mode && Listen.engine === 'local') { this.fails++; updateListenUI(); clearTimeout(this.retry); this.retry = setTimeout(() => this.conn(this.lang), 2000); } } };
      ws.onerror = () => { if (url === localUrl(this.lang) && !this.ok && this.fails >= 2) this.fail(); };
      return me;
    },
    start(lang) {
      clearInterval(this.timer); clearTimeout(this.retry);
      this.lang = lang || Listen.lang || 'ml-IN'; this.ok = false; this.fails = 0; this.sentEnd = -1; this.sentFinalTo = -1;
      const c = this.conn(this.lang); if (c.ws && c.ws.readyState === 1) { this.ok = true; }
      this.timer = setInterval(() => this.tick(), 350);
    },
    fail() { setStatus(t('local_missing'), false); },
    pack(a) {
      const head = new DataView(new ArrayBuffer(8));
      head.setInt32(0, 16000, true); head.setInt32(4, a.length * 4, true);
      const msg = new Uint8Array(8 + a.length * 4);
      msg.set(new Uint8Array(head.buffer), 0); msg.set(new Uint8Array(a.buffer, a.byteOffset, a.length * 4), 8);
      return msg.buffer;
    },
    send(c, a, final) {
      if (!c.ws || c.ws.readyState !== 1 || c.busy) return false;
      c.busy = true; c.final = final; c.sentAt = Date.now(); c.ws.send(this.pack(a));
      setTimeout(() => { c.busy = false; }, 8000);   // never wait forever on a slow PC
      return true;
    },
    tick() {
      if (!Mic.stream) return;
      const main = this.conn(this.lang);
      if (!main.ws || main.ws.readyState !== 1) return;
      this.ok = true;
      if (Listen.mode === 'songs' && S.autoFollow) { this.clipTick(main); return; }
      const ph = Mic.phrase(); if (!ph) return;
      const len = ph.to - ph.from, rate = Mic.rate;
      if (len < rate * .5) return;
      if (ph.ended) {
        if (ph.to <= this.sentFinalTo || main.busy) return;
        this.sentFinalTo = ph.to;
        const audio = Mic.slice(ph.from, ph.to);
        this.send(main, audio, true);
        // Preacher mode: every finished phrase also goes to the other language engines, so a reference is found
        // whatever language it was said in (Malayalam sermon with English references, Tamil, mixed).
        if (Listen.mode === 'bible') for (const l of ['ml-IN', 'ta-IN', 'en-IN']) { if (localUrl(l) === localUrl(this.lang)) continue; const c = this.conn(l); c.secondary = true; this.send(c, audio, true); }
        return;
      }
      if (main.busy) return;
      // Slow computers: send live windows less often so the engine keeps up (its own reply time sets the pace).
      const every = Math.max(S.low ? 1.6 : 1.0, Math.min(4, this.lastMs / 1000 * 1.2));
      if (len < rate * 2.5 || Mic.total - this.sentEnd < rate * every) return;
      this.sentEnd = Mic.total; this.send(main, Mic.slice(ph.from, Mic.total), false);
    },
    // Singing: the same clip-by-clip following as Online Whisper (the last 4.5 s, the tracker, the line timing),
    // at the pace the laptop's engine allows - with a graphics card every second or two, faster than Online.
    clipAt: 0,
    clipTick(main) {
      if (main.busy) return;
      const now = Date.now(), every = Math.max(1.2, Math.min(4, this.lastMs / 1000 * 1.15));
      if (now - this.clipAt < every * 1000) return;
      const a = Mic.last(4.5); if (!a.length) return;
      let e = 0; for (let i = 0; i < a.length; i++) e += a[i] * a[i];
      this.clipAt = now; if (Math.sqrt(e / a.length) < .004) return;   // silence
      if (this.send(main, a, true)) { main.clip = true; main.clipEnd = now; }
    },
    stop() {
      clearInterval(this.timer); clearTimeout(this.retry); this.ok = false;
      for (const k of Object.keys(this.conns)) { const c = this.conns[k]; delete this.conns[k]; if (c.ws) { try { c.ws.onclose = null; c.ws.close(); } catch (e) {} } }
    }
  };

  // Automatic spoken-language detection. Uses the language-detecting offline engine (port 6010) when installed;
  // otherwise, when nothing is recognised for a while, it tries the other languages in turn.
  const LangID = {
    ws: null, busy: false, votes: [], lastAt: 0, lastTry: 0, disabled: false,
    conn() {
      if (this.disabled || (this.ws && this.ws.readyState <= 1)) return this.ws;
      const ws = this.ws = new WebSocket('ws://127.0.0.1:6010'); ws.binaryType = 'arraybuffer';
      ws.onmessage = ev => {
        this.busy = false; let lang = ''; try { lang = JSON.parse(ev.data).lang || ''; } catch (e) {}
        this.raw = (this.raw || []).concat(lang).slice(-6);
        // Whisper often labels Malayalam as Sinhala, Khmer, Kannada or Telugu; for this app those all mean Malayalam.
        // Whisper's language guess for Malayalam singing/speech often lands on a neighbouring label.
        lang = ({ si: 'ml', km: 'ml', kn: 'ml', te: 'ml', mn: 'ml', my: 'ml', ml: 'ml', ta: 'ta', en: 'en' })[lang] || '';
        if (!lang) return;
        this.votes.push(lang); this.votes = this.votes.slice(-3);
        const cur = (Listen.lang || '').slice(0, 2);
        if (this.votes.length >= 2 && this.votes.slice(-2).every(v => v === lang) && lang !== cur) this.apply(lang);
      };
      ws.onerror = () => { this.disabled = true; };
      ws.onclose = () => { this.ws = null; };
      return ws;
    },
    apply(lang) {
      const full = lang === 'ml' ? 'ml-IN' : lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      if (Listen.mode === 'bible') { if (S.vbLang === 'auto') { Listen.setLang(full); toast(t('lang_detected') + ': ' + langName(full)); } }
      else if (Listen.mode === 'songs' && S.autoSwitch) { Listen.setLang(full); }
    },
    // Called from the microphone loop: analyse the last finished phrase about every 6 s.
    tick() {
      if (!Listen.mode || this.disabled || !Mic.stream) return;
      const now = Date.now(); if (now - this.lastAt < 6000 || this.busy) return;
      const ws = this.conn(); if (!ws || ws.readyState !== 1) return;
      const ph = Mic.phrase(); if (!ph || !ph.ended || ph.to - ph.from < Mic.rate * 1.5) return;
      this.lastAt = now; this.busy = true; ws.send(Local.pack(Mic.slice(ph.from, ph.to)));
      setTimeout(() => { this.busy = false; }, 8000);
    },
    sample() {},
    stop() { if (this.ws) { try { this.ws.close(); } catch (e) {} } this.ws = null; this.votes = []; }
  };
  setInterval(() => LangID.tick(), 1000);

  // Bulk import of song sheets (.txt/.md/.docx/.pptx). Everything runs in the browser; nothing is uploaded.
  const Bulk = {
    async unzip(buf) {
      const dv = new DataView(buf), u8 = new Uint8Array(buf), files = new Map();
      let eocd = buf.byteLength - 22; while (eocd >= 0 && dv.getUint32(eocd, true) !== 0x06054b50) eocd--;
      if (eocd < 0) throw new Error('zip');
      let n = dv.getUint16(eocd + 10, true), off = dv.getUint32(eocd + 16, true);
      const td = new TextDecoder();
      for (let i = 0; i < n; i++) {
        const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true), loc = dv.getUint32(off + 42, true);
        const name = td.decode(u8.subarray(off + 46, off + 46 + nlen));
        const lnlen = dv.getUint16(loc + 26, true), lelen = dv.getUint16(loc + 28, true), start = loc + 30 + lnlen + lelen;
        const data = u8.subarray(start, start + csize);
        if (/\.xml$/.test(name)) {
          let bytes = data;
          if (method === 8) { const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(data); w.close(); bytes = new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
          files.set(name, td.decode(bytes));
        }
        off += 46 + nlen + elen + clen;
      }
      return files;
    },
    xmlText(x) { return x.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (m, c) => String.fromCharCode(+c)).trim(); },
    /** Returns a list of "paragraph" objects {t, h (heading), pb (page break before)} for any supported file. */
    async paragraphs(file) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.docx')) {
        const z = await this.unzip(await file.arrayBuffer()); const xml = z.get('word/document.xml') || '';
        const out = []; const ps = xml.split(/<w:p[ >]/).slice(1);
        for (const p of ps) {
          const h = /<w:pStyle w:val="(Heading|Title|heading|Ttulo|Titre)/.test(p) || (/<w:b\/>|<w:b w:val="1"\/>/.test(p) && !/<w:r>(?:(?!<w:b).)*<w:t/.test(p));
          const pb = /w:type="page"|<w:lastRenderedPageBreak/.test(p);
          const t = (p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(x => this.xmlText(x)).join('');
          out.push({ t: t.trim(), h: !!h && t.trim().length > 0 && t.trim().length < 80, pb });
        }
        return out;
      }
      if (name.endsWith('.pptx')) {
        const z = await this.unzip(await file.arrayBuffer());
        const slides = [...z.keys()].filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => +a.match(/(\d+)/)[1] - +b.match(/(\d+)/)[1]);
        const out = [];
        for (const k of slides) {
          const xml = z.get(k); const paras = xml.split(/<a:p[ >]/).slice(1).map(p => (p.match(/<a:t>[^<]*<\/a:t>/g) || []).map(x => this.xmlText(x)).join('')).map(x => x.trim()).filter(Boolean);
          if (!paras.length) continue;
          paras.forEach((t, i) => out.push({ t, h: false, pb: i === 0 }));
          out.push({ t: '', h: false, pb: false });
        }
        return out;
      }
      const text = await file.text();
      return text.replace(/\r/g, '').split('\n').map(l => ({ t: l.trim(), h: /^#+\s|^(title|song)\s*[:：]/i.test(l), pb: /^(={3,}|-{3,}|\*{3,}|_{3,})$/.test(l.trim()) }));
    },
    /** Splits paragraphs into songs: at headings, page breaks, separator lines, or 3+ blank lines. */
    split(paras, fallbackTitle) {
      const songs = []; let cur = null, blanks = 0;
      const push = () => { if (cur && cur.lines.join('').trim()) songs.push(cur); cur = null; };
      for (const p of paras) {
        if (!p.t) { blanks++; if (cur) cur.lines.push(''); continue; }
        if (p.h || (p.pb && cur && cur.lines.filter(Boolean).length >= 4) || blanks >= 3) { push(); }
        blanks = 0;
        if (!cur) { cur = { title: p.h ? p.t.replace(/^#+\s*|^(title|song)\s*[:：]\s*/i, '') : '', lines: [] }; if (p.h) continue; }
        cur.lines.push(p.t);
      }
      push();
      for (const s of songs) {
        s.lines = s.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim().split('\n');
        if (!s.title) s.title = s.lines.find(Boolean) || fallbackTitle;
        s.title = s.title.replace(/^\d+[.)]\s*/, '').slice(0, 80);
      }
      return songs.length ? songs : [];
    },
    lang(text) {
      const ml = (text.match(/[\u0D00-\u0D7F]/g) || []).length, ta = (text.match(/[\u0B80-\u0BFF]/g) || []).length, la = (text.match(/[A-Za-z]/g) || []).length;
      return ml >= ta && ml > la / 4 ? 'ml-IN' : ta > la / 4 ? 'ta-IN' : 'en-IN';
    },
    dupKey(s) { return Core.skel(Core.key((s.title + ' ' + (s.lyrics || '').split('\n').filter(Boolean).slice(0, 2).join(' ')).replace(/\(.*?\)/g, ''))).slice(0, 40); },
    async importFiles(files, toService) {
      const st = $('bulkStatus'), list = $('bulkList'); list.innerHTML = ''; let added = 0, dupes = 0;
      const seen = new Set(songs.map(s => this.dupKey(s)));
      for (const f of files) {
        st.textContent = f.name;
        let parts = [];
        try { parts = this.split(await this.paragraphs(f), f.name.replace(/\.[^.]+$/, '')); } catch (e) { const li = el('li', 'empty', f.name + ': ' + t('ref_bad')); list.appendChild(li); continue; }
        for (const p of parts) {
          const tdy = LFTidy.tidy(p.lines.join('\n')), lyrics = (tdy.lyrics || p.lines.join('\n')).trim(); if (lyrics.split('\n').filter(Boolean).length < 2) continue;
          const cand = { title: p.title, lyrics }; const k = this.dupKey(cand);
          if (seen.has(k)) { dupes++; continue; } seen.add(k);
          const s = await saveSong({ title: LFTidy.tidyTitle(p.title) || tdy.title, lang: this.lang(lyrics), bg: '', lyrics, parts: tdy.lyrics ? tdy.parts.join(' ') : '' }, null); added++;
          if (toService && !service.includes(s.id)) service.push(s.id);
          const li = el('li'); const b = el('button', '', `${s.title} · ${langName(s.lang)}`); b.onclick = () => { setTab('songs'); editSong(s.id); }; li.appendChild(b); list.appendChild(li);
        }
      }
      if (toService) saveService();
      rebuildSongIndex(); renderService(); renderSongList();
      st.textContent = `${added} ${t('bulk_done')} · ${dupes} ${t('bulk_dupes')}`;
    }
  };

  // Free song collections from Wikisource (public domain / CC BY-SA). Fetched by the browser from the MediaWiki API
  // when the user asks; each song keeps its page link as the source.
  const Packs = {
    busy: false,
    async api(host, params) { const r = await fetch(`https://${host}/w/api.php?format=json&origin=*&${params}`); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); },
    async category(host, name) {
      let all = [], cont = '';
      for (let i = 0; i < 60; i++) {
        const j = await this.api(host, `action=query&list=categorymembers&cmtitle=${encodeURIComponent(name)}&cmlimit=500&cmtype=page${cont ? '&cmcontinue=' + encodeURIComponent(cont) : ''}`);
        all = all.concat(j.query.categorymembers.map(m => m.title)); if (!j.continue) break; cont = j.continue.cmcontinue;
      }
      return all;
    },
    /** Wikitext of a hymn page -> plain lyric text (verses separated by blank lines). */
    clean(wt) {
      let x = wt.replace(/<!--[\s\S]*?-->/g, '');
      // drop templates ({{header ...}} etc., including nested braces)
      let out = '', depth = 0; for (let i = 0; i < x.length; i++) { if (x.startsWith('{{', i)) { depth++; i++; continue; } if (x.startsWith('}}', i) && depth) { depth--; i++; continue; } if (!depth) out += x[i]; } x = out;
      const poems = [...x.matchAll(/<poem[^>]*>([\s\S]*?)<\/poem>/g)].map(m => m[1]);
      if (poems.length) x = poems.join('\n\n');
      x = x.replace(/^==.*==\s*$/gm, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:[^\s\]]*\s?([^\]]*)\]/g, '$1').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/'{2,}/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
      x = x.split('\n').map(l => l.replace(/^[:*#;]+\s*/, '').replace(/^\d+[.)]\s*/, '').trim()).filter(l => !/^(https?:|\[\[|Category:|വർഗ്ഗം:)/i.test(l)).join('\n');
      x = x.replace(/^\((?:ട്യൂൺ|tune|രാഗം|Tune)[^)]*\)\s*$/gim, '').replace(/\n{3,}/g, '\n\n').trim();
      return x;
    },
    // Song packs shipped with the app (vendor/packs.json): the free collections are part of every copy, so a fresh
    // browser, an incognito window or a new phone has the whole library on first open. Format of a pack file:
    // {name, licence, songs:[{title, lang, lyrics, src}]}. Written in one transaction; duplicates skipped by sound.
    async addPack(pack, st, replace) {
      const seen = new Set(songs.map(s => Bulk.dupKey(s))); const now = Date.now(); const recs = []; let skipped = 0;
      const byTitle = new Map(songs.map(s => [s.title, s]));
      for (const p of pack.songs || []) {
        const lyrics = String(p.lyrics || '').trim(); if (lyrics.split('\n').filter(Boolean).length < 2) continue;
        // An updated bundled pack: the same song gets the new lyrics (same id, so service lists keep it).
        // The song is found by its title (or, after the tidy renamed it, by its earlier text); a song the user edited
        // (its text matches no pack version: not this one, not an earlier one) keeps the user's text.
        const was = new Set(p.was || []);
        const old = replace && (byTitle.get(p.title) || songs.find(s => s.src && s.src === p.src && was.has(LFTidy.hash(s.lyrics))));
        if (old) {
          const ytNew = p.yt && p.yt.id && !(old.yt && old.yt.id);       // a YouTube link was found for it (never replaces the user's own)
          const h = LFTidy.hash(old.lyrics), untouched = old.lyrics === lyrics || was.has(h) || old.pk === h;
          if ((untouched && (old.lyrics !== lyrics || old.title !== p.title || (old.parts || '') !== (p.parts || ''))) || ytNew) {
            if (untouched) Object.assign(old, { title: p.title, lyrics, parts: p.parts || '', pk: LFTidy.hash(lyrics), updated: now });
            if (p.yt && p.yt.id && (ytNew || old.lyrics === lyrics)) old.yt = { id: p.yt.id, start: +p.yt.start || 0, end: +p.yt.end || 0 };
            recs.push(old);
          }
          continue;
        }
        const key = Bulk.dupKey({ title: p.title, lyrics }); if (seen.has(key)) { skipped++; continue; } seen.add(key);
        recs.push({ id: uid(), title: p.title, lang: p.lang || Bulk.lang(lyrics), lyrics, parts: p.parts || '', pk: LFTidy.hash(lyrics), bg: '', yt: p.yt && p.yt.id ? { id: p.yt.id, start: +p.yt.start || 0, end: +p.yt.end || 0 } : null, src: p.src || '', created: now, updated: now });
      }
      if (recs.length) { await Store.putMany('songs', recs); for (const r of recs) if (!songs.includes(r)) songs.push(r); }
      return { added: recs.length, skipped };
    },
    async installLocal(file) {
      if (this.busy) return; this.busy = true; const st = $('packStatus');
      try {
        st.textContent = t('loading');
        const r = await fetch(file, { cache: 'no-cache' }); if (!r.ok) throw new Error(file + ' ' + r.status);
        const res = await this.addPack(await r.json());
        rebuildSongIndex(); renderSongList(); st.textContent = `${res.added} ${t('packs_done')} · ${res.skipped} ${t('packs_skip')}`;
      } catch (e) { st.textContent = 'Pack: ' + e.message; }
      this.busy = false;
    },
    // First run (or a pack added in an update): load every bundled pack that this browser has not got yet.
    async installBundled() {
      let list; try { list = (await (await fetch('vendor/packs.json', { cache: 'no-cache' })).json()).packs || []; } catch (e) { return; }
      const done = S.packs || {}, ver = S.packVer || {}; let total = 0;
      for (const pk of list) {
        const want = pk.v || 1;
        if (done[pk.id] && (ver[pk.id] || 1) >= want) continue;      // new version of a pack: new songs added, changed ones updated
        try { const pack = await (await fetch(pk.file, { cache: 'no-cache' })).json(); const res = await this.addPack(pack, null, !!done[pk.id]); total += res.added; done[pk.id] = Date.now(); ver[pk.id] = want; S.packs = done; S.packVer = ver; saveSettings(); }
        catch (e) { /* offline or missing: tried again next start */ }
      }
      if (total) { rebuildSongIndex(); renderSongList(); renderService(); toast(`${total} ${t('packs_done')}`); }
    },
    async install(which) {
      if (this.busy) return; this.busy = true;
      const st = $('packStatus'); const host = which === 'ml' ? 'ml.wikisource.org' : 'en.wikisource.org';
      const cats = which === 'ml' ? ['വർഗ്ഗം:സമ്പൂർണ്ണ ഗാനങ്ങൾ', 'വർഗ്ഗം:വി. നാഗൽ രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:യുസ്തൂസ് യോസഫ് രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:മോശവത്സലം രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:കെ.വി. സൈമൺ രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:റവ. ടി. കോശി രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:സാധു കൊച്ചു കുഞ്ഞുപദേശി രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:പി.വി. തൊമ്മി രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:റ്റി. ജെ വർക്കി രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:എം.ഇ. ചെറിയാൻ രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:അന്നമ്മ മാമ്മൻ രചിച്ച കീർത്തനങ്ങൾ', 'വർഗ്ഗം:ക്രിസ്തീയ കീർത്തനങ്ങൾ'] : ['Category:Individual Christian hymns'];
      let added = 0, skipped = 0;
      try {
        st.textContent = t('loading');
        let titles = []; for (const c of cats) titles = titles.concat(await this.category(host, c));
        titles = [...new Set(titles)].filter(x => !/^(ക്രിസ്തീയഗീതങ്ങൾ|ഗീതങ്ങൾ \d|കേരളോപകാരി|The |A |An )/.test(x) || which === 'en').filter(x => !/\/|Songbook|Hymnal|Journal|catechism|Poetical Works/i.test(x));
        const seen = new Set(songs.map(s => Bulk.dupKey(s)));
        for (let k = 0; k < titles.length; k += 20) {
          st.textContent = `${Math.min(k + 20, titles.length)} / ${titles.length} · ${added} ${t('packs_done')}`;
          const j = await this.api(host, `action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(titles.slice(k, k + 20).join('|'))}`);
          for (const pg of Object.values(j.query.pages)) {
            const wt = pg.revisions ? pg.revisions[0].slots.main['*'] : ''; if (!wt || /^#REDIRECT/i.test(wt)) continue;
            const lyrics = this.clean(wt); if (lyrics.split('\n').filter(Boolean).length < 3 || lyrics.length > 6000) continue;
            const title = pg.title.replace(/\s*\(.*?\)\s*$/, '');
            const key = Bulk.dupKey({ title, lyrics }); if (seen.has(key)) { skipped++; continue; } seen.add(key);
            await saveSong({ title, lang: Bulk.lang(lyrics), bg: '', lyrics, src: `https://${host}/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}` }, null); added++;
          }
        }
        rebuildSongIndex(); renderSongList();
        st.textContent = `${added} ${t('packs_done')} · ${skipped} ${t('packs_skip')}`;
      } catch (e) { st.textContent = (navigator.onLine ? 'Wikisource: ' + e.message : t('no_internet')); }
      this.busy = false;
    }
  };

  // Backing tracks: a YouTube video (optionally from a start time) played through the official embedded player
  // in the console window - never downloaded. Each song can carry its own link; a bundled list of the
  // Thalaimuraigalin / Thalamurakalude Sangeetham episodes (with chapter times) makes choosing one quick.
  const Track = {
    player: null, ready: false, apiAsked: false, cur: null, catalog: null, pendingPlay: false,
    parse(text) {
      text = String(text || '').trim(); if (!text) return null;
      const m = text.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/) || text.match(/^([\w-]{11})$/);
      if (!m) return null;
      let start = 0; const tm = text.match(/[?&#](?:t|start)=(\d+)(?:s)?/) || text.match(/[?&#]t=(?:(\d+)m)?(\d+)s/);
      if (tm) start = tm.length > 2 ? (+(tm[1] || 0)) * 60 + (+tm[2]) : +tm[1];
      const em = text.match(/[?&#]end=(\d+)/);
      return { id: m[1], start, end: em ? +em[1] : 0 };
    },
    link(yt) { return yt ? `https://youtu.be/${yt.id}?t=${yt.start || 0}${yt.end ? '&end=' + yt.end : ''}` : ''; },
    describe() {
      const yt = this.parse($('sfYt').value), box = $('sfYtInfo');
      box.textContent = yt ? `${yt.id} · ${fmtTime(yt.start)}${yt.end ? '–' + fmtTime(yt.end) : ''} · ${this.chapterName(yt) || ''}` : '';
    },
    chapterName(yt) {
      if (!this.catalog || !yt) return '';
      for (const ser of this.catalog.series) for (const ep of ser.episodes) if (ep.id === yt.id) { const c = ep.c.find(x => x[0] === yt.start); return c ? `${c[1]} (Ep-${ep.ep})` : `Ep-${ep.ep}`; }
      return '';
    },
    async loadCatalog() {
      if (this.catalog) return this.catalog;
      try { this.catalog = await (await fetch('vendor/yt-tracks.json')).json(); } catch (e) { this.catalog = { series: [] }; }
      return this.catalog;
    },
    // --- player ---
    api() {
      if (this.apiAsked) return; this.apiAsked = true;
      window.onYouTubeIframeAPIReady = () => {
        this.player = new YT.Player('ytHost', { width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: { onReady: () => { this.ready = true; this.player.setVolume(S.trackVol); if (this.cur) this.cue(this.cur, false); },
                    onStateChange: e => { this.renderButtons(e.data); } } });
      };
      const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.onerror = () => { $('trackHint').textContent = t('no_internet'); }; document.head.appendChild(sc);
    },
    show(yt) {
      // Same backing track as now (the same song re-opened, or a song sharing the track): keep playing, never restart.
      if (yt && this.cur && this.cur.id === yt.id && (this.cur.start || 0) === (yt.start || 0)) { this.cur = yt; $('trackBox').hidden = false; return; }
      this.cur = yt || null; $('trackBox').hidden = !yt;
      if (!yt) { if (this.ready) try { this.player.stopVideo(); } catch (e) {} return; }
      $('trackName').textContent = this.chapterName(yt) || yt.id; $('trkVol').value = S.trackVol; $('trkSize').value = S.trackSize || 'compact'; $('ytWrap').classList.toggle('compact', (S.trackSize || 'compact') === 'compact');
      // A new backing track is only loaded, paused: it never starts by itself (song opened, auto-switched or
      // restored) - it plays only when Play is pressed.
      this.api(); if (this.ready) this.cue(yt, false);
    },
    cue(yt, play) {
      this.cues = (this.cues || 0) + 1;
      const o = { videoId: yt.id, startSeconds: yt.start || 0 }; if (yt.end) o.endSeconds = yt.end;
      try { this.player.cueVideoById(o); } catch (e) {}
    },
    play() { if (!this.ready) return; try { const st = this.player.getPlayerState(); if (st === 1) this.player.pauseVideo(); else this.player.playVideo(); } catch (e) {} },
    stop() { if (this.ready) try { this.player.stopVideo(); if (this.cur) this.cue(this.cur, false); } catch (e) {} },
    pause() { if (this.ready) try { if (this.player.getPlayerState() === 1) this.player.pauseVideo(); } catch (e) {} },
    renderButtons(state) { $('trkPlay').textContent = state === 1 ? '❚❚' : '▶'; },
    // --- picker ---
    async openPicker(forSong) {
      await this.loadCatalog(); $('trackPicker').hidden = false; $('trkPickSearch').value = ''; this.renderPicker(forSong);
      $('trkPickSearch').oninput = () => this.renderPicker(forSong);
    },
    renderPicker(forSong) {
      const q = Core.key($('trkPickSearch').value), list = $('trkPickList'); list.innerHTML = '';
      for (const ser of this.catalog.series) for (const ep of ser.episodes) {
        const items = ep.c.length ? ep.c : [[0, `Ep-${ep.ep} (${ser.name.split('(')[1] ? ser.name.split('(')[1].replace(')', '') : ''} whole episode)`]];
        for (const [tsec, name] of items) {
          if (q && !Core.key(name).includes(q) && !Core.skel(Core.key(name)).includes(Core.skel(q))) continue;
          const li = el('li'), b = el('button', '', `${name} · Ep-${ep.ep} · ${fmtTime(tsec)}`);
          b.onclick = () => { const yt = { id: ep.id, start: tsec, end: 0 }; $('trackPicker').hidden = true; if (forSong) { $('sfYt').value = this.link(yt); this.describe(); } };
          li.appendChild(b); list.appendChild(li);
        }
      }
    },
    // Attach tracks to every song whose title (or first line) sounds like a chapter name.
    async autoMatch() {
      await this.loadCatalog(); let n = 0;
      const chapters = []; for (const ser of this.catalog.series) for (const ep of ser.episodes) for (const [tsec, name] of ep.c) chapters.push({ id: ep.id, start: tsec, name, k: Core.skel(Core.key(name)) });
      for (const s of songs) {
        if (s.yt) continue;
        const cands = [s.title, (s.lyrics || '').split('\n')[0] || ''].map(x => Core.skel(Core.key(x.replace(/\(.*?\)/g, '')))).filter(x => x.length >= 6);
        let best = null;
        for (const c of chapters) for (const k of cands) { const sc = skelSim(k, c.k); if (sc > .72 && (!best || sc > best.sc)) best = { c, sc }; }
        if (best) { s.yt = { id: best.c.id, start: best.c.start, end: 0 }; await saveSong({ yt: s.yt }, s.id); n++; }
      }
      toast(n ? `${n} ${t('track_matched')}` : t('track_none')); if (song) this.show(song.yt);
      return n;
    }
  };
  function skelSim(a, b) { const A = Core.bigrams(a), B = Core.bigrams(b); return Core.dice(A, Math.max(0, a.length - 1), B, Math.max(0, b.length - 1)); }
  function fmtTime(sec) { sec = +sec || 0; return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
  let userGesture = false; document.addEventListener('pointerdown', () => { userGesture = true; }, { once: true, capture: true });

  // Gemini engine (optional): the microphone audio is sent in short clips to Google's Gemini model with the
  // current song's lyrics and the service list as context. The model answers with the words heard, the lyric line
  // being sung and any Bible reference - it understands Malayalam, Tamil, English and mixtures of them, and sung
  // words in a noisy hall far better than plain speech recognition. Needs the user's own API key (free tier).
  const Gemini = {
    timer: null, busy: false, fails: 0, lastText: '', clipSec: 5, backoffUntil: 0, lastSent: 0,
    start() { this.stop(); this.lastSent = Date.now(); this.tick(); },
    stop() { clearTimeout(this.timer); this.timer = null; },
    tick() {
      if (!Listen.mode || Listen.engine !== 'gemini') return;
      this.timer = setTimeout(() => this.tick(), 500);
      const now = Date.now();
      if (this.busy || now < this.backoffUntil || now - this.lastSent < this.interval(this.cur || this.pick()) * 1000 || !Mic.stream) return;
      const sec = (now - this.lastSent) / 1000 + .4;       // small overlap so words on a clip edge are not lost
      const a = Mic.last(Math.min(sec, 9)); this.lastSent = now;
      let e = 0; for (let i = 0; i < a.length; i++) e += a[i] * a[i];
      if (!a.length || Math.sqrt(e / a.length) < .004) return;      // silence: nothing to send
      this.send(a);
    },
    wav(a) {
      const buf = new ArrayBuffer(44 + a.length * 2), v = new DataView(buf);
      const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
      str(0, 'RIFF'); v.setUint32(4, 36 + a.length * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, a.length * 2, true);
      for (let i = 0; i < a.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, a[i])) * 32767, true);
      let b = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 8192) b += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      return btoa(b);
    },
    prompt() {
      const mode = Listen.mode;
      const lyric = song && mode === 'songs' ? lines.map((l, i) => l.alt ? null : `${i}: ${l.text}${lines[i + 1] && lines[i + 1].alt ? ' / ' + lines[i + 1].text : ''}`).filter(Boolean).join('\n') : '';
      const titles = service.map(id => (songById(id) || {}).title).filter(Boolean).join(' | ');
      return `You transcribe a church service in India. People sing or speak in Malayalam, Tamil or English, often mixed, in a noisy hall with music.
Listen to the audio clip and return JSON only: {"text": words heard in their original script (empty string if no clear words), "line": number, "song": string|null, "ref": string|null}.
"line": if the clip is sung from the CURRENT SONG below, the number of the lyric line being sung (the latest line heard), else -1. Lines may be sung with small differences; match by sound.
"song": if the clip clearly is one of the SERVICE SONGS (by title or lyrics) but not the current song, its title, else null.
"ref": if a Bible reference is spoken (book, chapter and verse in any language, e.g. "യോഹന്നാൻ 3:16", "யோவான் மூன்றாம் அதிகாரம் 16", "John chapter 3 verse 16"), write it in English as "Book chapter:verse", else null.
Mode now: ${mode === 'bible' ? 'PREACHING (expect Bible references and readings)' : 'SINGING'}.
SERVICE SONGS: ${titles || '(none)'}
CURRENT SONG: ${song && mode === 'songs' ? song.title : '(none)'}
${lyric ? 'LYRIC LINES:\n' + lyric : ''}
Previous clip's words: ${this.lastText || '(none)'}`;
    },
    async send(a) {
      this.busy = true; const clipEnd = Date.now();
      const model = S.geminiModel || 'gemini-2.5-flash-lite';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(S.geminiKey)}`;
      const body = { contents: [{ parts: [{ text: this.prompt() }, { inline_data: { mime_type: 'audio/wav', data: this.wav(a) } }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 300 } };
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.status === 429) { this.backoffUntil = Date.now() + 15000; setStatus(t('gemini_quota'), false); return; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json(); this.fails = 0;
        const txt = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text).join('') || '';
        let out = {}; try { out = JSON.parse(txt); } catch (e) { out = { text: txt }; }
        Diag.clipEnd = clipEnd; this.apply(out);
      } catch (e) {
        this.fails++; if (this.fails >= 3) { toast(t('gemini_failed')); Listen.engine = 'cloud'; this.stop(); if (SR) Cloud.start(Listen.lang); updateListenUI(); }
      } finally { this.busy = false; }
    },
    apply(out) {
      if (!Listen.mode) return;
      lastEventAt = Date.now();
      const text = String(out.text || '').trim();
      if (text) { this.lastText = text.slice(-120); onText(text, [], 0.9); }
      if (Listen.mode === 'songs') {
        let ln = Number(out.line);
        // A repeated line (chorus) has several copies: take the copy at or just after the current place, never the first one.
        if (song && Number.isInteger(ln) && ln >= 0 && ln < lines.length && follow.cur >= 0 && lines[ln].key) {
          const same = lines.map((l, i) => i).filter(i => !lines[i].alt && lines[i].key === lines[ln].key);
          if (same.length > 1) ln = same.find(i => i >= follow.cur) ?? same[same.length - 1];
        }
        if (song && Number.isInteger(ln) && ln >= 0 && ln < lines.length && !lines[ln].alt && ln !== follow.cur) {
          follow.cur = ln; follow.pend = -1; follow.hits = 0; lastMatchAt = Date.now(); screen.autoBlank = false;
          if (screen.kind !== 'song') screen.kind = 'song'; screen.bgOnly = false; renderSlides(); output();
        }
        // Another song only when the words are not in the current one (shared lines and choruses never switch).
        const inCur = song && text && Core.songScore(Core.keyWords(text).slice(-90), lines) >= .5;
        if (out.song && S.autoSwitch && !inCur) { const id = service.find(x => (songById(x) || {}).title === out.song); if (id && (!song || id !== song.id)) switchToSong(id, 0); }
      }
      if (out.ref && (Listen.mode === 'bible' || S.autoMode)) { const r = Bible.parseRef(String(out.ref), { exactOnly: true, needChapter: true, needVerse: true }); if (r) { if (Listen.mode === 'songs') setListenMode('bible'); pushHeardRef({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }, 'ref', true); } }
      setStatus(`${Listen.mode === 'bible' ? t('listen_for_bible') : t('listen_for_songs')} · Gemini`, true);
    }
  };

  /* Whisper large-v3 through Groq (open-source model, hosted; free tier ~2000 requests a day): sends a 5-second clip
   * every 4 s. Whisper is trained on singing and music, unlike the browser recogniser, and it is told the lyric lines
   * around the current place (its "prompt"), so it writes the words that are being sung in the song's own spelling.
   * Clips that are silence or music only are not sent, and segments Whisper itself marks as "no speech" are dropped
   * (Whisper otherwise repeats its prompt over instrumental parts). */
  /* Look-ahead for clip-based listening (Whisper, Gemini, offline). A clip arrives 1-4 s after it was sung, so
   * following only what was recognised always lags a line behind. The newest words of each clip say exactly where
   * the singer was when the clip ended (line and word); with the singing speed measured from clip to clip, the
   * next line is shown when the singer reaches it - and at the end of a line, straight away. Never more than one
   * line beyond what was actually heard, so a pause or an instrumental part cannot run the screen away. */
  const Lead = {
    timer: null, spw: 1, lastPos: null, heardJ: -1,   // seconds a word; measured from the singing (Tamil worship songs ~1-2 s)
    reset() { clearTimeout(this.timer); this.timer = null; this.lastPos = null; this.heardJ = -1; this.nSpw = 0; },
    mains() { const m = []; lines.forEach((l, i) => { if (!l.alt && l.key) m.push(i); }); return m; },
    heard(text, clipEnd) {
      if (!song || !lines.length || !S.autoFollow) return;
      const mains = this.mains(); if (!mains.length) return;
      const ci = Math.max(0, mains.indexOf(follow.cur));
      const cand = mains.slice(Math.max(0, ci - 1), ci + 4);          // nearest lines first: current, then ahead
      cand.sort((a, b) => Math.abs(mains.indexOf(a) - ci - .4) - Math.abs(mains.indexOf(b) - ci - .4));
      const pos = Core.place(Core.keyWords(text).split(/\s+/), lines, cand); if (!pos) return;
      const mj = mains.indexOf(pos.j);
      if (mj > ci + 1 && pos.sc < 2.5 && Date.now() - Svc.movedAt < 9000) return;   // 2+ lines ahead needs 3+ matching words (unless stuck)
      // singing speed (seconds per word) from the movement between two clips
      const gw = mains.slice(0, mj).reduce((a, i) => a + (lines[i].w || []).length, 0) + pos.p;
      if (this.lastPos && gw > this.lastPos.gw) { const v = (clipEnd - this.lastPos.t) / 1000 / (gw - this.lastPos.gw); if (v > .12 && v < 3) { this.spw = this.nSpw ? this.spw * .6 + v * .4 : v; this.nSpw = (this.nSpw || 0) + 1; } }
      this.lastPos = { gw, t: clipEnd }; this.heardJ = mj;
      const late = (Date.now() - clipEnd) / 1000;                       // how long ago that clip ended
      // Until this song's own pace is measured, a slow one is assumed: Tamil worship lines run 5-8 s (seen live: the
      // first lines shown 4-5 s early at half a second a word)
      const spw = this.nSpw ? this.spw : Math.max(this.spw, 1.6);
      let left = (pos.n - 1 - pos.p) * spw - late;                     // seconds until this line is finished
      let target = mj;
      // At its end already: show the next line - but a line is never skipped: one not yet shown is shown first.
      // The end of a chorus is not stepped over on timing alone: singers repeat the chorus as often as they like, and
      // the first line of the next verse shown over a repeated chorus is the wrong text for 10 s (seen live, twice).
      // The verse appears when its words are heard (one clip later).
      // The end of a chorus is not stepped over on timing alone: singers repeat the chorus as often as they like, and
      // the next verse's first line shown over a repeated chorus is the wrong text for 10 s (seen live, several times).
      // The verse appears when its words are heard - one clip later. (Verse ends keep the timing: measured, the next
      // slide otherwise shows late or its first line is skipped.)
      const slideEnd = j => { const parts = slideParts ? slideParts.split(' ') : null; const sl = lines[j] && lines[j].slide; if (!parts || sl == null || parts[sl] !== 'C') return false; const nx = mains[mains.indexOf(j) + 1]; return nx != null && lines[nx].slide !== sl; };
      if (left <= .35 && mj + 1 < mains.length && follow.cur >= mains[mj] && !slideEnd(mains[mj])) target = mj + 1;
      else if (left <= .35) left = 1.4;          // a line just put on screen stays long enough to be read (it flashed for 0.1 s before)
      // into another slide on the words of one clip: two words that fit there, not one
      if (target === mj && lines[mains[mj]].slide !== (lines[follow.cur] || {}).slide && pos.sc < 2) return;
      if (mains[target] !== follow.cur && target >= ci - 0) this.go(mains[target], 'lead');
      clearTimeout(this.timer); this.timer = null;
      if (target === mj && mj + 1 < mains.length && !slideEnd(mains[mj])) {
        this.timer = setTimeout(() => {                                  // the singer will reach the next line now
          if (!song || this.heardJ !== mj || follow.cur !== mains[mj]) return;
          this.go(mains[mj + 1], 'timer');
        }, Math.max(150, (left - .2) * 1000));
      }
    },
    moves: [],
    go(i, why) {
      this.moves.push([Math.round(performance.now() / 100) / 10, follow.cur, i, why || '']); if (this.moves.length > 80) this.moves.shift();
      this.ahead = why === 'lead' || why === 'timer' ? { from: follow.cur, to: i, at: Date.now() } : null;
      follow.cur = i; follow.pend = -1; follow.hits = 0; lastMatchAt = Date.now(); screen.autoBlank = false; if (typeof Trk !== 'undefined') Trk.missN = 0;
      if (screen.kind !== 'song') screen.kind = 'song'; screen.bgOnly = false; renderSlides(); output();
    }
  };

  /* Today's service, indexed line by line and word by word (Core.serviceIndex), rebuilt whenever the service list or
   * one of its songs changes. Every recognised clip is looked up in it:
   *  - nothing open yet (or the wrong song open): the service song being sung is opened at the line being sung;
   *  - the right song open but the screen two or more lines behind: it catches up at once;
   *  - another service song clearly sung (two clips running) while the open one no longer fits: it changes song.
   * Otherwise it stays with the song until it ends - shared lines and repeated choruses never switch it. */
  const Svc = {
    ix: null, key: '', other: { id: null, n: 0 }, back: { line: -1, n: 0 }, log: [], okId: null, okAt: 0, movedAt: 0, seenCur: -2,
    index() {
      const key = service.map(id => { const sg = songById(id); return sg ? id + ':' + (sg.updated || 0) : ''; }).join('|');
      if (key !== this.key) { this.key = key; this.ix = Core.serviceIndex(service.map(id => songById(id)).filter(Boolean).map(sg => ({ id: sg.id, lines: prepared(sg) }))); }
      return this.ix;
    },
    track(text) {
      if (!S.autoFollow || !service.length) return;
      if (follow.cur !== this.seenCur) { this.seenCur = follow.cur; this.movedAt = Date.now(); }
      const res = Core.serviceFind(this.index(), Core.keyWords(text).split(/\s+/), 4); const top = res[0]; if (!top) return;
      const mine = song && res.find(r => r.id === song.id);
      this.log.push([Math.round(performance.now() / 100) / 10, (songById(top.id) || {}).title?.slice(0, 10), top.line, +top.score.toFixed(2), mine ? +mine.score.toFixed(2) : null, this.other.n]); if (this.log.length > 60) this.log.shift();
      const nW = Core.keyWords(text).split(/\s+/).filter(w => w.length >= 2).length;
      if (nW < 2) return;                                                  // one word says nothing about the song
      // Singing heard for 25 s and none of it fits the open song: stop trusting it, so Whisper gets no hint from
      // it (a wrong song's lyrics in the hint make Whisper write that song) and the right one can be found.
      if (mine && mine.score >= .35) this.mineAt = Date.now();
      if (song && nW >= 3 && this.okId === song.id) { if (!this.mineAt) this.mineAt = Date.now(); if (Date.now() - this.mineAt > 25000) this.okAt = 0; }
      if (!song || (top.id !== song.id && follow.cur < 0 && top.score >= .6)) { if (top.score >= .6 && nW >= 3) this.open(top.id, top.line); return; }
      if (top.id !== song.id) {
        const fits = mine ? mine.score : 0;
        // Clearly another song: it fits well and much better than the open one (praise songs share many words).
        // Two such clips within 10 s switch (one is enough when it is unmistakable); a weaker clip in between does
        // not reset the count - only a clip where the open song fits as well does.
        const now = Date.now(), clear = top.score >= .6 && (fits < .35 || top.score - fits >= .25);
        if (this.other.id === top.id && now - this.other.at < 10000 && top.score >= .5 && top.score - fits >= .15) this.other = { id: top.id, n: this.other.n + 1, at: now };
        else if (clear) this.other = { id: top.id, n: 1, at: now };
        else if (fits >= top.score - .05 || now - (this.other.at || 0) > 10000) this.other = { id: null, n: 0 };
        if (this.other.id === top.id && (this.other.n >= 2 || (top.score >= .85 && fits < .3))) this.open(top.id, top.line);
        return;
      }
      if (mine && top.score >= .5) this.other = { id: null, n: 0 };
      const stuckNow = Date.now() - this.movedAt > 9000;
      if (top.score < (stuckNow ? .45 : .6)) return;
      this.okId = song.id; this.okAt = Math.max(this.okAt, Date.now()); this.mineAt = Date.now();   // the audio confirms the open song
      // Repeated lines (chorus): of the equally good copies take the first one at or after the current place.
      const good = top.all.filter(x => x[1] >= top.score - .05).map(x => x[0]).sort((a, b) => a - b);
      const ahead = good.find(i => i >= follow.cur), line = ahead != null ? ahead : good[good.length - 1];
      // Catching up 2+ lines needs real evidence: a line found nowhere else in the song, from 3+ heard words, seen in
      // two clips running (or one long, unmistakable clip). Seen live: a single "இயேசுவைத் துதியுங்கள்" (in two
      // lines) jumped a whole verse ahead, and Whisper - given the lyrics there as its hint - kept "confirming" it.
      const nWords = Core.keyWords(text).split(/\s+/).filter(w => w.length >= 2).length;
      // Stuck: the screen has not moved for 9 s while the song goes on (Whisper missed a few lines, seen live: it
      // stayed on line 3 through the chorus and into verse 2). Then the nearest matching line ahead is taken -
      // repeated lines included - once two clips running point ahead.
      const stuck = Date.now() - this.movedAt > 9000;
      if (line >= follow.cur + 2) {
        if ((good.length === 1 && nWords >= 3) || (stuck && nWords >= 2)) {
          const near = this.fwd && Math.abs(this.fwd.line - line) <= 2;
          this.fwd = near ? { line, n: this.fwd.n + 1 } : { line, n: 1 };
          if (this.fwd.n >= 2 || (top.score >= .95 && nWords >= 5)) { this.fwd = null; this.back = { line: -1, n: 0 }; Lead.go(line, 'svc-fwd'); }
        }
        return;
      }
      this.fwd = null;
      // The song started again from the top (common when a song is sung twice): its opening lines, heard twice
      // while the screen is far on, go back on the usual bar.
      if (line <= 3 && follow.cur >= 8 && top.score >= .45) {
        this.back = this.back.line >= 0 && this.back.line <= 4 ? { line, n: this.back.n + 1 } : { line, n: 1 };
        if (this.back.n >= 2) { this.back = { line: -1, n: 0 }; Lead.go(line, 'svc-top'); }
        return;
      }
      if (ahead == null && line <= follow.cur - 3) {                     // song started again / a verse repeated
        this.back = this.back.line === line ? { line, n: this.back.n + 1 } : { line, n: 1 };
        if (this.back.n >= 2) { this.back = { line: -1, n: 0 }; Lead.go(line, 'svc-back'); }
      } else this.back = { line: -1, n: 0 };
    },
    open(id, line) {
      this.other = { id: null, n: 0 }; this.back = { line: -1, n: 0 }; this.okId = id; this.okAt = Date.now();
      if (song && song.id === id) { Lead.go(line, 'svc-open'); return; }
      loadSong(id, { line }); toast(t('sounds_like') + ': ' + songById(id).title);
    }
  };

  /* Today's service tracker for Whisper (Core.trackStep): one place decides the song and the line, any line in
   * either direction - singers repeat lines, go back to the first line between the others (1,2,1,3,1,4…), sing the
   * chorus again or move to another song of the service. Lead still adds the timing (next line as one ends). */
  const Trk = {
    key: '', T: null, st: { song: null, cur: -1 }, lst: {}, offSince: 0, log: [], backOnce: -1,
    index() {
      const ids = service.slice(); if (song && !ids.includes(song.id)) ids.push(song.id);
      const key = ids.map(id => { const sg = songById(id); return sg ? id + ':' + (sg.updated || 0) : ''; }).join('|') + (Lib.ix ? '+lib' + Lib.ver : '');
      if (key !== this.key) { this.key = key; this.T = Core.trackIndex(ids.map(songById).filter(Boolean).map(sg => ({ id: sg.id, lines: prepared(sg) })), Lib.ix); }
      return this.T;
    },
    heard(text) {
      if (!S.autoFollow) return;
      const T = this.index(); if (!T.songs.length) return;
      this.st.song = song ? song.id : null; this.st.cur = follow.cur;
      const c0 = follow.cur, r = Core.trackStep(T, this.st, text), now = Date.now();
      if (!song && this.st.otherTop >= .42) this.fitAt = now;
      this.log.push([Math.round(performance.now() / 100) / 10, c0, text.slice(0, 40), r ? r.line + ' ' + r.why : '', +this.st.mineTop.toFixed(2)]); if (this.log.length > 60) this.log.shift();
      if (song) {
        // The singing fits the open song: keep giving Whisper its lyrics. Clearly another song for 6 s: stop, so
        // Whisper writes what is sung (with the open song's lyrics as the hint it writes that song's words instead).
        if (this.st.mineTop >= .45 || this.st.otherTop >= .42) this.fitAt = now;
      if (this.st.mineTop >= .45) { Svc.okId = song.id; Svc.okAt = Math.max(Svc.okAt, now); Svc.mineAt = now; this.offSince = 0; }
        else if (this.st.words >= 3 && this.st.mineTop < .3) { if (!this.offSince) this.offSince = now; if (now - this.offSince > 6000) Svc.okAt = 0; }
        // Words of the open song heard: the singing is on it, even when the screen does not move (a long line, a slow
        // song, one word a clip). Before, only a move counted, so the screen went blank ("Blank after 8 s") in the
        // middle of a slide and came back 2-3 lines further on. Blanking now needs clips that clearly are not this song.
        if (this.st.mineTop >= .35) { lastMatchAt = now; this.missN = 0; if (screen.autoBlank) { screen.autoBlank = false; output(); } }
        else if (this.st.words >= 2 && this.st.mineTop < .25) this.missN = (this.missN || 0) + 1;
      }
      // Nothing in today's service fits well: look through the whole library (a song the leader started that is not
      // on today's list). Found -> opened and added to today's list; the service songs are tried first always.
      if (Lib.ix && this.st.words >= 2 && !(r && r.why === 'song') && this.st.mineTop < .9 && this.st.otherTop < .9) {
        const skip = new Set(service); if (song) skip.add(song.id);
        const ev = Math.max(0, ...Object.values(this.st.ev || {}));
        const lr = Core.libStep(Lib.ix, this.lst, text, skip, now, Math.max(this.st.mineTop, this.st.otherTop), ev);
        const lt = this.lst.libTop;
        // a library song fits better than the open one: clips at the quick pace until that is settled
        if (lt && lt.s - Math.max(this.st.mineTop, this.st.otherTop) >= .1) this.libAt = now;
        this.log.push([Math.round(performance.now() / 100) / 10, 'lib', lt ? (songById(lt.id) || {}).title + ' ' + lt.s.toFixed(2) : '', lr ? 'FOUND' : (this.lst.libLev ? 'ev ' + this.lst.libLev[1] + ' vs ' + ev.toFixed(2) : '')]);
        if (lr && songById(lr.song)) {
          this.offSince = 0; this.fitAt = now; Svc.okId = lr.song; Svc.okAt = 0; Svc.mineAt = now; this.st.ev = {};
          if (S.autoSwitch === false) showSuggest(lr.song, lr.line);
          else { if (!service.includes(lr.song)) { service.push(lr.song); saveService(); } loadSong(lr.song, { line: lr.line }); toast(t('found_library') + ': ' + songById(lr.song).title); }
          return;
        }
      }
      if (!r) return;
      if (!song || r.song !== song.id) {
        this.lst = {};
        // No lyrics hint for the new song until its own singing confirms it (Trk sets okAt again when a clip fits it
        // well). Seen live: after a switch on weak evidence, the new song's lines in the hint made Whisper write
        // them ("Anbin manatha…") over a different song, and the wrong song confirmed itself.
        this.offSince = 0; Svc.okId = r.song; Svc.okAt = 0; Svc.mineAt = now;
        loadSong(r.song, { line: r.line }); toast(t('sounds_like') + ': ' + songById(r.song).title); return;
      }
      // Lead shows the next line as the singer finishes one, so the clip often still holds the line before the
      // one on screen: that is not the singer going back. Only a second clip running says so.
      if (r.why === 'back' && Lead.ahead && Lead.ahead.to === follow.cur && Lead.ahead.from === r.line && now - Lead.ahead.at < 10000) {
        if (this.backOnce !== r.line) { this.backOnce = r.line; return; }
      }
      // No flicker: going back a line or two to where the screen just was (A -> B -> A within 8 s, a line that
      // appears twice in the song with one or two words heard) waits for a second clip that says so too.
      const lm = Lead.moves[Lead.moves.length - 1];
      if (r.why === 'back' && lm && lm[2] === follow.cur && lm[1] === r.line && performance.now() / 1000 - lm[0] < 8 && this.backOnce !== r.line) { this.backOnce = r.line; return; }
      this.backOnce = -1;
      if (r.line !== follow.cur) Lead.go(r.line, r.why);
    }
  };

  /* Key words for Sarvam (up to 50 per clip): the open song's own words once the singing has confirmed it, otherwise
   * a share from every song of today's service - so the right lyric words are spelt and recognised through the music.
   * Words, not whole lines: Sarvam does not write them out on its own the way Whisper repeats a prompt. */
  /* Sarvam is paid by the second of audio sent (Rs 30 an hour): what was sent today and this month is counted
   * here and shown in Settings, with an optional daily limit after which the free services take over. */
  const SvUse = {
    n: 0, u: null,
    get() {
      let u = this.u; if (!u) { try { u = JSON.parse(localStorage.getItem('lf-sv-use') || '{}'); } catch (e) { u = {}; } }
      const d = new Date(), day = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(), mon = d.getFullYear() + '-' + (d.getMonth() + 1);
      if (u.day !== day) { u.day = day; u.today = 0; } if (u.mon !== mon) { u.mon = mon; u.month = 0; }
      return (this.u = u);
    },
    add(sec) {
      if (!(sec > 0)) return; const u = this.get(); u.today += sec; u.month += sec;
      try { localStorage.setItem('lf-sv-use', JSON.stringify(u)); } catch (e) {}
      if (++this.n % 8 === 0) this.render();
      if (this.over() && !this.warned) { this.warned = true; toast(t('sv_cap_hit')); }
    },
    over() { return (+S.sarvamCap || 0) > 0 && this.get().today >= S.sarvamCap * 60; },
    addAi(rs) { const u = this.get(); if (u.aiDay !== u.day) { u.aiDay = u.day; u.aiToday = 0; } if (u.aiMon !== u.mon) { u.aiMon = u.mon; u.aiMonth = 0; } u.aiToday += rs; u.aiMonth += rs; try { localStorage.setItem('lf-sv-use', JSON.stringify(u)); } catch (e) {} this.render(); },
    aiOver() { const u = this.get(); return (+S.vbAiCap || 0) > 0 && u.aiDay === u.day && u.aiToday >= +S.vbAiCap; },
    render() {
      const el = $('svUse'); if (!el) return; const u = this.get();
      const f = sec => sec < 3600 ? Math.round(sec / 60) + ' min' : (sec / 3600).toFixed(1) + ' h', rs = sec => '₹' + (sec / 3600 * 30).toFixed(sec < 3600 ? 1 : 0);
      const ai = u.aiDay === u.day ? u.aiToday : 0, aim = u.aiMon === u.mon ? u.aiMonth : 0;
      el.textContent = `${t('sv_today')}: ${f(u.today)} (${rs(u.today)}) · ${t('sv_month')}: ${f(u.month)} (${rs(u.month)})` +
        (ai || aim ? ` · ${t('ai_verse')}: ₹${ai.toFixed(2)} / ₹${aim.toFixed(2)}` : '');
    }
  };
  /* Key words for the preacher: book names in the language being preached (most preached books first) and the
   * words for chapter and verse, so Sarvam spells them the way the verse finder knows them. */
  function bibleTerms() {
    // the language chosen for the preacher; "auto": Tamil and Malayalam names side by side
    const lg = S.vbLang !== 'auto' ? String(S.vbLang).slice(0, 2) : '';
    const langs = lg === 'ta' || lg === 'ml' ? [lg] : lg === 'en' ? ['en'] : ['ta', 'ml'];
    const cue = { ml: ['അധ്യായം', 'വാക്യം'], ta: ['அதிகாரம்', 'வசனம்'], en: ['chapter', 'verse'] };
    const pop = [42, 39, 18, 44, 41, 40, 43, 0, 22, 19, 57, 65, 48, 45, 58, 49, 1, 23];
    const order = pop.concat([...Array(66).keys()].filter(i => i >= 39 && !pop.includes(i)), [...Array(39).keys()].filter(i => !pop.includes(i)));
    const out = [].concat(...langs.map(l => cue[l]));
    for (const i of order) for (const L of langs) { const nm = Bible.bookName(i, L); if (nm && !out.includes(nm) && out.length < 50) out.push(nm.slice(0, 64)); }
    return out;
  }
  function sarvamTerms() {
    // Singing: no key words. Measured on a live recording (22 Oct, Alleluya + Enthan): with the song's words as key
    // words Sarvam writes those words over music it cannot make out ("தேவனைத் துதியுங்கள்" for 110 s, "எழும்பினார்",
    // "அக்கினியே" in the wrong verse) and the screen follows them; without, it writes what is sung, misspelt but in order.
    return Listen.mode === 'bible' ? bibleTerms() : [];
  }

  const Whisper = {
    timer: null, busy: false, fails: 0, backoffUntil: 0, lastSent: 0, clipSec: 3.2, sent: 0, left: null, local: false, lastMs: 0, goodRun: 0, cur: null, quiet: 0, sentTo: 0, tlog: [],
    start() { this.stop(); this.fails = 0; this.goodRun = 0; this.quiet = 0; this.sentTo = 0; this.clipSec = 3.2; this.lastSent = Date.now(); Trk.fitAt = Date.now(); this.tick(); },
    stop() { clearTimeout(this.timer); this.timer = null; },
    tick() {
      if (!Listen.mode || Listen.engine !== 'whisper') return;
      this.timer = setTimeout(() => this.tick(), 300);
      const now = Date.now();
      if (this.busy || now < this.backoffUntil || !Mic.stream) return;
      const plan = this.plan(this.cur || this.pick());
      if (now - this.lastSent < plan.every * 1000) return;
      // Only the sound since the last clip (plus a little overlap, so a word cut at the edge is still heard whole):
      // the paid services charge by the second sent, and the same audio sent twice is paid twice.
      const fresh = this.sentTo ? (Mic.total - this.sentTo) / Mic.rate : plan.len;
      const a = Mic.last(Math.max(3, Math.min(plan.len, fresh + plan.overlap))); this.lastSent = now; this.sentTo = Mic.total;
      let e = 0; for (let i = 0; i < a.length; i++) e += a[i] * a[i];
      const r = a.length ? Math.sqrt(e / a.length) : 0;
      // Nothing to hear: a silent room (the clip no louder than the room's own hum) is not sent at all.
      const c = Mic.chunks || [], fl = c.length > 20 ? c.map(x => x.rms).sort((x, y) => x - y)[Math.floor(c.length * .2)] : 0;
      if (r < .004 || (fl < .01 && r < fl * 1.5)) { this.quiet++; return; }
      this.send(a, now);
    },
    /* How often a clip goes out and how long it is ({every, len, overlap} in seconds):
     *  unsure / a switch pending - every 3.2 s, the new 3.2 s + 0.8 s overlap
     *  following with confidence  - about once a sung line (up to 5 s), the last 4.5 s (the line timing fills the gap)
     *  music only (no words in the last clips) - every 4 s, then 5 s; 3.5 s clips
     *  talk / prayer, no song line for 25 s - every 4.5 s, 4 s clips, until a song line is heard again
     * The laptop costs nothing and keeps its own pace with the full 4.5 s window. */
    plan(p) {
      if (p && p.kind === 'laptop') return { every: this.clipSec, len: 4.5, overlap: 4.5 };
      if (Listen.mode !== 'songs') return { every: 3.2, len: 4.5, overlap: 1 };
      // Fast follow (default): a clip every 2.2 s while unsure, the last 4 s each time - the screen catches up
      // about twice as often; about Rs 50-55 an hour of singing instead of Rs 35.
      const fast = S.followFast !== false;
      // (shorter waits than before: seen live, a 6 s wait after a music break or talk was felt as a late screen)
      if (this.quiet >= 4) return { every: 5, len: 3.5, overlap: 0 };
      if (this.quiet >= 1) return { every: 4, len: 3.5, overlap: 0 };
      if (Date.now() - (Trk.fitAt || 0) > 25000) return { every: 4.5, len: 4, overlap: 0 };
      const every = this.interval(p);
      if (fast) return every > 3.3 ? { every: Math.min(every, 3.5), len: 4, overlap: .5 } : { every: 2.2, len: 4, overlap: 1.8 };
      return every > 3.3 ? { every, len: 4.5, overlap: 0 } : { every: 3.2, len: 4.5, overlap: .8 };
    },
    lang() {
      // No song open yet: the main language of today's service (seen live: left to guess, Whisper wrote Tamil
      // singing as English - "Rajani Rajana, Vishnu Rajan" for "இராஜாதி இராஜனாம் இயேசுராஜன்").
      const svcLang = () => { const c = {}; service.forEach(id => { const g = (songById(id) || {}).lang; if (g) c[g] = (c[g] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ''; };
      // The open song's language only once the audio has confirmed that song (a wrong song in another language
      // would otherwise make Whisper write everything in that language, and the right song could not be found).
      const sure = song && Svc.okId === song.id && Date.now() - Svc.okAt < 20000;
      const l = Listen.mode === 'songs' ? (sure ? song.lang : svcLang()) : (S.vbLang === 'auto' ? '' : S.vbLang);
      return String(l || '').slice(0, 2);
    },
    prompt() {
      if (Listen.mode !== 'songs' || !song || !lines.length) return '';
      // Only a song the audio itself has confirmed in the last 12 s gets its lyrics as the hint. Seen live: with the
      // wrong song open, its lyrics in the hint made Whisper write that song's words over a different song, and
      // the wrong song "matched". Without a hint Whisper writes what is sung and the service index finds the song.
      if (!(Svc.okId === song.id && Date.now() - Svc.okAt < 12000)) return '';
      // Before the song has started only its first line is given: with more, Whisper "hears" later lyric words in
      // the noise before the singing (seen live: it jumped to line 4 during the intro).
      const main = lines.filter(l => !l.alt);
      // (Not the opening lines of every service song: seen live, Whisper then writes those lines over talk and music.)
      // Before the song starts: no hint. Seen live: with the first line as the hint, the singing of that line looked
      // exactly like Whisper repeating its hint, was set aside, and the first line was never shown.
      if (follow.cur < 0) return '';
      // The current line only - never lines ahead (nor the line before: a singer going back to it must not look
      // like Whisper repeating its hint). Seen live: with the next two lines in the
      // hint, Whisper wrote them out over music breaks, the screen moved on, the hint moved on with it, and the
      // screen ran a whole verse ahead of the singer. Moving on must come from what is really sung.
      const at = Math.max(0, main.indexOf(lines[follow.cur]));
      return main.slice(at, at + 1).map(l => l.text).join(' ').slice(0, 400);
    },
    /* Where each clip goes. Free services in turn - Groq large-v3, Groq turbo (2000 clips a day each), your
     * Cloudflare Worker (Workers AI whisper-large-v3-turbo, ~214 audio minutes a day free) - and finally Whisper on
     * this laptop (no limit). A service that says "limit reached" is skipped until its limit has passed (kept across
     * reloads); Offline mode uses the laptop only. */
    providers() {
      const groqOk = S.groq && /^gsk_/.test(S.groqKey || ''), cfOk = /^https:\/\//.test(S.cfUrl || ''), svOk = S.sarvam !== false && (S.sarvamKey || '').length > 10 && !SvUse.over();
      const groq = ['whisper-large-v3', 'whisper-large-v3-turbo'];
      if (S.groqModel === 'whisper-large-v3-turbo') groq.reverse();
      const list = [];
      // Sarvam Saaras v4 first when its key is set: built for Indian languages (Tamil, Malayalam, code-mixed), paid.
      if (!this.local && svOk) list.push({ id: 'sarvam', kind: 'sarvam', name: 'Sarvam' });
      if (!this.local) { if (groqOk) groq.forEach(m => list.push({ id: 'groq:' + m, kind: 'groq', model: m, name: 'Groq' })); if (cfOk) list.push({ id: 'cf', kind: 'cf', name: 'Cloudflare' }); }
      list.push({ id: 'laptop', kind: 'laptop', name: t('mode_offline') });
      return list;
    },
    blocked() { try { return JSON.parse(localStorage.getItem('lf-wh-block') || '{}'); } catch (e) { return this._bl || {}; } },
    block(id, ms, why) {
      const b = this.blocked(); b[id] = Date.now() + ms; this._bl = b;
      try { localStorage.setItem('lf-wh-block', JSON.stringify(b)); } catch (e) {}
      const next = this.pick(), from = this.providers().find(q => q.id === id);
      this.paused = { name: from ? from.name : id, why: why || 'quota', at: Date.now() };
      Diag.handoff({ from: id, why: why || 'quota', ms, next: next ? next.id : null });
      toast((why === 'credit' ? (from ? from.name + ': ' : '') + t('key_or_credit') : why === 'down' ? (from ? from.name + ': ' : '') + t('no_answer') : t('whisper_quota')) + (next ? ' → ' + next.name + (next.model ? ' ' + next.model.replace('whisper-', '') : '') : ''));
    },
    pick(skip) {
      const b = this.blocked(), now = Date.now();
      return this.providers().find(p => !(b[p.id] > now) && (p.kind !== 'laptop' || LocalWh.ok) && !(skip && skip.includes(p.id))) || null;
    },
    // Fewer clips to the free services while the screen is following with confidence: one every 6 s instead of every
    // 3.2 s (the line timing fills the gap); back to 3.2 s at once when unsure, before the song starts or when a
    // switch is pending. The laptop has no limit and keeps its own pace.
    interval(p) {
      if (p && p.kind === 'laptop') return this.clipSec;
      const sure = this.goodRun >= 2 && follow.cur >= 0 && !(Trk.st && Trk.st.sw) && Date.now() - Svc.okAt < 15000 && Date.now() - (Trk.libAt || 0) > 10000;
      if (!sure) return 3.2;
      // never longer than about one sung line, so no line is skipped (line length from the measured singing speed)
      const n = (i => (lines[i] && lines[i].w ? lines[i].w.length : 4))(follow.cur), dur = Math.max(2, n) * Lead.spw + .6;
      return Math.max(3.2, Math.min(5, dur));
    },
    async send(a, clipEnd, tried) {
      this.busy = true; tried = tried || [];
      // A service that fails (no credit, busy, no answer): the same clip goes to the next one at once, so the words
      // of these seconds are not lost (measured: 7-14 s without words at a hand-over before).
      const again = async () => { const q = this.pick(tried.concat([p.id])); if (q && tried.length < 2 && Listen.mode && Listen.engine === 'whisper') { this.busy = false; return this.send(a, clipEnd, tried.concat([p.id])); } };
      let p = this.pick(tried);
      if (!p && !LocalWh.ok && await LocalWh.check()) p = this.pick();
      if (!p) { this.busy = false; this.backoffUntil = Date.now() + 10000; setStatus(t('whisper_quota'), false); return; }
      this.cur = p;
      const fd = new FormData();
      fd.append('file', new Blob([Uint8Array.from(atob(Gemini.wav(a)), c => c.charCodeAt(0))], { type: 'audio/wav' }), 'clip.wav');
      fd.append('temperature', '0');
      const lg = this.lang(); if (lg) fd.append('language', lg);
      const pr = p.kind === 'sarvam' ? '' : this.prompt(); if (pr) fd.append('prompt', pr);   // Sarvam: key words instead, nothing to echo
      let url, headers = {};
      if (p.kind === 'groq') { url = 'https://api.groq.com/openai/v1/audio/transcriptions'; headers = { Authorization: 'Bearer ' + S.groqKey }; fd.append('model', p.model); fd.append('response_format', 'verbose_json'); }
      else if (p.kind === 'cf') { url = S.cfUrl; if (S.cfKey) headers = { 'X-Key': S.cfKey }; }
      else if (p.kind === 'sarvam') {
        url = 'https://api.sarvam.ai/speech-to-text'; headers = { 'api-subscription-key': S.sarvamKey };
        fd.append('model', 'saaras:v4'); fd.set('language_code', lg ? lg + '-IN' : 'unknown');
        const kt = sarvamTerms(); if (kt.length) fd.append('keyterms', JSON.stringify(kt));
        fd.delete('language'); fd.delete('temperature');
      }
      else {
        // On the laptop: encode only ~15 s of context instead of Whisper's full 30 s, no retries at higher
        // "temperature", plain json (measured on a GTX 1650: 6.5-12 s a clip -> about 1.2-3 s).
        url = LOCAL_WHISPER + '/inference'; fd.append('response_format', 'json'); fd.append('audio_ctx', '768'); fd.append('temperature_inc', '0');
      }
      const t0 = Date.now(), gen = navGen, cur0 = follow.cur;
      try {
        const r = await fetch(url, { method: 'POST', headers, body: fd });
        if (p.kind === 'laptop') { this.lastMs = Date.now() - t0; this.clipSec = Math.max(1.2, Math.min(4, this.lastMs / 1000 * 1.15)); }
        if (r.status === 429 || (p.kind === 'cf' && r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 403)) {
          const msg = await r.text().catch(() => '');
          // Groq: per minute -> 1 min; audio seconds per hour -> 30 min; per day -> 3 h (rolling), then tried again.
          // Cloudflare: the free allocation resets at 00:00 UTC.
          const day = /per day|RPD|ASD|daily|neuron|allocation/i.test(msg), hour = /per hour|ASH|audio seconds/i.test(msg);
          if (p.kind === 'cf' && day) { const n = new Date(); this.block(p.id, Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1) - Date.now() + 60000, 'quota'); }
          else this.block(p.id, day ? 3 * 3600000 : hour ? 30 * 60000 : 60000, 'quota');
          return await again();
        }
        if (r.status === 401 || r.status === 402 || r.status === 403) { this.block(p.id, 3600000, 'credit'); return await again(); }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json(); this.fails = 0; this.sent++;
        if (p.kind === 'sarvam') SvUse.add(a.length / 16000);
        lastEventAt = Date.now();
        const segs = (j.segments || []).filter(sg => !(sg.no_speech_prob > .6) && !(sg.avg_logprob < -1.2));
        let text = (p.kind === 'groq' && j.segments ? segs.map(sg => sg.text).join(' ') : j.text || j.transcript || '').trim();
        if (/^[\[(（].*[\])）]$/.test(text)) text = '';             // "[Music]", "(இசை)"
        // Whisper's well-known phrases over silence and music (from film subtitles in its training data).
        if (/^(thank you[.!]?|thank you for watching.*|thanks for watching.*|you[.!]?|bye[.!]?|\.+)$|^(subtitles?\b|sous-titr|субтитры|amara\.org)/i.test(text.trim())) text = '';
        if (text && pr && Core.key(text) === Core.key(pr)) text = '';   // only its prompt repeated back
        // Whisper stuck in a loop ("நான் பிசு நான் பிசு நான் பிசு…", seen with turbo on the laptop): a word or two
        // repeated three times or more counts twice at most.
        if (text) text = text.replace(/((?:\S+\s+){0,1}\S+)(?:\s+\1){2,}/gu, '$1 $1');
        // Only words of the hint: over music Whisper writes its hint back (seen live: the hinted line "heard"
        // during the intro moved the screen on, the hint moved on with it, and so on through the song). Such a clip
        // never moves the screen; the singing of a new line (not in the hint) does.
        const echo = !!(text && pr && Listen.mode === 'songs' && Core.echoOf(text, pr));
        this.quiet = text && Core.keyWords(text).replace(/\s+/g, '').length >= 4 ? 0 : this.quiet + 1;
        const got = Date.now();
        // The operator moved the screen or opened a song while this clip was on its way: its words are about the
        // place before, so they do not move the screen now.
        const stale = gen !== navGen;
        if (text && Listen.mode && !echo) {
          this.realAt = Date.now(); onText(text, [], .85);
          if (Listen.mode === 'songs' && !stale) { Trk.heard(text); Lead.heard(text, clipEnd || Date.now()); this.goodRun = Trk.st.mineTop >= .6 ? (this.goodRun || 0) + 1 : 0; }
        } else if (!text) this.goodRun = 0;
        // timing of each clip, in memory only (LF_DEBUG.timing / LF_DEBUG.clips): audio end -> sent -> answer -> screen
        const lm = Lead.moves[Lead.moves.length - 1];
        this.tlog.push({ end: clipEnd || t0, sent: t0, got, done: Date.now(), prov: p.kind, text: text.slice(0, 60), from: cur0, to: follow.cur, why: follow.cur !== cur0 && lm ? lm[3] : '', score: +((Trk.st && Trk.st.mineTop) || 0).toFixed(2), stale, retry: tried.length });
        if (this.tlog.length > 300) this.tlog.shift();
        Diag.add({ eng: 'whisper', prov: p.id, end: clipEnd || t0, sent: t0, got, done: Date.now(), text: text.slice(0, 60), final: true, from: cur0, to: follow.cur, why: follow.cur !== cur0 && lm ? lm[3] : '', retry: tried.length });
        if (text) { if (this.okProv && this.okProv !== p.id) Diag.handoff({ to: p.id, from: this.okProv, gap: got - this.okAt }); this.okProv = p.id; this.okAt = got; }
        // While the singing is clearly going on (a clip with new words in the last 8 s) the hinted line is most
        // likely really being sung, and its timing still shows the next line on time; over a longer break it is not.
        if (echo) { Svc.mineAt = Date.now(); if (follow.cur >= 0 && Date.now() - (this.realAt || 0) < 8000) Lead.heard(text, clipEnd || Date.now()); }
        const pz = this.paused && Date.now() - this.paused.at < 120000 && this.paused.name !== p.name ? this.paused : null;
        setStatus(`${Listen.mode === 'bible' ? t('listen_for_bible') : t('listen_for_songs')} · Whisper (${p.name})` + (pz ? ` · ${pz.name} ${t('paused')}: ${pz.why === 'credit' ? t('key_or_credit') : pz.why === 'down' ? t('no_answer') : t('whisper_quota')}` : ''), true);
      } catch (e) {
        this.fails++;
        // A service that keeps failing (no internet, Worker down, laptop engine stopped) is skipped for 2 minutes -
        // after two failures in a row (three before); this clip is tried on the next service straight away.
        if (this.fails >= 2) {
          this.fails = 0;
          if (p.kind === 'laptop' && this.local && !this.providers().some(q => q.kind !== 'laptop')) { this.stop(); LocalWh.ok = false; Listen.engine = 'local'; Local.start(Listen.lang); updateListenUI(); return; }
          if (p.kind === 'laptop') LocalWh.ok = false; else this.block(p.id, 120000, 'down');
          if (!this.pick() && !this.local) { toast(t('whisper_failed')); Listen.fellAt = Date.now(); Listen.engine = 'cloud'; this.stop(); if (SR) Cloud.start(Listen.lang); updateListenUI(); return; }
        }
        if (p.kind !== 'laptop') return await again();
      } finally { this.busy = false; }
    }
  };

  /* Preacher (Bible) mode with Sarvam Saaras v4 streaming, when a Sarvam key is set: live speech straight from the
   * browser over a WebSocket (key as the sub-protocol), Malayalam/Tamil/English and mixed speech; partial and final
   * text go to the verse finder like the browser recogniser's. */
  const SarvamLive = {
    ws: null, timer: null, sentTo: 0, fails: 0, voiceAt: 0, idleAt: 0, noKt: false,
    start(lang) {
      this.stop();
      if (SvUse.over()) { this.fail(t('sv_cap_hit')); return; }
      const code = S.vbLang === 'auto' ? 'auto' : (lang || S.vbLang || 'ml-IN');
      const q = new URLSearchParams({ model: 'saaras:v4', language_code: code, sample_rate: '16000', encoding: 'linear16', endpointing: 'vad' });
      // Bible book names and the chapter/verse words as key words (dropped again if this endpoint refuses them).
      const kt = this.noKt ? [] : bibleTerms(); if (kt.length) q.set('keyterms', JSON.stringify(kt));
      this.ktTry = kt.length > 0; this.got = false; this.openAt = Date.now();
      let ws; try { ws = this.ws = new WebSocket('wss://api.sarvam.ai/speech-to-text-realtime/ws?' + q, ['api-subscription-key.' + S.sarvamKey]); } catch (e) { this.fail(); return; }
      this.sentTo = Mic.total || 0;
      ws.onopen = () => { this.fails = 0; setStatus(t('listen_for_bible') + ' · Sarvam', true); clearInterval(this.timer); this.timer = setInterval(() => this.pump(), 250); };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        lastEventAt = Date.now();
        if (m.event === 'transcript.partial' && m.text) { this.got = true; onText('', [m.text], .85); }
        else if (m.event === 'transcript.final' && m.text) { this.got = true; onText(m.text, [], .9); }
        else if (m.event === 'error') { this.fails++; if (this.ktTry && !this.got && /keyterm|param|invalid/i.test(JSON.stringify(m))) this.noKt = true; }
      };
      ws.onclose = e => {
        clearInterval(this.timer); this.timer = null;
        if (this.ws !== ws || !(Listen.mode && Listen.engine === 'sarvam')) return;
        this.ws = null; this.fails++;
        // closed straight away with key words in the request, before any text: try again without them
        if (this.ktTry && !this.got && Date.now() - this.openAt < 5000 && !this.noKt) { this.noKt = true; this.fails = Math.max(0, this.fails - 1); }
        // key refused / no credit (4001/4003/1008) or repeated drops: the browser recogniser takes over
        if ([4001, 4003, 1008].includes(e.code)) this.fail(); else if (this.fails >= 3) { this.fail(); Listen.fellAt = Date.now(); }
        else setTimeout(() => { if (Listen.mode && Listen.engine === 'sarvam') this.start(Listen.lang); }, 1500);
      };
    },
    fail(why) { this.stop(); toast(why || ('Sarvam: ' + t('key_or_credit'))); Listen.engine = SR ? 'cloud' : null; if (SR && Listen.mode) Cloud.start(Listen.lang); updateListenUI(); },
    pump() {
      const ws = this.ws; if (!ws || ws.readyState !== 1 || !Mic.stream) return;
      const to = Mic.total; if (to - this.sentTo < Mic.rate * .2) return;
      if (SvUse.over()) { this.fail(t('sv_cap_hit')); return; }
      const from = Math.max(this.sentTo, to - Mic.rate * 2); let a = Mic.slice(from, to); this.sentTo = to;
      // Pauses cost money too: after 1.5 s without a voice nothing is sent (a 0.1 s quiet frame every 5 s keeps the
      // connection open), and when the preacher speaks again the 0.4 s just before is sent with it.
      let e = 0; for (let i = 0; i < a.length; i++) e += a[i] * a[i];
      const r = a.length ? Math.sqrt(e / a.length) : 0, c = Mic.chunks || [];
      const fl = c.length > 20 ? c.map(x => x.rms).sort((x, y) => x - y)[Math.floor(c.length * .2)] : 0, now = Date.now();
      if (r >= Math.max(.006, fl * 2)) { if (now - this.voiceAt > 1500) a = Mic.slice(from - Math.round(Mic.rate * .4), to); this.voiceAt = now; }
      else if (now - this.voiceAt > 1500) {
        if (now - this.idleAt < 5000) return;
        this.idleAt = now; a = new Float32Array(1600);
      }
      SvUse.add(a.length / 16000);
      // Sarvam takes at most 32,000 bytes (1 s) per frame (seen live: "chunk_too_large" after a slow moment): 0.5 s frames.
      for (let o = 0; o < a.length; o += 8000) {
        const part = a.subarray(o, Math.min(a.length, o + 8000));
        const pcm = new Int16Array(part.length); for (let i = 0; i < part.length; i++) { const v = Math.max(-1, Math.min(1, part[i])); pcm[i] = v < 0 ? v * 32768 : v * 32767; }
        const u8 = new Uint8Array(pcm.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        try { ws.send(JSON.stringify({ event: 'audio_input', audio: btoa(bin) })); } catch (e) {}
      }
    },
    stop() {
      clearInterval(this.timer); this.timer = null; const ws = this.ws; this.ws = null;
      if (ws) { try { ws.onclose = null; if (ws.readyState === 1) ws.send(JSON.stringify({ event: 'end' })); ws.close(); } catch (e) {} }
    }
  };

  const Listen = {
    mode: null, lang: '', engine: null,
    async start(mode) {
      mode = mode || S.listenMode;
      // Online: Whisper large-v3 (Groq) for singing - the browser recogniser only understands speech, not songs;
      // preaching stays on the browser recogniser (streaming, no daily limit) unless chosen for it too.
      const wantWhisper = ((S.groq && (/^gsk_/.test(S.groqKey || '') || /^https:\/\//.test(S.cfUrl || ''))) || (S.sarvam !== false && (S.sarvamKey || '').length > 10)) && ((mode || S.listenMode) === 'songs' || S.groqBible);
      let engine = S.net === 'online' ? (wantWhisper ? 'whisper' : S.gemini && S.geminiKey ? 'gemini' : 'cloud') : 'local';
      // Preacher with a Sarvam key: Sarvam's live recogniser (Indian languages, mixed speech).
      if (S.net === 'online' && mode === 'bible' && S.sarvam !== false && (S.sarvamKey || '').length > 10) engine = 'sarvam';
      // Opened from the web address (phone/tablet): the offline engines live on the laptop and a secure page
      // cannot reach them, so listening uses the device's own online recogniser here.
      if (engine === 'local' && HOSTED) { toast(t('local_hosted')); S.net = 'online'; saveSettings(); renderNet(); engine = 'cloud'; }
      if (engine === 'cloud' && !SR) { toast(t('need_chrome')); return; }
      // Offline singing: Whisper on this laptop (whisper.cpp) when it is installed - it follows like Online.
      if (engine === 'local' && mode === 'songs' && await LocalWh.check()) engine = 'whisper';
      Whisper.local = engine === 'whisper' && S.net !== 'online'; Whisper.cur = null; this.fellAt = 0;
      this.stopEngines();
      this.mode = mode; this.engine = engine;
      // The song on screen when listening starts was chosen by the operator (or kept from last time): it is trusted
      // like one just opened, so Whisper gets its lyrics as the hint at once. Seen live: a song restored at start-up
      // was never trusted, Whisper got no hint, its half-right words never confirmed the song - and so on.
      if (mode === 'songs' && song) { Svc.okId = song.id; Svc.okAt = Date.now() + 10 * 60000; Svc.mineAt = Date.now(); }
      this.lang = mode === 'songs' ? (song ? song.lang : 'ml-IN') : (S.vbLang === 'auto' ? (this.lastBibleLang || { ml: 'ml-IN', ta: 'ta-IN', en: 'en-IN' }[S.lang] || 'ml-IN') : S.vbLang);
      lastEventAt = Date.now(); hunt.i = 0; hunt.at = Date.now();
      // The offline engine needs the audio itself; the online one only needs the meter (skip it when opened as a file).
      // Laptop: the microphone also feeds the level meter and language detection. iPhone/iPad: keeping the
      // microphone open makes Safari treat the page as "already capturing", so the recogniser may restart itself.
      if (engine === 'local' || engine === 'gemini' || engine === 'whisper' || engine === 'sarvam' || (!HOSTED && location.protocol !== 'file:') || IOS) {
        this.waitingMic = true; updateListenUI();
        const ok = await Mic.start();
        this.waitingMic = false;
        if (!ok && engine !== 'cloud') { this.mode = null; updateListenUI(); toast(t('mic_blocked')); return; }
      }
      if (!this.mode) return;
      if (engine === 'cloud') Cloud.start(this.lang); else if (engine === 'gemini') Gemini.start(); else if (engine === 'whisper') Whisper.start(); else if (engine === 'sarvam') SarvamLive.start(this.lang); else Local.start(this.lang);
      updateListenUI();
    },
    setLang(lang) { if (this.lang === lang) return; this.lang = lang; if (this.mode === 'bible') this.lastBibleLang = lang; if (!this.mode) return; if (this.engine === 'cloud') Cloud.start(lang); else if (this.engine === 'local') Local.start(lang); else if (this.engine === 'sarvam' && S.vbLang !== 'auto') SarvamLive.start(lang); updateListenUI(); },
    stopEngines() { Cloud.stop(); Local.stop(); Gemini.stop(); Whisper.stop(); SarvamLive.stop(); },
    // The microphone stays open between songs on a laptop: the browser's automatic gain and noise filter take
    // several seconds to settle, and the clip cutter learns the room's noise floor - a fresh start for every song
    // made the first lines of each run worse than a second run of the same song.
    stop() { this.mode = null; this.stopEngines(); LangID.stop(); if (!Mic.warm()) Mic.stop(); screen.autoBlank = false; updateListenUI(); output(); }
  };

  // Watchdog: restart a recogniser that has gone quiet; find the spoken language when the recogniser needs one.
  // The online recogniser understands one language at a time, so in "auto" it tries Malayalam, Tamil and English
  // in turn (a few seconds each) until a verse or song line is recognised, locks on that language, and only
  // starts looking again after a long stretch of speech without any match. The offline language detector, when
  // it is running, picks the language directly (LangID.apply).
  const hunt = { i: 0, at: 0, lockedAt: 0, misses: 0 };
  function huntLangs() {
    if (Listen.mode === 'songs') {
      const langs = [...new Set([song && song.lang, ...service.map(id => (songById(id) || {}).lang)].filter(Boolean))];
      return langs.length ? langs : ['ml-IN'];
    }
    const pref = Listen.lastBibleLang || { ml: 'ml-IN', ta: 'ta-IN', en: 'en-IN' }[S.lang] || 'ml-IN';
    return [pref, ...['ml-IN', 'ta-IN', 'en-IN'].filter(l => l !== pref)];
  }
  // Evidence from each recognised phrase: a verse or song match locks the current language; weak results count as misses.
  function huntEvidence(matched, conf, words) {
    const now = Date.now();
    if (matched) { hunt.lockedAt = now; hunt.misses = 0; return; }
    if (words >= 2 && conf < .6) hunt.misses++;
  }
  setInterval(() => {
    if (!Listen.mode) return;
    const now = Date.now();
    // A recogniser that has delivered nothing for a long while is restarted. Singing over music often gives no words
    // for a stretch, and every restart loses a second of audio, so the singing mode waits longer.
    if (Listen.engine === 'cloud' && Cloud.rec && now - lastEventAt > (Listen.mode === 'songs' ? 25000 : 12000)) Cloud.start(Cloud.lang);
    // Fell back to the browser recogniser because Sarvam could not be reached (network drop, server busy): try
    // Sarvam again every 2 minutes - the browser one does not follow singing (seen live: stuck on it all evening).
    if (Listen.engine === 'cloud' && Listen.fellAt && now - Listen.fellAt > 125000 && navigator.onLine !== false && !Listen.waitingMic) { Listen.fellAt = 0; Listen.start(Listen.mode); return; }
    const auto = Listen.mode === 'bible' ? S.vbLang === 'auto' : S.autoSwitch;
    if (!auto || Listen.engine === 'gemini' || Listen.engine === 'whisper') return;      // these understand every language at once
    if (!LangID.disabled && LangID.ws && LangID.ws.readyState === 1) return;      // offline detector decides
    const langs = huntLangs().filter(l => Listen.engine !== 'cloud' || !Cloud.unsupported.has(l)); if (langs.length < 2) return;
    // Without the microphone meter (phones) there is no way to know whether someone is speaking: keep rotating.
    // Singing: only change language when the recogniser IS writing words and none of them fit the songs. Music, an
    // instrumental part or silence gives no words - switching then only cuts the recogniser off mid-line (seen live:
    // ml/ta swapped every 6 s through a whole song and nothing was recognised).
    const songs = Listen.mode === 'songs';
    const speaking = songs ? now - lastSpeechAt < 6000 : (Mic.stream ? now - lastSpeechAt < 5000 : true);
    const lastHit = Listen.mode === 'bible' ? hunt.lockedAt : Math.max(lastMatchAt, hunt.lockedAt);
    const locked = now - lastHit < (songs ? 20000 : 25000);
    const dwell = Listen.engine === 'cloud' ? (Listen.mode === 'bible' ? 4000 : 12000) : 10000;
    // Singing and nothing recognised for 15 s in another language: go back to the open song's language.
    if (songs && song && Listen.lang !== song.lang && now - lastSpeechAt > 15000 && now - hunt.at > 15000) { hunt.at = now; Listen.setLang(song.lang); return; }
    if (!locked && speaking && (now - hunt.at > dwell || hunt.misses >= 2)) {
      hunt.misses = 0; hunt.at = now;
      const cur = langs.indexOf(Listen.lang); hunt.i = (cur + 1) % langs.length;
      Listen.setLang(langs[hunt.i]);
    }
  }, 1000);

  // When served from the laptop's own window, notice if that window was closed (data files stop arriving).
  if (!HOSTED && location.protocol !== 'file:') {
    let down = false;
    setInterval(async () => {
      let ok = true;
      try { const r = await fetch('manifest.webmanifest?ping=' + Date.now(), { cache: 'no-store' }); ok = r.ok; } catch (e) { ok = false; }
      if (ok === down) { down = !ok; $('srvWarn').hidden = !down; if (down) $('srvWarn').textContent = t('server_down'); else if (tab === 'bible') renderBibleNav(); }
    }, 10000);
  }
  function setStatus(txt, live) { $('statusText').textContent = txt; $('dot').classList.toggle('live', !!live); }
  function langName(l) { return (SONG_LANGS.find(x => x[0] === l) || [, l])[1]; }
  function updateListenUI() {
    const on = !!Listen.mode, vb = S.listenMode === 'bible', cloud = S.net === 'online';
    const disabled = cloud && !SR;
    const stalled = on && Listen.engine === 'cloud' && Cloud.stalled;
    for (const id of ['btnListen', 'btnListen2']) { const b = $(id); b.textContent = stalled ? t('listen_resume') : on ? t('listen_stop') : t('listen_start'); b.classList.toggle('on', on && !stalled); b.classList.toggle('primary', !on || stalled); b.disabled = disabled; }
    $('btnVB').textContent = Listen.mode === 'bible' ? t('listen_stop') : t('listen_bible'); $('btnVB').classList.toggle('on', Listen.mode === 'bible'); $('btnVB').classList.toggle('primary', Listen.mode !== 'bible'); $('btnVB').disabled = disabled;
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('sel', b.dataset.lm === (vb && S.psalmMode ? 'psalm' : S.listenMode)));
    $('lmBible').hidden = !vb || !!S.psalmMode; $('lmPsalm').hidden = !(vb && S.psalmMode);
    $('autoFollow').closest('label').hidden = vb;
    const gem = cloud && S.gemini && S.geminiKey, wh = cloud && Listen.engine === 'whisper';
    document.querySelectorAll('.engine-badge').forEach(e => { e.textContent = wh ? '🎵 Whisper AI' : gem ? '✨ Gemini AI' : cloud ? '🌐 ' + t('engine_online') : '💻 ' + t('engine_offline'); e.classList.toggle('online', cloud); });
    if (Listen.mode && Listen.waitingMic) setStatus(t('mic_wait'), false);
    else if (Listen.mode) {
      if (Listen.engine === 'local' && !Local.ok) setStatus(t('local_connecting'), false);
      else setStatus(`${Listen.mode === 'bible' ? (S.psalmMode ? t('listen_for_psalm') : t('listen_for_bible')) : t('listen_for_songs')} · ${Listen.engine === 'gemini' ? 'Gemini' : Listen.engine === 'whisper' ? 'Whisper' : langName(Listen.lang)}`, true);
    } else setStatus(disabled ? t('need_chrome') : t('not_listening'), false);
    $('matchPill').hidden = Listen.mode !== 'songs';
    if (Listen.mode !== 'songs') { $('matchPill').textContent = ''; $('matchPill').className = 'pill'; }
  }
  function setListenMode(m) {
    const psalm = m === 'psalm'; if (psalm) m = 'bible';
    const wasPsalm = S.psalmMode; S.psalmMode = psalm;
    S.listenMode = m; saveSettings();
    if (psalm) { hideAsk(); hideQuizAsk(); psalmStart(S.psalmN, S.psalmV); }
    else if (wasPsalm && m === 'bible') { VF.shown = ''; }
    if (m === 'bible') {
      Track.pause(); ensureVersions();          // Bible text ready before the first verse is heard
      // Preacher: the song leaves the screen; the last verse comes back, or the background until a verse is heard.
      if (screen.kind === 'song' || screen.kind === 'idle') { if (lastBible) { screen.kind = 'bible'; screen.bible = lastBible; screen.bgOnly = false; } else screen.bgOnly = true; output(); renderSlides(); }
    }
    if (m === 'songs' && song && screen.kind === 'bible') { screen.kind = 'song'; screen.bgOnly = false; renderSlides(); output(); }
    if (Listen.mode && Listen.mode !== m) { if (m === 'bible') vbText = ''; Listen.start(m); } else updateListenUI();
  }
  // Which language the preacher is speaking, from the words themselves: chapter/verse words and book names differ
  // between Malayalam, Tamil and English, and they are recognisable even when the recogniser is set to the wrong one
  // (it then writes them phonetically). Lets "auto" lock on the right language at the first reference instead of
  // rotating through the languages.
  const LANG_MARKERS = {
    'ml-IN': ['അദ്ധ്യായം', 'അധ്യായം', 'അദ്ധ്യായത്തിൽ', 'വാക്യം', 'വാക്യത്തിൽ', 'യോഹന്നാൻ', 'മത്തായി', 'സങ്കീർത്തനം', 'ഉല്പത്തി', 'യെശയ്യാവ്', 'എബ്രായർ', 'ലേഖനം', 'വായിക്കാം', 'നമുക്ക്'],
    'ta-IN': ['அதிகாரம்', 'அதிகாரத்தில்', 'வசனத்தில்', 'யோவான்', 'மத்தேயு', 'சங்கீதம்', 'ஆதியாகமம்', 'ஏசாயா', 'எபிரெயர்', 'நிருபம்', 'வாசிப்போம்', 'நாம்', 'ஆவது'],
    'en-IN': ['chapter', 'verse', 'verses', 'gospel', 'psalm', 'let us', 'turn to', 'open your']
  };
  const LANG_KEYS = Object.fromEntries(Object.entries(LANG_MARKERS).map(([l, ws]) => [l, ws.map(w => Core.keyWords(w).replace(/\s+/g, ' ').trim())]));
  function speechLang(text) {
    // written in Malayalam or Tamil letters: the recogniser already knows (the English-letter word lists below
    // overlap - "ഇടയനാകുന്നു" was taken for Tamil and the Malayalam verse was then followed in the Tamil Bible)
    const ml = (String(text).match(/[\u0D00-\u0D7F]/g) || []).length, ta = (String(text).match(/[\u0B80-\u0BFF]/g) || []).length;
    if (ml + ta >= 4) return ml > ta ? 'ml-IN' : 'ta-IN';
    const k = ' ' + Core.keyWords(text) + ' ', score = {};
    for (const [l, ws] of Object.entries(LANG_KEYS)) score[l] = ws.reduce((n, w) => n + (w.length >= 3 && (l === 'ta-IN' && w === 'avatu' ? /avatu /.test(k) : k.includes(' ' + w)) ? 1 : 0), 0);
    if (/[a-z]+avatu /.test(k)) score['ta-IN'] += 1;          // Tamil ordinals ("மூன்றாவது")
    const best = Object.entries(score).sort((a, b) => b[1] - a[1]);
    return best[0][1] >= 1 && best[0][1] > best[1][1] ? best[0][0] : null;
  }
  function onText(finals, interim, conf) {
    lastSpeechAt = Date.now();
    if (Listen.engine !== 'whisper') {      // Whisper/Sarvam clips are logged with more detail in Whisper.send
      const e = { eng: Listen.engine, prov: Listen.engine === 'sarvam' ? 'sarvam-live' : Listen.engine, end: Diag.clipEnd || 0, got: Date.now(), text: String(finals || (interim && interim[0]) || '').slice(0, 60), final: !!finals, from: follow.cur };
      Diag.clipEnd = 0;
      setTimeout(() => { e.done = Date.now(); e.to = follow.cur; Diag.add(e); }, 0);
    }
    if (Listen.mode === 'bible' && S.vbLang === 'auto' && Listen.engine === 'cloud' && (finals || interim[0])) {
      const l = speechLang(finals || interim[0]);
      if (l && l !== Listen.lang) { hunt.lockedAt = Date.now(); Listen.setLang(l); toast(t('lang_detected') + ': ' + langName(l)); }
      else if (l) hunt.lockedAt = Date.now();
    }
    const lockBefore = hunt.lockedAt, matchBefore = lastMatchAt;
    const show = (finals || interim[0] || '').trim();
    if (show) { $('heard').textContent = show; $('vbHeard').textContent = show; }
    LangID.sample(finals);
    if (Listen.mode === 'songs') {
      onSongSpeech(finals, interim);
      // Only with automatic switching on: a clearly spoken reference during singing ("John chapter 3 verse 16") moves to the preacher.
      if (finals && S.autoMode) { const r = Bible.parseRef(finals.slice(-120), { exactOnly: true, needChapter: true, needVerse: true }); if (r && r.cue && r.tight && !r.fuzzy) { setListenMode('bible'); vbText = ''; pushHeardRef({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }, 'ref', true); } }
    } else if (Listen.mode === 'bible') {
      onBibleSpeech(finals, interim, conf == null ? 0.75 : conf);
      // Only with automatic switching on: singing that clearly matches a song while in preacher mode moves back to the songs.
      if (S.autoMode && !S.psalmMode && songIx && (finals || interim[0])) {
        const h = Core.key(finals || interim[0]); const best = Core.songLookup(songIx, h, 1)[0];
        if (best && best.score >= .72) { singHits++; if (singHits >= 2) { singHits = 0; setListenMode('songs'); switchToSong(best.id, best.line); } } else singHits = 0;
      }
    }
    if (finals) huntEvidence(hunt.lockedAt !== lockBefore || lastMatchAt !== matchBefore, conf == null ? 0.75 : conf, finals.trim().split(/\s+/).length);
  }
  let singHits = 0;

  // The library index is (re)built in small slices during idle time, so even a 1,000-song library never blocks
  // the screen; the previous index keeps serving until the new one is ready.
  let ixBuild = 0;
  function rebuildSongIndex() {
    const run = ++ixBuild, list = [], all = songs.slice(); let i = 0;
    const step = () => {
      if (run !== ixBuild) return;
      const end = Math.min(all.length, i + 40);
      for (; i < end; i++) list.push({ id: all[i].id, lines: prepared(all[i]) });
      if (i < all.length) (window.requestIdleCallback || (f => setTimeout(f, 0)))(step, { timeout: 200 });
      else { songIx = Core.songIndex(list); rebuildLib(); }
    };
    if (!songIx) { for (const s of all) list.push({ id: s.id, lines: prepared(s) }); songIx = Core.songIndex(list); i = all.length; rebuildLib(); return; }
    step();
  }
  // The whole-library index for the Whisper/Sarvam path (word-by-word check of the few songs the letter index
  // finds); built a moment after the letter index, in idle time.
  const Lib = { ix: null, run: 0, ver: 0 };
  function rebuildLib() {
    const run = ++Lib.run;
    (window.requestIdleCallback || (f => setTimeout(f, 50)))(() => {
      if (run !== Lib.run) return;
      const list = songs.map(s => { const ls = prepared(s), f = ls.find(l => !l.alt); return { id: s.id, grp: f ? Core.key(f.text).slice(0, 40) : s.id, lines: ls }; });
      try { Lib.ix = Core.libIndex(list); Lib.ver++; } catch (e) { Lib.ix = null; }
    }, { timeout: 3000 });
  }
  let ixTimer;
  function songsChanged() { clearTimeout(ixTimer); ixTimer = setTimeout(rebuildSongIndex, 300); }

  function onSongSpeech(finals, interim) {
    if (finals) heardKey = (heardKey + ' ' + Core.keyWords(finals)).slice(-400);
    // The offline model writes Malayalam/Tamil in English letters, so matches score a little lower.
    const thr = S.thr / 100 - (Listen.engine === 'local' ? .06 : 0);
    let moved = false;
    if (song && lines.length && S.autoFollow && Listen.engine !== 'whisper' && Listen.engine !== 'local') {   // clip engines: Trk decides
      for (const alt of (interim.length ? interim : [''])) {
        if (Core.decide(follow, lines, (heardKey + ' ' + Core.keyWords(alt)).slice(-400), thr, Listen.engine === 'whisper' ? { back: .25 } : null)) { moved = true; break; }
      }
    }
    const sc = song ? follow.score : 0;
    if (song && (sc >= thr * .85 || moved)) { lastMatchAt = Date.now(); if (screen.autoBlank) { screen.autoBlank = false; moved = true; } }
    updateSearchHelp(sc, thr);
    const pill = $('matchPill'); pill.textContent = Math.round(sc * 100) + '%';
    pill.className = 'pill ' + (sc >= thr + .15 ? 'good' : sc >= thr ? 'ok' : 'low');
    if (moved) { if (screen.kind !== 'song') screen.kind = 'song'; screen.bgOnly = false; renderSlides(); output(); }
    // With Whisper the service songs are found by the service index (Svc); the older letter-pattern detector
    // opened a Malayalam song on Whisper's repeated "வணக்கம்" over silence, so it is not used then.
    if (S.autoFollow && Listen.engine !== 'whisper') detectOtherSong((heardKey + ' ' + Core.keyWords(interim[0] || '')).slice(-400), sc, thr, !!finals);
  }

  // Finds the song being sung anywhere in the library (fast index), and jumps to it at the right line.
  function detectOtherSong(h, curScore, thr, isFinal) {
    const now = Date.now();
    if (!songIx || (!isFinal && now - lastDetectAt < 250) || h.length < 12) return;
    lastDetectAt = now;
    // Look at the whole recent window and at the latest phrase alone, so a new song is not drowned by the old one.
    const cands = Core.songLookup(songIx, h, 8).concat(h.length > 160 ? Core.songLookup(songIx, h.slice(-160), 8) : []).filter(x => !song || x.id !== song.id);
    // The current song is only left when what is heard is NOT in it. A chorus sung again, a repeated line or a line
    // that also appears in another song (very common: "…துதியுங்கள்", "Hallelujah") must never restart or switch songs.
    if (song && lines.length) {
      const own = Math.max(Core.songScore(h.slice(-90), lines), Core.songScore(h.slice(-45), lines));
      curScore = Math.max(curScore, own);
      if (own >= Math.max(thr, .5)) { detect.n = 0; detect.id = null; return; }
    }
    // 1) Today's service list is where the song almost always is: it is tried first, on its own.
    // 2) The rest of the library is consulted only after the service list has given nothing for 5 seconds,
    //    and then only for a song where a whole line is clearly matched - never on a few shared words.
    const inSvc = cands.filter(x => service.includes(x.id)).sort((a, b) => b.score - a.score)[0];
    const quietFor = now - lastMatchAt;
    // Favourites (the church's own songs) come before the rest of the library: after 2.5 s, on a slightly lower bar.
    const fav = quietFor > 2500 ? cands.filter(x => !service.includes(x.id) && favs.has(x.id) && x.score >= .66).sort((a, b) => b.score - a.score)[0] : null;
    const lib = fav || (quietFor > 5000 ? cands.filter(x => !service.includes(x.id) && x.score >= .72).sort((a, b) => b.score - a.score)[0] : null);
    const need = Math.max(thr + .1, .62);
    const best = inSvc && inSvc.score >= need ? inSvc : lib;
    if (best && best.score > curScore + .15) {
      detect.n = detect.id === best.id ? detect.n + 1 : 1; detect.id = best.id; detect.line = best.line;
      const inService = service.includes(best.id);
      if (detect.n >= (inService ? 2 : best.score >= .85 ? 2 : 3) && suggestId !== best.id) {
        if (S.autoSwitch) switchToSong(best.id, best.line);
        else showSuggest(best.id, best.line);
      }
    } else if (!best || best.score < need * .8) { detect.n = 0; detect.id = null; }
  }
  function switchToSong(id, line) {
    if (!service.includes(id)) { service.push(id); saveService(); }
    loadSong(id, { line });
    toast(t('sounds_like') + ': ' + songById(id).title);
  }
  let noMatchSince = 0;
  function updateSearchHelp(sc, thr) {
    const box = $('searchHelp'); if (!box) return;
    if (Listen.mode !== 'songs') { box.hidden = true; return; }
    if (sc >= thr * .8) { noMatchSince = 0; box.hidden = true; return; }
    if (!noMatchSince) noMatchSince = Date.now();
    if (Date.now() - noMatchSince > 8000) {
      const q = ($('heard').textContent || '').trim();
      if (q.length > 8) { $('searchLink').href = 'https://www.google.com/search?q=' + encodeURIComponent(q + ' lyrics'); box.hidden = false; }
    }
  }
  function showSuggest(id, line) { suggestId = id; $('suggest').dataset.line = line || 0; $('suggestTitle').textContent = songById(id).title; $('suggest').hidden = false; }
  function hideSuggest() { suggestId = null; $('suggest').hidden = true; detect = { id: null, n: 0 }; }

  // Bible search and quote matching run in a background thread so the screen never stutters.
  const BibleBG = (() => {
    let w = null, seq = 0; const pend = new Map();
    try {
      if (location.protocol !== 'file:') {
        w = new Worker('js/bible-worker.js');
        w.onmessage = e => { const p = pend.get(e.data.id); if (!p) return; if ('progress' in e.data) { p.prog && p.prog(e.data.progress); return; } pend.delete(e.data.id); e.data.error ? p.rej(new Error(e.data.error)) : p.res(e.data.result); };
        w.onerror = () => { w = null; for (const p of pend.values()) p.rej(new Error('worker')); pend.clear(); };
      }
    } catch (e) { w = null; }
    async function direct(op, vid, q, limit, prog) {
      await Bible.ensureIndex(vid, prog);
      return op === 'index' ? true : op === 'search' ? Bible.search(vid, q, limit) : Bible.quote(vid, q, limit);
    }
    return {
      call(op, vid, q, limit, prog) {
        if (!w) return direct(op, vid, q, limit, prog);
        return new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej, prog }); w.postMessage({ id, op, vid, q, limit }); })
          .catch(() => direct(op, vid, q, limit, prog));
      }
    };
  })();

  /* ---------- Bible level 3: which passage is the preacher retelling or explaining? (Sarvam 105B) ----------
   * Only when no reference was said and no verse was read out: the last ~25 seconds of what was said go to Sarvam's
   * language model, which names the passage (or none). Measured live: 10 of 10 stories, paraphrases and quotes
   * named right in Tamil and Malayalam, talk and prayer answered "none", ~0.3 s an answer. Its answer is only
   * offered (list + "Did the preacher say...?"), never put on the screen by itself - except a passage of today's
   * plan named with certainty. About Rs 0.005 an answer, at most one every 8 s; daily limit in Settings. */
  const VerseAI = {
    buf: '', words: 0, lastAt: 0, busy: false, last: null, log: null,
    // What it heard and answered, on the operator's screen (kept through a page reload, for this browser tab).
    note(ans, what) {
      this.log = (this.log || []).concat([[new Date().toLocaleTimeString().replace(/:\d\d(?=\D*$)/, ''), this.buf.slice(-70).trim(), ans, what]]).slice(-12);
      try { sessionStorage.setItem('lf-ai-log', JSON.stringify(this.log)); } catch (e) {}
      this.render();
    },
    render() {
      if (!this.log) { try { this.log = JSON.parse(sessionStorage.getItem('lf-ai-log') || '[]'); } catch (e) { this.log = []; } }
      const box = $('aiLogBox'), ol = $('aiLog'); if (!box || !ol) return;
      box.hidden = !this.log.length; ol.innerHTML = '';
      for (const [tm, heard, ans, what] of this.log.slice().reverse()) { const li = el('li'); li.append(el('b', '', `${tm} ${ans}`), el('span', 'muted', ` ${what} · “…${heard}”`)); ol.appendChild(li); }
    },
    on() { return S.vbAI !== false && (S.sarvamKey || '').length > 10 && Listen.mode === 'bible' && !SvUse.aiOver(); },
    heard(text) {
      if (!text) return;
      // only the last ~30 seconds: a story told earlier must not be named again over the talk that follows it
      const now = Date.now();
      this.parts = (this.parts || []).filter(x => now - x[0] < 30000).concat([[now, text.trim()]]);
      this.buf = this.parts.map(x => x[1]).join(' ').replace(/\s+/g, ' ').slice(-420); this.words += text.trim().split(/\s+/).length;
      if (!this.on() || this.busy || this.words < 10 || now - this.lastAt < 8000 || now - lastRefAt < 6000) return;
      this.ask();
    },
    async grounded(ref, text) {
      const lg = detectScript(text), vid = lg === 'ml' ? 'mal1910' : lg === 'ta' ? 'tamov' : (S.versions.find(v => (Bible.VERSIONS.find(x => x.id === v) || {}).lang === 'en') || 'kjv');
      try { await Bible.load(vid); } catch (e) { return true; }   // cannot check: leave it to the operator
      if (!this.common) this.common = new Set(['தேவன்', 'கர்த்தர்', 'இயேசு', 'அவர்', 'அவன்', 'நான்', 'நீங்கள்', 'என்று', 'என்ன', 'இந்த', 'அந்த', 'ஆனால்', 'ദൈവം', 'കർത്താവ്', 'യേശു', 'അവൻ', 'ഞാൻ', 'നിങ്ങൾ', 'എന്നു', 'എന്ന്', 'god', 'lord', 'jesus', 'said', 'unto', 'that', 'with', 'they', 'them', 'this', 'have', 'shall', 'will', 'there', 'their', 'from', 'which'].map(w => Core.keyWords(w).replace(/\s/g, '').slice(0, 5)));
      const stems = x => new Set(Core.keyWords(x).split(' ').filter(w => w.length >= 4).map(w => w.slice(0, 5)).filter(w => !this.common.has(w)));
      let vt = ''; for (let v = Math.max(1, ref.v - 2); v <= ref.ve + 2; v++) vt += ' ' + (Bible.verse(vid, ref.book, ref.ch, v) || '');
      if (!vt.trim()) return true;
      const hs = stems(text), vs = stems(vt); let n = 0; for (const w of hs) if (vs.has(w)) n++;
      return n >= 2;
    },
    async ask() {
      this.busy = true; this.lastAt = Date.now(); this.words = 0;
      const plan = planList().map(p => Bible.refLabel({ book: p.book, ch: p.ch, v: p.v || 1, ve: p.ve || p.v || 1 }, 'en').replace(/:1$/, '')).join('; ');
      const sys = 'A preacher is speaking (Tamil, Malayalam or English). From the transcript of his last few sentences, name the Bible verse(s) he is reading, quoting, retelling or explaining right now. ' +
        'Answer only JSON: {"ref":"Book chapter:verse[-verse]" or null,"sure":0..1}. English book names. null when he is not talking about one specific passage (greetings, prayer, announcements, his own testimony, general teaching).' +
        (plan ? ' Today\'s sermon passages: ' + plan + '.' : '');
      try {
        const r = await fetch('https://api.sarvam.ai/v1/chat/completions', { method: 'POST', headers: { 'api-subscription-key': S.sarvamKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'sarvam-105b', reasoning_effort: null, temperature: 0, max_tokens: 60, messages: [{ role: 'system', content: sys }, { role: 'user', content: this.buf.trim() }] }) });
        if (r.status === 401 || r.status === 402 || r.status === 403) { this.lastAt = Date.now() + 300000; return; }
        if (!r.ok) return;
        const j = await r.json(), u = j.usage || {};
        SvUse.addAi(((+u.prompt_tokens || 400) * 15 + (+u.completion_tokens || 30) * 60) / 1e6);
        const txt = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
        const m = txt.match(/\{[\s\S]*\}/);
        let o = null; try { o = m ? JSON.parse(m[0]) : null; } catch (e) {}
        const note = (ans, what) => this.note(ans, what);
        if (!o || !o.ref) return note('-', t('ai_none'));
        if (!(+o.sure >= .5)) return note(o.ref + ' ' + (+o.sure).toFixed(1), t('ai_unsure'));
        const p = Bible.parseRef(String(o.ref), {}); if (!p || !Bible.validRef(p.book, p.ch, p.v)) return note(o.ref, t('ai_none'));
        const ref = { book: p.book, ch: p.ch, v: p.v, ve: Math.max(p.v, p.ve || p.v) }, lbl = Bible.refLabel(ref, 'en') + ' ' + (+o.sure).toFixed(2);
        // Only a passage that shares words with what was said (names, things, actions - in the Bible of the language
        // spoken): seen live, the model named Esther 5:1 "sure 1.0" for "ஒன்னு தமிழ்ல சொல்லு இல்ல இதுல சொல்லு".
        if (!(await this.grounded(ref, this.buf))) return note(lbl, t('ai_unsure'));
        const sb = screen.kind === 'bible' && screen.bible;
        if (sb && sb.book === ref.book && sb.ch === ref.ch && ref.v <= (sb.ve || sb.v) && ref.ve >= sb.v) return note(lbl, t('ai_onscreen'));
        const k = refKey(ref), again = this.last && this.last.k === k && Date.now() - this.last.at < 60000;
        this.last = { k, at: Date.now() };
        if (+o.sure >= .85 && inPlan(ref)) { note(lbl, t('ai_shown')); pushHeardRef(ref, 'ai', true); }
        else { const only = again || +o.sure < .8; note(lbl, only ? t('ai_listed') : t('ai_asked')); pushHeardRef(ref, 'ai', false, only); }
      } catch (e) { /* offline or refused: the free steps carry on */ }
      finally { this.busy = false; }
    }
  };

  /* ---------- Bible quiz: the preacher asks "who is the son of Abraham?" and the answer can go on screen ----------
   * Matched locally against vendor/quiz.json (English, Tamil, Malayalam), next to the verse search. 'show': the
   * question goes up at once and the answer after the pause the pastor chose (the church gets a moment to answer
   * aloud); 'suggest': the operator sees it and taps Show; 'off'. */
  let quizTimer = 0, quizHeard = [], quizLast = { i: -1, at: 0 }, quizAsked = null, quizAskTimer = 0, quizReady = null;
  function quizLoad() {
    if (quizReady || !window.LFQuiz) return quizReady;
    quizReady = fetch('vendor/quiz.json').then(r => r.json()).then(l => LFQuiz.load(l)).catch(() => { quizReady = null; return 0; });
    return quizReady;
  }
  function quizListen(finals) {
    if (S.quiz === 'off' || !window.LFQuiz) return false;
    if (!LFQuiz.count()) { quizLoad(); return false; }
    const now = Date.now();
    quizHeard.push({ t: finals, at: now }); quizHeard = quizHeard.filter(x => now - x.at < 12000).slice(-3);
    // the latest phrase by itself first (a question is usually said in one breath), then with the one before it
    let m = LFQuiz.match(finals);
    if (!m && quizHeard.length > 1) m = LFQuiz.match(quizHeard.slice(-2).map(x => x.t).join(' '));
    if (!m) return false;
    quizHeard = [];
    if (m.i === quizLast.i && now - quizLast.at < 90000) { quizLast.at = now; return true; }   // asked again: already up
    quizLast = { i: m.i, at: now };
    if (S.quiz === 'show' && S.vbAuto) showQuiz(m.q); else askQuiz(m.q);
    return true;
  }
  function showQuiz(q, now) {
    hideQuizAsk(); clearTimeout(quizTimer);
    screen.kind = 'quiz'; screen.quiz = { q, shown: !!now || !(S.quizDelay > 0), at: Date.now() }; screen.bgOnly = false; screen.black = false; screen.autoBlank = false;
    if (!screen.quiz.shown) quizTimer = setTimeout(() => { if (screen.quiz && screen.quiz.q === q) { screen.quiz.shown = true; output(); } }, S.quizDelay * 1000);
    output(); renderSlides();
  }
  function quizText(q, l) { return (q.q[l] || q.q.en) + ' → ' + (q.a[l] || q.a.en); }
  function askQuiz(q) {
    quizAsked = q; const b = $('quizAsk'); if (!b) return;
    $('quizAskText').textContent = quizText(q, S.lang in q.q ? S.lang : 'en');
    b.hidden = false; clearTimeout(quizAskTimer); quizAskTimer = setTimeout(hideQuizAsk, 20000);
  }
  function hideQuizAsk() { quizAsked = null; clearTimeout(quizAskTimer); const b = $('quizAsk'); if (b) b.hidden = true; }

  /* ---------- Psalm reading: the church reads a Psalm together, one verse on screen at a time ----------
   * Only the chosen Psalm is followed. The next verse moves on clear evidence, two verses ahead (a verse skipped)
   * or one back needs it twice, nothing further ever moves, and a repeated verse stays up. No passage finder, no
   * quiz, no other references - only "Psalm 91" / "சங்கீதம் 23" / "സങ്കീർത്തനം 1" changes the Psalm. */
  const PS = 18;
  const PSF = { hold: null };
  async function psalmStart(n, v) {
    n = Math.max(1, Math.min(150, Math.round(+n) || 1)); v = Math.max(1, Math.round(+v) || 1);
    await ensureVersions();
    const rv = vfVersion(); if (!Bible.loaded(rv)) await Bible.load(rv).catch(() => {});   // the Bible the church reads from
    const cnt = Bible.chapter(S.versions.find(Bible.loaded) || 'kjv', PS, n).length; if (cnt && v > cnt) v = 1;
    S.psalmN = n; S.psalmV = v; saveSettings(); PSF.hold = null;
    await showBible({ book: PS, ch: n, v, ve: v });
    renderPsalmUI();
  }
  function renderPsalmUI() { const a = $('psN'), b = $('psV'); if (a && document.activeElement !== a) a.value = S.psalmN; if (b && document.activeElement !== b) b.value = S.psalmV; }
  function psalmFollow(finals, interim) {
    if (screen.kind !== 'bible' || !screen.bible || screen.bible.book !== PS) return false;
    const r = screen.bible; if (!vfPrepare(r)) return false;
    if (VF.shown !== refKey(r)) { VF.shown = refKey(r); VF.st = { cur: VF.first[r.v - 1] != null ? VF.first[r.v - 1] : 0, pend: -1, hits: 0 }; VF.heard = ''; PSF.hold = null; }
    if (finals) VF.heard = (VF.heard + ' ' + Core.keyWords(finals)).slice(-300);
    const thr = S.thr / 100, save = JSON.stringify(VF.st);
    let moved = false;
    for (const alt of (interim.length ? interim.slice(0, 2) : [''])) if (Core.decide(VF.st, VF.lines, (VF.heard + ' ' + Core.keyWords(alt)).slice(-300), thr)) { moved = true; break; }
    // where the words point, by verse: the follower itself moves piece by piece inside a verse
    const tgt = moved ? VF.st.cur : VF.st.pend;
    if (tgt == null || tgt < 0) return true;
    const v = VF.vOf[tgt], d = v - r.v;
    if (d === 0) return true;                                    // further into this verse, or it is read again: it stays
    if (d === 1 && !moved) return true;                          // the next verse, not clear yet
    if (d !== 1) {
      // a verse skipped, or the one before read again: clearly, and twice; anything further never moves
      const clear = (d === 2 || d === -1) && finals && VF.st.raw >= thr + .15;
      const ok = clear && PSF.hold && PSF.hold.v === v && Date.now() - PSF.hold.at < 20000;
      if (!ok) { if (clear) PSF.hold = { v, at: Date.now() }; if (moved) { VF.st = JSON.parse(save); VF.st.pend = tgt; VF.st.hits = 1; } return true; }
      VF.st.cur = tgt; VF.st.pend = -1; VF.st.hits = 0;
    }
    PSF.hold = null; const nr = { book: PS, ch: r.ch, v, ve: v }; VF.shown = refKey(nr); S.psalmV = v; saveSettings();
    showBible(nr); renderPsalmUI();
    return true;
  }
  function psalmSpeech(finals, interim) {
    if (finals) {
      const r = Bible.parseRef(finals.slice(-120), { exactOnly: true, needChapter: true });
      if (r && r.book === PS && (r.cue || r.tight) && !(screen.bible && screen.bible.book === PS && screen.bible.ch === r.ch && !r.hasVerse)) { psalmStart(r.ch, r.hasVerse ? r.v : 1); return; }
    }
    if (!(screen.kind === 'bible' && screen.bible && screen.bible.book === PS)) { if (finals) psalmStart(S.psalmN, S.psalmV); return; }
    psalmFollow(finals, interim);
  }

  function onBibleSpeech(finals, interim, conf) {
    if (S.psalmMode) { psalmSpeech(finals, interim); return; }
    // after the free steps below have had their go at this phrase (a reference or a read-out verse needs no AI);
    // a quiz question just matched is not a passage being retold
    if (finals) setTimeout(() => { if (Date.now() - quizLast.at > 3000) VerseAI.heard(finals); }, 500);
    if (finals) vbText = (vbText + ' ' + finals).slice(-400);
    const tail = (vbText + ' ' + (interim[0] || '')).slice(-90);
    const opts = { exactOnly: true, needChapter: true, needVerse: true, prefer: planBooks() };
    // A reference said at the start of a long sentence ("John 3 16, for God so loved...") would fall off the
    // 90-character tail, so the whole finished phrase is tried first.
    let r = finals && finals.length > 90 ? Bible.parseRef(finals, opts) : null;
    if (!r) r = Bible.parseRef(tail, opts);
    if (r) {
      // If what was heard matches a song line, it is singing (e.g. Tamil "நான்" heard as "John"), not a reference.
      const singing = S.autoMode && songIx && Core.songLookup(songIx, Core.key(tail), 1).some(x => x.score >= .6);
      // Sure: chapter/verse words were said, or the numbers follow the book name directly with a confident transcript.
      // Repeated numbers ("18 18", "1 1") are the usual shape of mishearings, so they need more confidence.
      const indic = /[\u0B80-\u0BFF\u0D00-\u0D7F]/.test(tail);   // Tamil/Malayalam script: the recogniser was sure of the words
      const need = r.ch === r.v ? .85 : indic ? .4 : .72;
      // The offline engine spells Malayalam/Tamil book names phonetically ("Vohmar" = Romans), so a near-match book is normal there.
      const bookOk = !r.fuzzy || Listen.engine === 'local';
      const sure = !singing && (r.cue || (r.tight && bookOk && conf >= need) || (r.tight && conf >= .9) || (inPlan(r) && (r.tight || conf >= .5)));
      if (sure || finals) { pushHeardRef({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }, 'ref', sure); vbText = ''; vbWordsAtQuote = 0; partRef = null; }
      return;
    }
    if (finals && pieceRef(finals)) return;
    if (finals && quizListen(finals)) return;
    if (verseFollow(finals, interim)) return;
    const words = vbText.trim().split(/\s+/).length;
    if (finals && !quoteBusy && words - vbWordsAtQuote >= 5 && Date.now() - VF.at > 8000) {
      vbWordsAtQuote = words; quoteBusy = true;
      const lang = (Listen.engine === 'local' || S.vbLang === 'auto' ? detectScript(vbText) : S.vbLang.slice(0, 2));
      const en = S.versions.find(v => (Bible.VERSIONS.find(x => x.id === v) || {}).lang === 'en') || 'kjv';
      // Offline speech may write Malayalam/Tamil in English letters, so search the spoken language's Bible too.
      const vids = lang === 'ml' ? ['mal1910'] : lang === 'ta' ? ['tamov'] : Listen.engine === 'local' ? [en, (Listen.lang || '').startsWith('ta') ? 'tamov' : 'mal1910'] : [en];
      Promise.all(vids.map(v => BibleBG.call('quote', v, vbText.slice(-400), 3).catch(() => [])))
        .then(all => {
          // The verse heard in order counts first: most of a verse's words in its own order is it being read out.
          const qs = [].concat(...all.map(r => r || [])).sort((a, b) => (b.ord || 0) - (a.ord || 0) || b.score - a.score), q = qs[0];
          if (!q || q.score < .6) return;
          // On screen only when most of the verse was heard in order (an explanation that shares a few of its words
          // never takes over the screen); a planned chapter needs less. Otherwise it is offered in the list.
          const sure = (q.ordN >= 5 && q.ord >= .6) || (q.ordN >= 4 && q.ord >= .8) || (inPlan(q) && q.ordN >= 3 && q.ord >= .45);
          pushHeardRef({ book: q.book, ch: q.ch, v: q.v, ve: q.v }, 'quote', sure, !sure);
        })
        .catch(() => {}).finally(() => { quoteBusy = false; });
    }
  }
  // A reference said in pieces, or with one number misheard: "மத்தேயு 1-ஆம் வசனம் <misheard> அதிகாரம்" keeps
  // Matthew ?:1 waiting, and "அஞ்சாம் அதிகாரம்" said next completes it. "Verse 17" alone, said soon after a
  // verse was shown, moves within that chapter. The screen never sits on an old verse without saying what it heard.
  let partRef = null;
  function pieceRef(text) {
    const p = Bible.parsePartial(text); if (!p) return false;
    const now = Date.now();
    if (p.book != null) partRef = { book: p.book, ch: p.ch, v: p.v, at: now };
    else if (partRef && now - partRef.at < 30000) { if (p.ch != null) partRef.ch = p.ch; if (p.v != null) partRef.v = p.v; partRef.at = now; }
    else if (p.ch != null && planList().filter(x => x.ch === p.ch).length === 1 && !(screen.bible && screen.bible.ch === p.ch)) {
      const m = planList().find(x => x.ch === p.ch); partRef = { book: m.book, ch: p.ch, v: p.v, at: now };   // another planned chapter
    }
    else if (p.v != null && screen.kind === 'bible' && screen.bible && now - lastRefAt < 300000) partRef = { book: screen.bible.book, ch: p.ch != null ? p.ch : screen.bible.ch, v: p.v, at: now };
    else if (p.ch != null) {                  // "<misheard book> 5-ാം അധ്യായം 3-ാം വാക്യം": the one planned chapter 5
      const m = planList().filter(x => x.ch === p.ch); if (m.length !== 1) return false;
      partRef = { book: m[0].book, ch: p.ch, v: p.v, at: now };
    }
    else return false;
    if (partRef.ch == null) { const m = planList().filter(x => x.book === partRef.book); if (m.length && m.every(x => x.ch === m[0].ch)) partRef.ch = m[0].ch; }
    const r = partRef;
    if (r.ch == null && r.v == null) return false;           // only a book name so far: wait quietly
    if (r.ch != null && r.v != null) {
      partRef = null;
      if (!Bible.validRef(r.book, r.ch, r.v)) return false;
      pushHeardRef({ book: r.book, ch: r.ch, v: r.v, ve: r.v }, 'ref', true); vbText = ''; vbWordsAtQuote = 0;
      return true;
    }
    toast(Bible.bookName(r.book, S.lang) + ' ' + (r.ch != null ? r.ch : '?') + ':' + (r.v != null ? r.v : '?') + ' …');
    return true;
  }
  /* ---------- Verse follow: the verses move as the preacher reads them ----------
   * The chapter on screen is cut into short pieces (about 8 words) and followed exactly like song lines: the next
   * piece moves as soon as it is clearly heard, jumps need repeated confirmation. The spoken language's Bible is
   * used (Malayalam 1910 / Tamil OV / the chosen English version), with the other loaded versions of the same
   * language as alternatives, since preachers do not always read the same translation. */
  const VF = { key: '', lines: [], vOf: [], first: [], st: { cur: -1, pend: -1, hits: 0 }, heard: '', shown: '', at: 0 };
  function vfVersion() {
    const l = (Listen.lang || '').slice(0, 2);
    if (l === 'ml') return 'mal1910'; if (l === 'ta') return 'tamov';
    return S.versions.find(v => (Bible.VERSIONS.find(x => x.id === v) || {}).lang === 'en') || 'kjv';
  }
  function vfPrepare(r) {
    const vid = vfVersion(), key = vid + ':' + r.book + ':' + r.ch;
    if (VF.key === key) return true;
    const verses = Bible.chapter(vid, r.book, r.ch);
    if (!verses.length) { if (!Bible.loaded(vid)) Bible.load(vid).catch(() => {}); return false; }
    const lang = (Bible.VERSIONS.find(x => x.id === vid) || {}).lang;
    const others = Bible.VERSIONS.filter(x => x.lang === lang && x.id !== vid && Bible.loaded(x.id)).map(x => Bible.chapter(x.id, r.book, r.ch));
    const texts = [], vOf = [], first = [], alts = others.map(() => []);
    const cut = (t, n, k) => { const w = String(t || '').split(/\s+/).filter(Boolean); return w.slice(Math.floor(k * w.length / n), Math.floor((k + 1) * w.length / n)).join(' '); };
    verses.forEach((t, i) => {
      const n = Math.max(1, Math.round(t.split(/\s+/).length / 8)); first[i] = texts.length;
      for (let k = 0; k < n; k++) { texts.push(cut(t, n, k)); vOf.push(i + 1); others.forEach((o, x) => alts[x].push(cut(o[i], n, k))); }
    });
    const lines = Core.prepare(texts), altLines = alts.map(a => Core.prepare(a));
    lines.forEach((ln, j) => { const a = altLines.map(x => x[j]).filter(x => x && x.key.length >= 3); if (a.length) ln.alts = a; });
    Object.assign(VF, { key, lines, vOf, first, shown: '' });
    return true;
  }
  function verseFollow(finals, interim) {
    if (S.verseFollow === false || !S.vbAuto || screen.kind !== 'bible' || !screen.bible) return false;
    const r = screen.bible; if (!vfPrepare(r)) return false;
    // In step with the screen: a new reference, or the operator pressed next/previous.
    if (VF.shown !== refKey(r)) { VF.shown = refKey(r); VF.st = { cur: VF.first[r.v - 1] != null ? VF.first[r.v - 1] : 0, pend: -1, hits: 0 }; VF.heard = ''; }
    if (finals) VF.heard = (VF.heard + ' ' + Core.keyWords(finals)).slice(-300);
    const thr = S.thr / 100;
    let moved = false;
    for (const alt of (interim.length ? interim.slice(0, 2) : [''])) {
      if (Core.decide(VF.st, VF.lines, (VF.heard + ' ' + Core.keyWords(alt)).slice(-300), thr)) { moved = true; break; }
    }
    const reading = VF.st.score >= thr; if (reading) VF.at = Date.now();
    if (!moved) return reading;
    const v = VF.vOf[VF.st.cur];
    if (v < r.v || v > r.ve) { const nr = { book: r.book, ch: r.ch, v, ve: v }; VF.shown = refKey(nr); showBible(nr); }   // inside a shown range: stay
    return true;
  }
  function detectScript(txt) { return /[ഀ-ൿ]/.test(txt) ? 'ml' : /[஀-௿]/.test(txt) ? 'ta' : 'en'; }

  // Blank screen when singing continues but nothing matches.
  setInterval(() => {
    if (Listen.mode !== 'songs' || !S.blankAfter || screen.kind !== 'song' || screen.autoBlank || follow.cur < 0) return;
    const now = Date.now();
    // clip engines (Sarvam/Whisper): one or two words a clip, so it also takes three clips in a row that are clearly
    // something else (Trk.missN) - a quiet stretch of the recogniser is no reason to blank the lyrics
    if (Listen.engine === 'whisper' && (Trk.missN || 0) < 3) return;
    if (now - lastSpeechAt < 2500 && now - lastMatchAt > S.blankAfter * 1000) { screen.autoBlank = true; output(); }
  }, 500);

  /* ---------- backgrounds ---------- */
  function tile(ref, name, extra) {
    const b = el('button', 'bgtile' + (selBg === ref ? ' sel' : '')); b.type = 'button'; b.title = name;
    const info = Stage.bgInfo(ref, media);
    if (info.kind === 'css') { const sw = el('div', 'sw'); sw.style.background = info.css; b.appendChild(sw); }
    else if (info.kind === 'image') { const im = el('img'); im.src = info.url; im.alt = ''; im.loading = 'lazy'; b.appendChild(im); }
    else { const v = el('video'); v.src = info.url; v.muted = true; v.preload = 'metadata'; b.appendChild(v); }
    const tags = el('div', 'tags');
    if (S.bgChurch === ref) tags.appendChild(el('span', '', t('current_church')));
    if (S.bgBible === ref) tags.appendChild(el('span', '', t('current_bible')));
    b.append(tags, el('span', 'nm', name));
    b.onclick = () => { selBg = ref; renderBg(); };
    if (extra) b.appendChild(extra);
    return b;
  }
  function renderBg() {
    const bi = $('bgBuiltin'); bi.innerHTML = '';
    Stage.BUILTIN.forEach(x => bi.appendChild(tile('b:' + x.id, x.name)));
    const mine = $('bgMine'); mine.innerHTML = '';
    media.forEach(m => {
      const x = el('button', 'x', '✕'); x.type = 'button'; x.title = t('delete');
      x.onclick = async ev => {
        ev.stopPropagation();
        if (x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = t('delete_confirm'); setTimeout(() => { x.dataset.sure = ''; x.textContent = '✕'; }, 3000); return; }
        await Store.del('media', m.id); URL.revokeObjectURL(m.url); media.delete(m.id);
        const ref = 'm:' + m.id;
        if (S.bgChurch === ref) S.bgChurch = DEF.bgChurch; if (S.bgBible === ref) S.bgBible = DEF.bgBible;
        for (const s of songs) if (s.bg === ref) { s.bg = ''; Store.put('songs', s); }
        saveSettings(); renderBg(); output();
      };
      mine.appendChild(tile('m:' + m.id, m.name, x));
    });
    let act = $('bgActions');
    if (!act) { act = el('div', 'bgactions'); act.id = 'bgActions'; bi.parentNode.insertBefore(act, bi); }
    act.innerHTML = '';
    if (selBg) {
      const a = el('button', 'primary', t('use_church')); a.onclick = () => { S.bgChurch = selBg; saveSettings(); renderBg(); output(); toast(t('saved')); };
      const b2 = el('button', '', t('use_bible')); b2.onclick = () => { S.bgBible = selBg; saveSettings(); renderBg(); output(); toast(t('saved')); };
      act.append(a, b2);
    }
    bgOptions($('sfBg'), true);
  }
  async function addMedia(files) {
    for (const f of files) {
      const type = f.type.startsWith('video') ? 'video' : f.type.startsWith('image') ? 'image' : null;
      if (!type) continue;
      const m = { id: uid(), name: f.name.replace(/\.[^.]+$/, ''), type, blob: f };
      await Store.put('media', m);
      media.set(m.id, { id: m.id, name: m.name, type, url: URL.createObjectURL(f) });
    }
    renderBg(); toast(t('saved'));
  }

  /* ---------- OCR (online: downloads Tesseract.js and language data on first use) ---------- */
  let ocrWorker = null, ocrLangLoaded = '', ocrImage = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function setOcrImage(file) {
    ocrImage = file; const img = $('ocrImg'); img.src = URL.createObjectURL(file); img.hidden = false;
    runOcr();
  }
  async function runOcr() {
    if (!ocrImage) return;
    const st = $('ocrStatus'), langs = $('ocrLang').value;
    $('ocrCheck').hidden = true; $('ocrText').hidden = true; $('ocrSave').hidden = true;
    try {
      st.textContent = t('loading');
      if (location.protocol === 'file:') throw new Error('file');
      if (!window.Tesseract) await loadScript('vendor/tesseract/tesseract.min.js');
      if (!ocrWorker || ocrLangLoaded !== langs) {
        if (ocrWorker) { await ocrWorker.terminate(); ocrWorker = null; }
        ocrWorker = await Tesseract.createWorker(langs, 1, { workerPath: 'vendor/tesseract/worker.min.js', corePath: 'vendor/tesseract/', langPath: 'vendor/tessdata', gzip: false, logger: m => { if (m.progress != null) st.textContent = `${t('ocr_reading')} ${Math.round(m.progress * 100)}%`; } });
        ocrLangLoaded = langs;
      }
      st.textContent = t('ocr_reading') + '…';
      const { data } = await ocrWorker.recognize(ocrImage);
      const chk = $('ocrCheck'); chk.innerHTML = '';
      (data.lines || []).forEach(line => {
        const p = el('div');
        (line.words || []).forEach((w, i) => { if (i) p.appendChild(document.createTextNode(' ')); p.appendChild(w.confidence < 70 ? el('mark', '', w.text) : document.createTextNode(w.text)); });
        chk.appendChild(p);
      });
      const text = (data.text || '').replace(/\r/g, '').replace(/([\u0B80-\u0BFF])[\u200C\u200D]+/g, '$1').replace(/ന്\u200D?(?=\s|$)|ന്‍/g, 'ൻ').replace(/ര്‍/g, 'ർ').replace(/ല്‍/g, 'ൽ').replace(/ള്‍/g, 'ൾ').replace(/ണ്‍/g, 'ൺ').split('\n').map(s => s.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (!text) throw new Error('empty');
      $('ocrText').value = text; $('ocrTitle').value = text.split('\n')[0].slice(0, 60);
      $('ocrSongLang').value = langs.startsWith('mal') ? 'ml-IN' : langs.startsWith('tam') ? 'ta-IN' : 'en-IN';
      chk.hidden = false; $('ocrText').hidden = false; $('ocrSave').hidden = false;
      st.textContent = t('ocr_check');
    } catch (e) { st.textContent = e && e.message === 'file' ? t('file_warn') : t('ocr_fail'); }
  }

  /* ---------- backup ---------- */
  function blobToDataURL(b) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); }); }
  async function exportBackup() {
    const out = { app: 'lyricfollow', version: 2, exported: new Date().toISOString(), settings: S, service, songs: songs.map(({ id, title, lang, lyrics, bg, created, updated }) => ({ id, title, lang, lyrics, bg, created, updated })) };
    if ($('bkMedia').checked) {
      const all = await Store.all('media');
      out.media = await Promise.all(all.map(async m => ({ id: m.id, name: m.name, type: m.type, data: await blobToDataURL(m.blob) })));
    }
    const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `lyric-follow-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
  async function importBackup(file) {
    let d; try { d = JSON.parse(await file.text()); } catch (e) { d = null; }
    if (!d || d.app !== 'lyricfollow' || !Array.isArray(d.songs)) { toast(t('import_bad')); return; }
    for (const s of d.songs) {
      if (!s || !s.id || typeof s.lyrics !== 'string') continue;
      const rec = { id: String(s.id), title: String(s.title || t('untitled')), lang: s.lang || 'ml-IN', lyrics: s.lyrics, bg: s.bg || '', created: s.created || Date.now(), updated: Date.now() };
      await Store.put('songs', rec);
      const i = songs.findIndex(x => x.id === rec.id); if (i >= 0) songs[i] = rec; else songs.push(rec);
    }
    if (Array.isArray(d.media)) for (const m of d.media) {
      try { const blob = await (await fetch(m.data)).blob(); await Store.put('media', { id: m.id, name: m.name, type: m.type, blob }); if (!media.has(m.id)) media.set(m.id, { id: m.id, name: m.name, type: m.type, url: URL.createObjectURL(blob) }); } catch (e) {}
    }
    if (d.settings) { S = Object.assign({}, DEF, S, d.settings, { theme: Object.assign({}, DEF.theme, (d.settings || {}).theme) }); saveSettings(); }
    if (Array.isArray(d.service) && d.service.some(id => songById(id))) { service = d.service.filter(id => songById(id)); saveService(); }
    songsChanged(); toast(t('imported')); renderAll();
  }

  /* ---------- tabs, settings, keyboard ---------- */
  function setTab(name) {
    tab = name;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    document.querySelectorAll('.tab').forEach(s => { s.hidden = s.id !== 'tab-' + name; });
    if (name === 'songs') renderSongList();
    if (name === 'bible') { renderVChips(); renderBibleNav(); }
    if (name === 'bg') renderBg();
    if (name === 'live') renderSlides();
  }
  function renderSettings() {
    $('stLang').value = S.lang; $('stMode').value = S.mode; $('stThr').value = S.thr; $('stThrVal').textContent = S.thr + '%';
    const bl = $('stBlank'); bl.innerHTML = ''; bl.appendChild(new Option(t('off'), 0)); [5, 8, 12, 20].forEach(n => bl.appendChild(new Option(`${n} ${t('seconds')}`, n))); bl.value = S.blankAfter;
    $('stAutoSwitch').checked = S.autoSwitch; $('stLow').checked = S.low;
    $('thChurch').value = S.church; $('thSize').value = Math.round(S.theme.textScale * 100); $('thSizeVal').textContent = Math.round(S.theme.textScale * 100) + '%';
    $('thPos').value = S.theme.pos; $('thColor').value = S.theme.color; $('thShadow').checked = S.theme.shadow !== false;
    $('autoFollow').checked = S.autoFollow;
    for (const id of ['vbLang', 'vbLang2']) { const vb = $(id); vb.innerHTML = ''; vb.appendChild(new Option(t('lang_auto'), 'auto')); SONG_LANGS.forEach(([v, n]) => vb.appendChild(new Option(n, v))); vb.value = S.vbLang; }
    $('vbAuto').checked = S.vbAuto; $('vbAuto2').checked = S.vbAuto;
    const fw = $('fileWarn'); fw.hidden = location.protocol !== 'file:'; fw.textContent = t('file_warn');
    document.body.classList.toggle('low', S.low);
    const ab = $('aboutList'); ab.innerHTML = '';
    [
      'Malayalam Bible: Sathyavedapusthakam 1910 (public domain), data from github.com/godlytalias/Bible-Database',
      'Tamil Bible: Tamil Old Version / Union (public domain), data from github.com/godlytalias/Bible-Database',
      'KJV, WEB, BSB, ASV: public domain, data from github.com/seven1m/open-bibles',
      'Photo reading: Tesseract.js (Apache-2.0), loaded only when used',
      'Listening: speech recognition built into Google Chrome / Microsoft Edge (online)',
      'Fonts: Anek (SIL Open Font License) when online; system Indian-language fonts offline'
    ].forEach(x => ab.appendChild(el('li', '', x)));
  }
  function renderNet() {
    document.querySelectorAll('.netmode button').forEach(b => b.classList.toggle('sel', b.dataset.net === S.net));
    const d = $('netDot'); d.classList.toggle('on', navigator.onLine); d.title = navigator.onLine ? t('net_on') : t('net_off');
  }
  function setNet(m) {
    if (S.net === m) return;
    S.net = m; saveSettings(); renderNet();
    if (m === 'online' && !navigator.onLine) toast(t('no_internet'));
    if (Listen.mode) Listen.start(Listen.mode); else updateListenUI();
    toast(m === 'online' ? t('net_online_mode') : t('net_offline_mode'));
  }
  function renderAll() {
    applyI18n(); renderNet(); renderSettings(); renderService(); renderLive(); renderSongList(); updateListenUI();
    fillLangSelect($('sfLang')); fillLangSelect($('ocrSongLang'));
    const lf = $('songLangFilter'), lv = lf.value; fillLangSelect(lf, true); addFavOption(lf); lf.value = lv;
    if (tab === 'bible') { renderVChips(); renderBibleNav(); }
    if (tab === 'bg') renderBg();
    if (editingId || tab === 'songs') editSong(editingId);
    output();
  }

  function onKey(e) {
    const tg = e.target && e.target.tagName || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tg) || $('pickDlg').open || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') { step(1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { step(-1); e.preventDefault(); }
    else if (k === 'PageDown') { screen.kind === 'bible' ? step(1) : jumpSlide(1); e.preventDefault(); }
    else if (k === 'PageUp') { screen.kind === 'bible' ? step(-1) : jumpSlide(-1); e.preventDefault(); }
    else if (k === 'b' || k === 'B' || k === '.') { screen.black = !screen.black; output(); }
    else if (k === 'c' || k === 'C') { screen.bgOnly = !screen.bgOnly; output(); }
    else if (k === 'a' || k === 'A') { S.autoFollow = !S.autoFollow; $('autoFollow').checked = S.autoFollow; saveSettings(); }
    else if (k === 'l' || k === 'L') { Listen.mode ? Listen.stop() : Listen.start(); }
    else if (k === 'Enter' && asked) { acceptAsk(); e.preventDefault(); }
    else if (k === 'Escape' && asked) { hideAsk(); e.preventDefault(); }
  }

  function openPicker() {
    const dlg = $('pickDlg'); $('pickSearch').value = ''; renderPicker(); dlg.showModal(); $('pickSearch').focus();
  }
  function renderPicker() {
    const ul = $('pickList'); ul.innerHTML = '';
    const list = sortedSongs($('pickSearch').value, '');
    if (!list.length) { ul.appendChild(el('li', 'empty', t('no_songs'))); return; }
    list.forEach(s => {
      const li = el('li'), b = el('button');
      b.append(star(s.id), el('span', 't', s.title), el('span', 'chip', LANG_SHORT[s.lang] || ''));
      if (service.includes(s.id)) b.append(el('span', 'chip', '✓'));
      b.onclick = () => { if (!service.includes(s.id)) { service.push(s.id); saveService(); } $('pickDlg').close(); renderService(); if (!song) loadSong(s.id); };
      li.appendChild(b); ul.appendChild(li);
    });
  }

  /* ---------- wiring ---------- */
  function wire() {
    document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
    document.querySelectorAll('.langs button').forEach(b => b.onclick = () => { S.lang = b.dataset.lang; saveSettings(); renderAll(); });
    document.querySelectorAll('.netmode button').forEach(b => b.onclick = () => setNet(b.dataset.net));
    window.addEventListener('online', () => { renderNet(); });
    window.addEventListener('offline', () => { renderNet(); });
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', e => { if (Listen.mode || (projWin && !projWin.closed)) { e.preventDefault(); e.returnValue = ''; } });

    // deck
    $('btnProjector').onclick = openProjector;
    $('btnPrev').onclick = () => step(-1);
    $('btnNext').onclick = () => step(1);
    $('btnBlack').onclick = () => { screen.black = !screen.black; output(); };
    $('btnBgOnly').onclick = () => { screen.bgOnly = !screen.bgOnly; output(); };
    const toggleListen = () => Listen.mode ? Listen.stop() : (S.listenMode === 'bible' && (vbText = ''), Listen.start());
    document.querySelectorAll('.seg button').forEach(b => b.onclick = () => setListenMode(b.dataset.lm));
    $('vbLang2').onchange = e => { S.vbLang = e.target.value; $('vbLang').value = S.vbLang; saveSettings(); if (Listen.mode === 'bible') Listen.start('bible'); };
    $('vbAuto2').onchange = e => { S.vbAuto = e.target.checked; $('vbAuto').checked = S.vbAuto; saveSettings(); };
    $('vfOn').checked = S.verseFollow !== false; $('vfOn').onchange = e => { S.verseFollow = e.target.checked; saveSettings(); };
    $('planInput').value = S.plan || '';
    $('planInput').oninput = () => { S.plan = $('planInput').value; saveSettings(); renderPlan(); };
    renderPlan(); ensureVersions().then(renderPlan);
    $('btnAskShow').onclick = acceptAsk; $('btnAskNo').onclick = hideAsk;
    // Psalm reading and the quiz
    $('psGo').onclick = () => psalmStart($('psN').value, $('psV').value);
    for (const id of ['psN', 'psV']) $(id).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('psGo').click(); } };
    renderPsalmUI();
    $('quizMode').value = S.quiz || 'show'; $('quizMode').onchange = e => { S.quiz = e.target.value; saveSettings(); if (S.quiz !== 'off') quizLoad(); };
    $('quizDelay').value = String(S.quizDelay == null ? 4 : S.quizDelay); $('quizDelay').onchange = e => { S.quizDelay = +e.target.value; saveSettings(); };
    $('btnQuizShow').onclick = () => { const q = quizAsked; if (q) showQuiz(q, true); };
    $('btnQuizNo').onclick = hideQuizAsk;
    if (S.quiz !== 'off') setTimeout(quizLoad, 4000);
    const listenClick = () => { if (Listen.mode && Listen.engine === 'cloud' && Cloud.stalled) Cloud.resume(); else toggleListen(); };
    // On phones any tap on the page counts as the user gesture the browser wants: resume without hunting for the button.
    document.addEventListener('touchend', () => { if (Listen.mode && Listen.engine === 'cloud' && Cloud.stalled) Cloud.resume(); }, { passive: true });
    $('btnListen').onclick = listenClick; $('btnListen2').onclick = listenClick;
    $('autoFollow').onchange = e => { S.autoFollow = e.target.checked; saveSettings(); };
    $('btnSuggestYes').onclick = () => { const id = suggestId, line = +$('suggest').dataset.line || 0; hideSuggest(); if (id) switchToSong(id, line); };
    $('btnSuggestNo').onclick = () => { hideSuggest(); };

    // live
    $('btnAddToService').onclick = openPicker;
    $('pickClose').onclick = () => $('pickDlg').close();
    $('pickSearch').oninput = renderPicker;
    $('btnLiveEdit').onclick = () => { if (song) { setTab('songs'); editSong(song.id); } };

    // songs
    $('songSearch').oninput = renderSongList;
    $('songLangFilter').onchange = renderSongList;
    $('sfFav').onclick = () => { if (editingId) toggleFav(editingId); };
    // No link yet: one tap searches YouTube for this song (most-viewed results first is YouTube's own ordering);
    // copy the chosen video's link back into the box and Save.
    $('sfYtFind').onclick = () => {
      const title = ($('sfTitle').value || '').replace(/\(.*?\)/g, ' ').trim(); if (!title) return;
      const hint = { 'ta-IN': 'tamil christian song', 'ml-IN': 'malayalam christian song', 'en-IN': 'hymn' }[$('sfLang').value] || 'christian song';
      window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(title + ' ' + hint), '_blank', 'noopener');
    };
    $('btnNewSong').onclick = () => editSong(null);
    $('songForm').onsubmit = async e => {
      e.preventDefault();
      const data = { title: $('sfTitle').value.trim() || t('untitled'), lang: $('sfLang').value, bg: $('sfBg').value, lyrics: $('sfLyrics').value, yt: Track.parse($('sfYt').value) };
      if (sfTidied && data.lyrics === sfTidied.text) data.parts = sfTidied.parts;
      const s = await saveSong(data, editingId);
      editingId = s.id; toast(t('saved')); editSong(s.id); renderService();
    };
    // Tidy: one stanza (up to 4 lines) a slide, headings and cues out, the chorus after each verse - see js/tidy.js
    let sfTidied = null;
    $('sfTidy').onclick = () => {
      const r = LFTidy.tidy($('sfLyrics').value); if (!r.lyrics) return;
      $('sfLyrics').value = r.lyrics; sfTidied = { text: r.lyrics, parts: r.parts.join(' ') };
      toast(t('tidy_done_one') + (r.other ? ' · ' + t('tidy_other') : ''));
    };
    const ownSongs = () => songs.filter(x => !/wikisource\.org|freegospelsongs\.in/.test(x.src || ''));
    $('btnTidyAll').onclick = async () => {
      const own = ownSongs(), backup = [], recs = []; const now = Date.now();
      for (const x of own) {
        const r = LFTidy.tidy(x.lyrics); if (!r.lyrics || r.lyrics === x.lyrics) continue;
        backup.push({ id: x.id, lyrics: x.lyrics, parts: x.parts || '' });
        Object.assign(x, { lyrics: r.lyrics, parts: r.parts.join(' '), updated: now }); recs.push(x);
      }
      if (!recs.length) { toast(t('tidy_none')); return; }
      await Store.set('tidy-backup', { at: now, items: backup }); await Store.putMany('songs', recs);
      prepCache.clear(); songsChanged(); renderSongList(); if (song) loadSong(song.id, { keepScreen: true });
      $('btnTidyUndo').hidden = false; toast(`${recs.length} ${t('tidy_done_all')}`);
    };
    $('btnTidyUndo').onclick = async () => {
      const b = await Store.get('tidy-backup'); if (!b || !b.items) return;
      const recs = []; for (const it of b.items) { const x = songById(it.id); if (x) { Object.assign(x, { lyrics: it.lyrics, parts: it.parts, updated: Date.now() }); recs.push(x); } }
      await Store.putMany('songs', recs); await Store.set('tidy-backup', null);
      prepCache.clear(); songsChanged(); renderSongList(); if (song) loadSong(song.id, { keepScreen: true });
      $('btnTidyUndo').hidden = true; toast(t('tidy_undone'));
    };
    Store.get('tidy-backup').then(b => { if (b && b.items && b.items.length) $('btnTidyUndo').hidden = false; }).catch(() => {});
    $('sfDelete').onclick = async () => {
      const b = $('sfDelete');
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = t('delete_confirm'); setTimeout(() => { b.dataset.sure = ''; b.textContent = t('delete'); }, 3000); return; }
      b.dataset.sure = ''; b.textContent = t('delete');
      const id = editingId; await Store.del('songs', id);
      songs = songs.filter(s => s.id !== id); service = service.filter(x => x !== id); saveService(); songsChanged();
      if (song && song.id === id) loadSong(null);
      editSong(null); renderService();
    };
    $('sfService').onclick = () => { if (editingId && !service.includes(editingId)) { service.push(editingId); saveService(); renderService(); editSong(editingId); toast(t('in_service')); } };

    // bible
    $('refForm').onsubmit = e => { e.preventDefault(); hideSuggestBox(); gotoRef($('refInput').value); };
    $('refInput').addEventListener('input', renderSuggest);
    $('refInput').addEventListener('focus', renderSuggest);
    $('refInput').addEventListener('blur', () => setTimeout(hideSuggestBox, 120));
    $('refInput').addEventListener('keydown', e => {
      if ($('refSuggest').hidden) return;
      if (e.key === 'ArrowDown') { moveSuggest(1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { moveSuggest(-1); e.preventDefault(); }
      else if ((e.key === 'Enter' || e.key === 'Tab') && sugIdx >= 0) { pickSuggest(sugIdx); e.preventDefault(); }
      else if (e.key === 'Escape') hideSuggestBox();
    });
    $('bkSel').onchange = e => { S.bk = +e.target.value; S.ch = 1; saveSettings(); renderBibleNav(); };
    $('chSel').onchange = e => { S.ch = +e.target.value; saveSettings(); renderBibleNav(); };
    let st; $('bsInput').oninput = e => { clearTimeout(st); st = setTimeout(() => bibleSearch(e.target.value), 300); };
    $('bsForm').onsubmit = e => { e.preventDefault(); bibleSearch($('bsInput').value); };

    // backgrounds + theme
    $('bgUpload').onchange = e => { addMedia([...e.target.files]); e.target.value = ''; };
    $('thChurch').oninput = e => { S.church = e.target.value; saveSettings(); output(); };
    $('thSize').oninput = e => { S.theme.textScale = +e.target.value / 100; $('thSizeVal').textContent = e.target.value + '%'; saveSettings(); output(); };
    $('thPos').onchange = e => { S.theme.pos = e.target.value; saveSettings(); output(); };
    $('thColor').onchange = e => { S.theme.color = e.target.value; saveSettings(); output(); };
    $('thShadow').onchange = e => { S.theme.shadow = e.target.checked; saveSettings(); output(); };

    // online
    $('vbLang').onchange = e => { S.vbLang = e.target.value; $('vbLang2').value = S.vbLang; saveSettings(); if (Listen.mode === 'bible') Listen.start('bible'); };
    $('vbAuto').onchange = e => { S.vbAuto = e.target.checked; $('vbAuto2').checked = S.vbAuto; saveSettings(); };
    $('btnVB').onclick = () => { if (Listen.mode === 'bible') Listen.stop(); else { vbText = ''; S.listenMode = 'bible'; saveSettings(); Listen.start('bible'); } };
    $('ocrFile').onchange = e => { if (e.target.files[0]) setOcrImage(e.target.files[0]); e.target.value = ''; };
    $('ocrLang').onchange = () => runOcr();
    document.addEventListener('paste', e => {
      if (tab !== 'online') return;
      const item = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); setOcrImage(item.getAsFile()); }
    });
    $('btnOcrSave').onclick = async () => {
      const s = await saveSong({ title: $('ocrTitle').value.trim() || t('untitled'), lang: $('ocrSongLang').value, bg: '', lyrics: $('ocrText').value }, null);
      toast(t('song_saved')); setTab('songs'); editSong(s.id);
    };

    // settings
    $('stLang').onchange = e => { S.lang = e.target.value; saveSettings(); renderAll(); };
    $('stMode').onchange = e => { S.mode = e.target.value; saveSettings(); output(); };
    $('stThr').oninput = e => { S.thr = +e.target.value; $('stThrVal').textContent = S.thr + '%'; saveSettings(); };
    $('stBlank').onchange = e => { S.blankAfter = +e.target.value; saveSettings(); };
    $('stAutoSwitch').onchange = e => { S.autoSwitch = e.target.checked; saveSettings(); };
    $('stAutoMode').checked = !!S.autoMode; $('stAutoMode').onchange = e => { S.autoMode = e.target.checked; saveSettings(); };
    $('packMl').onclick = () => Packs.install('ml'); $('packEn').onclick = () => Packs.install('en'); $('packTa').onclick = () => Packs.installLocal('vendor/songs-ta-fgs.json');
    $('bulkFiles').onchange = e => { const fs = [...e.target.files]; if (fs.length) Bulk.importFiles(fs, $('bulkService').checked); e.target.value = ''; };
    $('trkPlay').onclick = () => Track.play(); $('trkStop').onclick = () => Track.stop();
    $('trkVol').oninput = e => { S.trackVol = +e.target.value; saveSettings(); if (Track.ready) Track.player.setVolume(S.trackVol); };
    $('trkSize').onchange = e => { S.trackSize = e.target.value; saveSettings(); $('ytWrap').classList.toggle('compact', S.trackSize === 'compact'); };
    $('sfYt').addEventListener('input', () => Track.describe()); $('sfYtPick').onclick = () => Track.openPicker(true);
    $('trkPickClose').onclick = () => { $('trackPicker').hidden = true; }; $('trkAutoMatch').onclick = () => Track.autoMatch();
    Track.loadCatalog().then(() => { Track.describe(); if (song && song.yt) $('trackName').textContent = Track.chapterName(song.yt) || song.yt.id; });
    $('stWhOn').checked = !!S.groq; $('stWhKey').value = S.groqKey || ''; $('stWhModel').value = S.groqModel || 'whisper-large-v3'; $('stWhBible').checked = !!S.groqBible;
    const saveKeys = () => { S.keysAt = Date.now(); const kr = {}; for (const k of KEYS) kr[k] = S[k]; Store.set('keys', kr).catch(() => {}); };
    const whRe = () => { saveKeys(); saveSettings(); updateListenUI(); if (Listen.mode) Listen.start(Listen.mode); };
    $('stWhOn').onchange = e => { S.groq = e.target.checked; whRe(); };
    $('stWhKey').onchange = e => { const v = e.target.value.trim(); if (v && !/^gsk_/.test(v)) { e.target.value = S.groqKey || ''; toast(t('whisper_badkey')); return; } S.groqKey = v; whRe(); };
    $('stWhModel').onchange = e => { S.groqModel = e.target.value || 'whisper-large-v3'; whRe(); };
    $('stWhBible').onchange = e => { S.groqBible = e.target.checked; whRe(); };
    // Cloudflare Worker (Workers AI Whisper, free daily allocation) - the second free service after Groq.
    $('stCfUrl').value = S.cfUrl || ''; $('stCfKey').value = S.cfKey || '';
    $('stCfUrl').onchange = e => { const v = e.target.value.trim().replace(/\/+$/, ''); if (v && !/^https:\/\//.test(v)) { e.target.value = S.cfUrl || ''; toast(t('cf_badurl')); return; } S.cfUrl = v; whRe(); };
    $('stCfKey').onchange = e => { S.cfKey = e.target.value.trim(); whRe(); };
    $('stSvKey').value = S.sarvamKey || ''; $('stSvOn').checked = S.sarvam !== false;
    $('stSvKey').onchange = e => { S.sarvamKey = e.target.value.trim(); whRe(); };
    $('stSvOn').onchange = e => { S.sarvam = e.target.checked; whRe(); };
    $('stSvCap').value = S.sarvamCap || ''; $('stSvCap').onchange = e => { S.sarvamCap = Math.max(0, Math.round(+e.target.value || 0)); SvUse.warned = false; saveSettings(); };
    $('stFast').checked = S.followFast !== false; $('stFast').onchange = e => { S.followFast = e.target.checked; saveSettings(); };
    // the browser's own noise filter on the microphone: changed on the running microphone at once
    $('stNs').checked = S.micNs !== false; $('stNs').onchange = e => { S.micNs = e.target.checked; saveSettings(); Mic.ns(S.micNs); };
    $('stVbAi').checked = S.vbAI !== false; $('stVbAi').onchange = e => { S.vbAI = e.target.checked; saveSettings(); };
    $('stVbAiCap').value = S.vbAiCap == null ? 20 : S.vbAiCap; $('stVbAiCap').onchange = e => { S.vbAiCap = Math.max(0, +e.target.value || 0); saveSettings(); };
    SvUse.render();
    $('stWhReset').onclick = () => { try { localStorage.removeItem('lf-wh-block'); } catch (e) {} Whisper._bl = {}; toast(t('wh_reset_done')); };
    $('stGemOn').checked = !!S.gemini; $('stGemKey').value = S.geminiKey || ''; $('stGemModel').value = S.geminiModel || 'gemini-2.5-flash-lite';
    $('stGemOn').onchange = e => { S.gemini = e.target.checked; saveKeys(); saveSettings(); updateListenUI(); if (Listen.mode) Listen.start(Listen.mode); };
    $('stGemKey').onchange = e => { S.geminiKey = e.target.value.trim(); saveKeys(); saveSettings(); updateListenUI(); if (Listen.mode) Listen.start(Listen.mode); };
    $('stGemModel').onchange = e => { S.geminiModel = e.target.value.trim() || 'gemini-2.5-flash-lite'; saveSettings(); };
    $('stLow').onchange = e => { S.low = e.target.checked; saveSettings(); document.body.classList.toggle('low', S.low); const st2 = projWin && !projWin.closed && projWin.document.getElementById('stage'); if (st2 && st2._lf) st2._lf.bgKey = null; if ($('preview')._lf) $('preview')._lf.bgKey = null; output(); };
    $('btnExport').onclick = exportBackup;
    $('importFile').onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; };

    window.addEventListener('resize', () => output());
  }

  /* ---------- start ---------- */
  async function init() {
    setTimeout(() => { try { renderHeardRefs(); VerseAI.render(); } catch (e) {} }, 1500);
    // Microphone already allowed: open it now, so the level and the microphone check show before the service and the
    // audio chain has settled by the first song
    setTimeout(() => { try { if (Mic.warm() && navigator.permissions) navigator.permissions.query({ name: 'microphone' }).then(p => { if (p.state === 'granted' && !Mic.stream) Mic.start(); }).catch(() => {}); } catch (e) {} }, 2500);
    if (location.protocol === 'file:') {
      // Opened by double-clicking index.html. If "Start Lyric Follow.bat" is running, go there (mic permission is remembered, offline voice works).
      try { const r = await fetch('http://localhost:8765/manifest.webmanifest', { mode: 'no-cors', cache: 'no-store' }); if (r) { location.replace('http://localhost:8765/index.html'); return; } } catch (e) {}
    }
    const saved = await Store.get('settings').catch(() => null);
    if (saved) {
      S = Object.assign({}, DEF, saved, { theme: Object.assign({}, DEF.theme, saved.theme) });
      // API keys live in their own record, written only when a key is typed in: an older tab saving its whole
      // settings can then never put an old key back (seen live, repeatedly, with the Groq key).
      try { const kr = await Store.get('keys'); if (kr) for (const k of KEYS) if (k in kr) S[k] = kr[k]; } catch (e) {}
      if ((saved.v || 0) < 3) { S.autoSwitch = true; S.net = 'offline'; S.v = 3; saveSettings(); }
      if ((saved.v || 0) < 4) { S.vbLang = 'auto'; S.v = 4; saveSettings(); }
      // v5: the online recogniser is the primary engine (best accuracy in all three languages); verses show automatically.
      if ((saved.v || 0) < 5) { S.net = 'online'; S.vbAuto = true; S.v = 5; saveSettings(); }
      // v6: Singing listens only for songs and Preacher only for Bible verses, unless automatic switching is turned on.
      if ((saved.v || 0) < 6) { S.autoMode = false; S.v = 6; saveSettings(); }
    }
    else { const nl = (navigator.language || '').slice(0, 2); if (nl === 'ml' || nl === 'ta') S.lang = nl; }
    songs = await Store.all('songs').catch(() => []);
    if (!songs.length && !saved) {
      for (const x of SAMPLES) { const s = { id: uid(), bg: '', created: Date.now(), updated: Date.now(), ...x }; songs.push(s); await Store.put('songs', s).catch(() => {}); }
      service = songs.map(s => s.id); saveService();
    } else service = (await Store.get('service').catch(() => null)) || [];
    favs = new Set((await Store.get('favs').catch(() => null)) || []);
    for (const m of await Store.all('media').catch(() => [])) { try { media.set(m.id, { id: m.id, name: m.name, type: m.type, url: URL.createObjectURL(m.blob) }); } catch (e) {} }

    const css = document.createElement('style'); css.textContent = Stage.CSS; document.head.appendChild(css);
    wire();
    fillLangSelect($('sfLang')); fillLangSelect($('songLangFilter'), true); addFavOption($('songLangFilter')); fillLangSelect($('ocrSongLang'));
    rebuildSongIndex();
    renderAll(); setTab('live');
    if (service[0]) loadSong(service[0]);
    // Bundled song collections arrive after the screen is up, so the first paint is never delayed.
    setTimeout(() => Packs.installBundled(), 800);
    if (!SR) $('supportMsg').innerHTML = `<p class="msg">${t('need_chrome')}</p>`;
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    // Load the chosen Bible versions in the background so the Bible tab opens instantly.
    setTimeout(() => ensureVersions().then(() => { if (tab === 'bible') renderBibleNav(); }), 1500);
  }
  // Test hook: lets automated checks feed recognised text without a microphone.
  window.LF_DEBUG = {
    ns(on) { return Mic.ns(on); },
    // timing per listening mode and service (seconds, p50 / p95): audio end -> answer (clip modes), answer -> screen,
    // and the hand-overs between services with the gap without words
    timing() {
      const q = (a, f) => { const b = a.filter(x => x >= 0).sort((x, y) => x - y); return b.length ? +(b[Math.min(b.length - 1, Math.floor(f * b.length))] / 1000).toFixed(2) : null; };
      const by = {};
      for (const e of Diag.log) { if (!e.text) continue; const k = e.eng + ':' + e.prov; (by[k] = by[k] || []).push(e); }
      const out = {};
      for (const [k, L] of Object.entries(by)) {
        const net = L.filter(x => x.end).map(x => x.got - x.end), ui = L.filter(x => x.done).map(x => x.done - x.got);
        out[k] = { texts: L.length, moved: L.filter(x => x.to !== x.from).length, audioEndToAnswer: net.length ? { p50: q(net, .5), p95: q(net, .95) } : null, answerToScreen: { p50: q(ui, .5), p95: q(ui, .95) }, retried: L.filter(x => x.retry).length };
      }
      return { modes: out, handoffs: Diag.hand.slice(-10), stale: Whisper.tlog.filter(x => x.stale).length };
    },
    handoffs: () => Diag.hand.slice(),
    // the clip log itself, for a local copy (nothing is sent anywhere)
    clips: () => JSON.stringify(Whisper.tlog),
    quiz: () => ({ n: window.LFQuiz ? LFQuiz.count() : 0, screen: screen.quiz ? { a: screen.quiz.q.a.en, shown: screen.quiz.shown } : null, asked: quizAsked ? quizAsked.a.en : null }),
    psalm: (n, v) => psalmStart(n, v),
        feed(text, isFinal, conf) { onText(isFinal ? text : '', isFinal ? [] : [text], conf); },
    quiet(ms) { lastMatchAt = Date.now() - ms; },
    setLang(l) { Listen.lang = l; },
    close() { loadSong(null); },
    lines: () => lines.map((l, i) => i + (l.alt ? '~ ' : ' ') + l.text),
    whisper: () => ({ engine: Listen.engine, provider: Whisper.cur && Whisper.cur.id, blocked: Whisper.blocked(), every: Whisper.interval(Whisper.cur), plan: Whisper.plan(Whisper.cur), quiet: Whisper.quiet, ai: VerseAI.log || [], libN: Lib.ix ? Lib.ix.N : 0, songsN: songs.length, svUse: SvUse.get(), fitAgo: Date.now() - (Trk.fitAt || 0), left: Whisper.left, spw: Lead.spw, sent: Whisper.sent, fails: Whisper.fails, prompt: Whisper.prompt(), lang: Whisper.lang() }),
    open(title, toService) { const s = songs.find(x => x.title === title); if (!s) return null; if (toService !== false && !service.includes(s.id)) { service.push(s.id); saveService(); } loadSong(s.id, { restart: true }); return s.id; },
    service(titles) { service = titles.map(tt => (songs.find(x => x.title === tt) || {}).id).filter(Boolean); renderService(); return service.length; },
    async addSong(title, lang, lyrics) { const s = await saveSong({ title, lang, lyrics }); if (!service.includes(s.id)) { service.push(s.id); saveService(); } rebuildSongIndex(); loadSong(s.id); return s.id; },
    mode(m) { Listen.mode = m; Listen.engine = S.net === 'online' ? 'cloud' : 'local'; if (m) Listen.lang = m === 'bible' ? S.vbLang : (song ? song.lang : 'ml-IN'); updateListenUI(); },
    lid: () => ({ votes: LangID.votes, disabled: LangID.disabled, lastAt: LangID.lastAt, ws: LangID.ws && LangID.ws.readyState, busy: LangID.busy, raw: LangID.raw }),
    state: () => ({ cur: follow.cur, song: song && song.title, svc: service.map(id => (songById(id) || {}).title), screen: Object.assign({}, screen), svcRows: Svc.ix ? Svc.ix.rows.length : 0, svcLog: Svc.log.slice(-12), cues: Track.cues || 0, favs: [...favs], heardRefs: heardRefs.map(h => Bible.refLabel(h.r, 'en')), lang: Listen.lang, asked: asked && Bible.refLabel(asked, 'en'), vf: { cur: VF.st.cur, score: VF.st.score, raw: VF.st.raw, pend: VF.st.pend, hits: VF.st.hits, v: VF.vOf[VF.st.cur], hold: PSF.hold }, moves: Lead.moves.slice(-60), trk: Trk.log.slice(-40) })
  };
  init();
})();
