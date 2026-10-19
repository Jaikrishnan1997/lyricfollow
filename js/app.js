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
    lang: 'en', mode: 'slide', thr: 50, blankAfter: 8, autoSwitch: true, low: false, net: 'offline', v: 4,
    bgChurch: 'b:navy', bgBible: 'b:slate', church: '',
    theme: { textScale: 1, pos: 'center', shadow: true, color: 'auto' },
    versions: ['mal1910', 'kjv'], vbLang: 'auto', vbAuto: false, bk: 42, ch: 3, autoFollow: true, listenMode: 'songs'
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
  let song = null, lines = [], slides = [];
  const follow = { cur: -1, pend: -1, hits: 0, score: 0 };
  const screen = { kind: 'idle', black: false, bgOnly: false, autoBlank: false, bible: null };
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
  function saveSettings() { clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.set('settings', S).catch(() => {}), 300); }
  function saveService() { Store.set('service', service).catch(() => {}); }

  /* ---------- songs ---------- */
  function parseLyrics(text) {
    const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
    const ls = [], sl = [];
    blocks.forEach((b, si) => { const idx = []; b.forEach(x => { idx.push(ls.length); ls.push({ text: x, slide: si }); }); sl.push(idx); });
    Core.prepare(ls.map(l => l.text)).forEach((p, i) => Object.assign(ls[i], p));
    return { ls, sl };
  }
  const prepCache = new Map();
  function prepared(s) {
    const k = s.id + ':' + (s.updated || 0);
    if (!prepCache.has(k)) prepCache.set(k, parseLyrics(s.lyrics).ls);
    return prepCache.get(k);
  }
  const songById = id => songs.find(s => s.id === id);

  function loadSong(id, opts) {
    song = songById(id) || null;
    const p = parseLyrics(song ? song.lyrics : '');
    lines = p.ls; slides = p.sl;
    const startLine = opts && opts.line != null && lines[opts.line] ? opts.line : -1;
    follow.cur = startLine; follow.pend = -1; follow.hits = 0; follow.score = 0;
    heardKey = ''; lastMatchAt = Date.now(); screen.autoBlank = false; hideSuggest();
    if (!opts || !opts.keepScreen) { screen.kind = song ? 'song' : 'idle'; screen.bgOnly = false; }
    if (song && Listen.mode === 'bible') { S.listenMode = 'songs'; saveSettings(); Listen.start('songs'); }
    else if (Listen.mode === 'songs' && song && Listen.lang !== song.lang) Listen.setLang(song.lang);
    renderService(); renderLive(); output();
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
    if (screen.kind === 'song' && song) {
      p.bg = song.bg || S.bgChurch;
      if (screen.bgOnly || screen.autoBlank || follow.cur < 0 || !lines[follow.cur]) { p.kind = 'blank'; return p; }
      p.kind = 'lyrics';
      const cur = lines[follow.cur];
      if (S.mode === 'pair') { p.lines = [{ t: cur.text, on: true }]; if (lines[follow.cur + 1]) p.lines.push({ t: lines[follow.cur + 1].text, on: false }); }
      else p.lines = slides[cur.slide].map(i => ({ t: lines[i].text, on: S.mode === 'plain' || i === follow.cur }));
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
    st.textContent = screen.black ? t('black') : p.kind === 'lyrics' ? t('tab_songs') : p.kind === 'bible' ? t('tab_bible') : p.kind === 'blank' ? t('bg_only') : t('screen_idle');
    st.classList.toggle('on', !screen.black && (p.kind === 'lyrics' || p.kind === 'bible'));
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
    screen.kind = 'song'; screen.bgOnly = false; screen.autoBlank = false;
    follow.cur = Math.max(0, Math.min(lines.length - 1, i)); follow.pend = -1; heardKey = ''; lastMatchAt = Date.now();
    renderSlides(); output();
  }
  function jumpSlide(dir) {
    if (!lines.length) return;
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
      const b = el('button', 't', s.title); b.title = s.title; b.onclick = () => loadSong(id);
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
  function renderSlides() {
    const box = $('slides'); box.innerHTML = '';
    if (!song) { box.appendChild(el('div', 'empty', t('service_empty'))); return; }
    if (!lines.length) { box.appendChild(el('div', 'empty', t('lyrics_hint'))); return; }
    const curSlide = follow.cur >= 0 && lines[follow.cur] ? lines[follow.cur].slide : -1;
    slides.forEach((idx, si) => {
      const d = el('div', 'slide' + (si === curSlide && screen.kind === 'song' ? ' live' : ''));
      const n = el('div', 'n'); n.append(el('span', '', t('slide') + ' ' + (si + 1)), el('span', '', si === curSlide && screen.kind === 'song' ? t('on_screen') : ''));
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
  function sortedSongs(q, lang) {
    const ql = (q || '').trim().toLowerCase(), qk = Core.key(ql);
    return songs.filter(s => (!lang || s.lang === lang) && songMatches(s, ql, qk)).sort((a, b) => a.title.localeCompare(b.title));
  }
  function renderSongList() {
    const ul = $('songList'); ul.innerHTML = '';
    const list = sortedSongs($('songSearch').value, $('songLangFilter').value);
    if (!list.length) { ul.appendChild(el('li', 'empty', t('no_songs'))); return; }
    list.forEach(s => {
      const li = el('li'), b = el('button', s.id === editingId ? 'sel' : '');
      b.append(el('span', 't', s.title), el('span', 'chip', LANG_SHORT[s.lang] || ''));
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
    $('sfDelete').hidden = !s;
    $('sfService').hidden = !s;
    $('sfService').textContent = s && service.includes(s.id) ? t('in_service') : t('add_to_service');
    $('sfService').disabled = !!(s && service.includes(s.id));
    renderSongList();
    if (!s) $('sfTitle').focus();
  }
  async function saveSong(data, id) {
    const now = Date.now();
    let s = id ? songById(id) : null;
    if (s) Object.assign(s, data, { updated: now });
    else { s = Object.assign({ id: uid(), bg: '', created: now, updated: now }, data); songs.push(s); }
    await Store.put('songs', { id: s.id, title: s.title, lang: s.lang, lyrics: s.lyrics, bg: s.bg || '', created: s.created || now, updated: s.updated });
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
    if (!Bible.loaded(pv)) { ol.appendChild(el('li', 'empty', t('loading'))); await ensureVersions(); if (!Bible.loaded(pv)) return; }
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
  async function showBible(r) {
    await ensureVersions();
    screen.kind = 'bible'; screen.bible = r; screen.bgOnly = false; screen.black = false; screen.autoBlank = false;
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
  function pushHeardRef(r, src, sure) {
    const k = refKey(r);
    const prev = heardRefs.find(x => refKey(x.r) === k);
    lastRefAt = Date.now();
    if (prev && Date.now() - prev.at < 30000) {
      // Same reference again within half a minute: no duplicate in the list; re-show it only if the screen moved away.
      prev.at = Date.now(); if (sure) prev.sure = true;
      if (S.vbAuto && (sure || prev.sure) && !(screen.kind === 'bible' && screen.bible && refKey(screen.bible) === k)) showBible(r);
      renderHeardRefs(); return;
    }
    heardRefs.unshift({ r, src, at: Date.now(), sure: !!sure }); heardRefs.length = Math.min(heardRefs.length, 10);
    renderHeardRefs();
    if (S.vbAuto && sure) showBible(r); else toast((sure ? '' : '? ') + Bible.refLabel(r, 'en'));
  }
  function renderHeardRefs() {
    for (const id of ['heardRefs', 'heardRefs2']) {
      const ol = $(id); ol.innerHTML = '';
      heardRefs.forEach(h => { const li = refButton(h.r); if (!h.sure) li.querySelector('button').classList.add('unsure'); ol.appendChild(li); });
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
  const localUrl = lang => 'ws://127.0.0.1:' + (LOCAL_PORTS[String(lang || 'ml').slice(0, 2)] || 6011);
  let heardKey = '', lastMatchAt = Date.now(), lastSpeechAt = 0, lastEventAt = 0, vbText = '', vbWordsAtQuote = 0;
  let detect = { id: null, n: 0 }, lastDetectAt = 0, suggestId = null, songIx = null, quoteBusy = false;

  // One microphone capture shared by the level meter and the offline engine.
  const Mic = {
    stream: null, ac: null, an: null, proc: null, raf: 0, ring: null, pos: 0, rate: 16000, filled: 0,
    async start() {
      if (this.stream) return true;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
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
      const buf = new Uint8Array(this.an.fftSize); let last = 0;
      const tick = ts => {
        if (!this.stream) return;
        if (ts - last > (S.low ? 200 : 70)) {
          last = ts; this.an.getByteTimeDomainData(buf);
          let p = 0; for (const v of buf) { const x = Math.abs(v - 128); if (x > p) p = x; }
          const w = Math.min(100, p / 1.1) + '%'; $('level').style.width = w; $('level2').style.width = w;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
      return true;
    },
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
      $('level').style.width = '0'; $('level2').style.width = '0';
    }
  };

  // Online engine (browser speech recognition). A fresh recogniser is created on every restart: Edge in particular
  // can stop delivering results silently, so a watchdog restarts it when nothing arrives for a while.
  const Cloud = {
    rec: null, lang: '', timer: null, fails: 0,
    start(lang) {
      this.stop(); this.lang = lang; lastEventAt = Date.now();
      const rec = this.rec = new SR();
      rec.lang = lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = S.low ? 1 : 3;
      const alive = () => { lastEventAt = Date.now(); };
      rec.onaudiostart = rec.onsoundstart = rec.onspeechstart = alive;
      rec.onstart = () => { alive(); if (this.fails < 3) updateListenUI(); };
      rec.onresult = e => {
        alive(); if (this.fails >= 3) { this.fails = 0; updateListenUI(); } this.fails = 0;
        let finals = '', interim = [], conf = 0, nconf = 0;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) { finals += ' ' + r[0].transcript; if (r[0].confidence > 0) { conf += r[0].confidence; nconf++; } }
          else for (let a = 0; a < r.length; a++) interim.push(r[a].transcript);
        }
        onText(finals, interim, nconf ? conf / nconf : 0.75);
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { Listen.stop(); toast(t('mic_blocked')); }
        else if (e.error === 'network') { this.fails++; if (this.fails >= 3) setStatus(navigator.onLine ? t('speech_service_down') : t('no_internet'), false); }
      };
      rec.onend = () => {
        if (this.rec !== rec || !Listen.mode) return;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => { if (this.rec === rec && Listen.mode) this.start(this.lang); }, Math.min(5000, 150 + this.fails * 1000));
      };
      try { rec.start(); } catch (e) {}
    },
    stop() { clearTimeout(this.timer); if (this.rec) { const r = this.rec; this.rec = null; try { r.onend = null; r.onresult = null; r.abort(); } catch (e) {} } }
  };

  // Offline engine: cuts the microphone audio at natural pauses and sends each phrase to the local voice engines.
  // One engine per language (started by "Start Lyric Follow.bat"). Songs use the song's language; the preacher's
  // speech goes to the speaker's language AND English, because references are often said in English.
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

  const Listen = {
    mode: null, lang: '', engine: null,
    async start(mode) {
      mode = mode || S.listenMode;
      const engine = S.net === 'online' ? 'cloud' : 'local';
      if (engine === 'cloud' && !SR) { toast(t('need_chrome')); return; }
      this.stopEngines();
      this.mode = mode; this.engine = engine;
      this.lang = mode === 'songs' ? (song ? song.lang : 'ml-IN') : (S.vbLang === 'auto' ? (this.lastBibleLang || { ml: 'ml-IN', ta: 'ta-IN', en: 'en-IN' }[S.lang] || 'ml-IN') : S.vbLang);
      lastEventAt = Date.now(); hunt.i = 0; hunt.at = Date.now();
      // The offline engine needs the audio itself; the online one only needs the meter (skip it when opened as a file).
      if (engine === 'local' || location.protocol !== 'file:') {   // the microphone also feeds language detection
        this.waitingMic = true; updateListenUI();
        const ok = await Mic.start();
        this.waitingMic = false;
        if (!ok && engine === 'local') { this.mode = null; updateListenUI(); toast(t('mic_blocked')); return; }
      }
      if (!this.mode) return;
      if (engine === 'cloud') Cloud.start(this.lang); else Local.start(this.lang);
      updateListenUI();
    },
    setLang(lang) { if (this.lang === lang) return; this.lang = lang; if (this.mode === 'bible') this.lastBibleLang = lang; if (!this.mode) return; if (this.engine === 'cloud') Cloud.start(lang); else Local.start(lang); updateListenUI(); },
    stopEngines() { Cloud.stop(); Local.stop(); },
    stop() { this.mode = null; this.stopEngines(); LangID.stop(); Mic.stop(); screen.autoBlank = false; updateListenUI(); output(); }
  };

  // Watchdog: restart a recogniser that has gone quiet; switch recogniser language to find a song in another language.
  const hunt = { i: 0, at: 0 };
  setInterval(() => {
    if (!Listen.mode) return;
    const now = Date.now();
    if (Listen.engine === 'cloud' && Cloud.rec && now - lastEventAt > 12000) Cloud.start(Cloud.lang);
    if (Listen.mode === 'bible' && S.vbLang === 'auto' && LangID.disabled && now - lastRefAt > 20000 && now - lastSpeechAt < 4000 && now - hunt.at > 12000) {
      const langs = ['ml-IN', 'ta-IN', 'en-IN']; hunt.at = now; hunt.i = (hunt.i + 1) % langs.length; Listen.setLang(langs[hunt.i]);
    }
    if (Listen.mode === 'songs' && S.autoSwitch) {
      const langs = [...new Set(service.map(id => (songById(id) || {}).lang).filter(Boolean))];
      const quiet = now - lastMatchAt > 7000 && now - lastSpeechAt < 4000;
      if (langs.length > 1 && quiet && now - hunt.at > 7000) {
        hunt.at = now; hunt.i = (hunt.i + 1) % langs.length;
        Listen.setLang(langs[hunt.i]);
      }
    }
  }, 2000);

  function setStatus(txt, live) { $('statusText').textContent = txt; $('dot').classList.toggle('live', !!live); }
  function langName(l) { return (SONG_LANGS.find(x => x[0] === l) || [, l])[1]; }
  function updateListenUI() {
    const on = !!Listen.mode, vb = S.listenMode === 'bible', cloud = S.net === 'online';
    const disabled = cloud && !SR;
    for (const id of ['btnListen', 'btnListen2']) { const b = $(id); b.textContent = on ? t('listen_stop') : t('listen_start'); b.classList.toggle('on', on); b.classList.toggle('primary', !on); b.disabled = disabled; }
    $('btnVB').textContent = Listen.mode === 'bible' ? t('listen_stop') : t('listen_bible'); $('btnVB').classList.toggle('on', Listen.mode === 'bible'); $('btnVB').classList.toggle('primary', Listen.mode !== 'bible'); $('btnVB').disabled = disabled;
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('sel', b.dataset.lm === S.listenMode));
    $('lmBible').hidden = !vb;
    $('autoFollow').closest('label').hidden = vb;
    document.querySelectorAll('.engine-badge').forEach(e => { e.textContent = cloud ? '🌐 ' + t('engine_online') : '💻 ' + t('engine_offline'); e.classList.toggle('online', cloud); });
    if (Listen.mode && Listen.waitingMic) setStatus(t('mic_wait'), false);
    else if (Listen.mode) {
      if (Listen.engine === 'local' && !Local.ok) setStatus(t('local_connecting'), false);
      else setStatus(`${Listen.mode === 'bible' ? t('listen_for_bible') : t('listen_for_songs')} · ${langName(Listen.lang)}`, true);
    } else setStatus(disabled ? t('need_chrome') : t('not_listening'), false);
    $('matchPill').hidden = Listen.mode !== 'songs';
    if (Listen.mode !== 'songs') { $('matchPill').textContent = ''; $('matchPill').className = 'pill'; }
  }
  function setListenMode(m) {
    S.listenMode = m; saveSettings();
    if (m === 'songs' && song && screen.kind === 'bible') { screen.kind = 'song'; screen.bgOnly = false; renderSlides(); output(); }
    if (Listen.mode && Listen.mode !== m) { if (m === 'bible') vbText = ''; Listen.start(m); } else updateListenUI();
  }
  function onText(finals, interim, conf) {
    lastSpeechAt = Date.now();
    const show = (finals || interim[0] || '').trim();
    if (show) { $('heard').textContent = show; $('vbHeard').textContent = show; }
    LangID.sample(finals);
    if (Listen.mode === 'songs') {
      onSongSpeech(finals, interim);
      // A clearly spoken reference during singing mode ("John chapter 3 verse 16") moves to the preacher.
      if (finals) { const r = Bible.parseRef(finals.slice(-120), { exactOnly: true, needChapter: true, needVerse: true }); if (r && r.cue && r.tight && !r.fuzzy) { setListenMode('bible'); vbText = ''; pushHeardRef({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }, 'ref', true); } }
    } else if (Listen.mode === 'bible') {
      onBibleSpeech(finals, interim, conf == null ? 0.75 : conf);
      // Singing that clearly matches a song while in preacher mode moves back to the songs.
      if (songIx && (finals || interim[0])) {
        const h = Core.key(finals || interim[0]); const best = Core.songLookup(songIx, h, 1)[0];
        if (best && best.score >= .72) { singHits++; if (singHits >= 2) { singHits = 0; setListenMode('songs'); switchToSong(best.id, best.line); } } else singHits = 0;
      }
    }
  }
  let singHits = 0;

  function rebuildSongIndex() {
    songIx = Core.songIndex(songs.map(s => ({ id: s.id, lines: prepared(s) })));
  }
  let ixTimer;
  function songsChanged() { clearTimeout(ixTimer); ixTimer = setTimeout(rebuildSongIndex, 300); }

  function onSongSpeech(finals, interim) {
    if (finals) heardKey = (heardKey + Core.key(finals)).slice(-400);
    // The offline model writes Malayalam/Tamil in English letters, so matches score a little lower.
    const thr = S.thr / 100 - (Listen.engine === 'local' ? .06 : 0);
    let moved = false;
    if (song && lines.length && S.autoFollow) {
      for (const alt of (interim.length ? interim : [''])) {
        if (Core.decide(follow, lines, (heardKey + Core.key(alt)).slice(-400), thr)) { moved = true; break; }
      }
    }
    const sc = song ? follow.score : 0;
    if (song && (sc >= thr * .85 || moved)) { lastMatchAt = Date.now(); if (screen.autoBlank) { screen.autoBlank = false; moved = true; } }
    updateSearchHelp(sc, thr);
    const pill = $('matchPill'); pill.textContent = Math.round(sc * 100) + '%';
    pill.className = 'pill ' + (sc >= thr + .15 ? 'good' : sc >= thr ? 'ok' : 'low');
    if (moved) { if (screen.kind !== 'song') screen.kind = 'song'; screen.bgOnly = false; renderSlides(); output(); }
    if (S.autoFollow) detectOtherSong((heardKey + Core.key(interim[0] || '')).slice(-400), sc, thr, !!finals);
  }

  // Finds the song being sung anywhere in the library (fast index), and jumps to it at the right line.
  function detectOtherSong(h, curScore, thr, isFinal) {
    const now = Date.now();
    if (!songIx || (!isFinal && now - lastDetectAt < 250) || h.length < 12) return;
    lastDetectAt = now;
    // Look at the whole recent window and at the latest phrase alone, so a new song is not drowned by the old one.
    const cands = Core.songLookup(songIx, h, 4).concat(h.length > 160 ? Core.songLookup(songIx, h.slice(-160), 4) : []);
    const best = cands.filter(x => !song || x.id !== song.id).sort((a, b) => b.score - a.score)[0];
    const need = Math.max(thr + .1, .62);
    if (best && best.score >= need && best.score > curScore + .1) {
      detect.n = detect.id === best.id ? detect.n + 1 : 1; detect.id = best.id; detect.line = best.line;
      const inService = service.includes(best.id);
      if (detect.n >= (inService || best.score >= .78 ? 2 : 3) && suggestId !== best.id) {
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
    if (Date.now() - noMatchSince > 15000) {
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

  function onBibleSpeech(finals, interim, conf) {
    if (finals) vbText = (vbText + ' ' + finals).slice(-400);
    const tail = (vbText + ' ' + (interim[0] || '')).slice(-90);
    const r = Bible.parseRef(tail, { exactOnly: true, needChapter: true, needVerse: true });
    if (r) {
      // If what was heard matches a song line, it is singing (e.g. Tamil "நான்" heard as "John"), not a reference.
      const singing = songIx && Core.songLookup(songIx, Core.key(tail), 1).some(x => x.score >= .6);
      // Sure: chapter/verse words were said, or the numbers follow the book name directly with a confident transcript.
      // Repeated numbers ("18 18", "1 1") are the usual shape of mishearings, so they need more confidence.
      const need = r.ch === r.v ? .85 : .72;
      // The offline engine spells Malayalam/Tamil book names phonetically ("Vohmar" = Romans), so a near-match book is normal there.
      const bookOk = !r.fuzzy || Listen.engine === 'local';
      const sure = !singing && (r.cue || (r.tight && bookOk && conf >= need) || (r.tight && conf >= .9));
      if (sure || finals) { pushHeardRef({ book: r.book, ch: r.ch, v: r.v, ve: r.ve }, 'ref', sure); vbText = ''; vbWordsAtQuote = 0; }
      return;
    }
    const words = vbText.trim().split(/\s+/).length;
    if (finals && !quoteBusy && words - vbWordsAtQuote >= 5) {
      vbWordsAtQuote = words; quoteBusy = true;
      const lang = (Listen.engine === 'local' || S.vbLang === 'auto' ? detectScript(vbText) : S.vbLang.slice(0, 2));
      const en = S.versions.find(v => (Bible.VERSIONS.find(x => x.id === v) || {}).lang === 'en') || 'kjv';
      // Offline speech may write Malayalam/Tamil in English letters, so search the spoken language's Bible too.
      const vids = lang === 'ml' ? ['mal1910'] : lang === 'ta' ? ['tamov'] : Listen.engine === 'local' ? [en, (Listen.lang || '').startsWith('ta') ? 'tamov' : 'mal1910'] : [en];
      Promise.all(vids.map(v => BibleBG.call('quote', v, vbText.slice(-160), 1).catch(() => [])))
        .then(all => { const q = all.map(r => r && r[0]).filter(Boolean).sort((a, b) => b.score - a.score)[0]; if (q && q.score >= .6) pushHeardRef({ book: q.book, ch: q.ch, v: q.v, ve: q.v }, 'quote', q.score >= .7); })
        .catch(() => {}).finally(() => { quoteBusy = false; });
    }
  }
  function detectScript(txt) { return /[ഀ-ൿ]/.test(txt) ? 'ml' : /[஀-௿]/.test(txt) ? 'ta' : 'en'; }

  // Blank screen when singing continues but nothing matches.
  setInterval(() => {
    if (Listen.mode !== 'songs' || !S.blankAfter || screen.kind !== 'song' || screen.autoBlank || follow.cur < 0) return;
    const now = Date.now();
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
    const lf = $('songLangFilter'), lv = lf.value; fillLangSelect(lf, true); lf.value = lv;
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
      b.append(el('span', 't', s.title), el('span', 'chip', LANG_SHORT[s.lang] || ''));
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
    $('btnListen').onclick = toggleListen; $('btnListen2').onclick = toggleListen;
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
    $('btnNewSong').onclick = () => editSong(null);
    $('songForm').onsubmit = async e => {
      e.preventDefault();
      const data = { title: $('sfTitle').value.trim() || t('untitled'), lang: $('sfLang').value, bg: $('sfBg').value, lyrics: $('sfLyrics').value };
      const s = await saveSong(data, editingId);
      editingId = s.id; toast(t('saved')); editSong(s.id); renderService();
    };
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
    $('stLow').onchange = e => { S.low = e.target.checked; saveSettings(); document.body.classList.toggle('low', S.low); const st2 = projWin && !projWin.closed && projWin.document.getElementById('stage'); if (st2 && st2._lf) st2._lf.bgKey = null; if ($('preview')._lf) $('preview')._lf.bgKey = null; output(); };
    $('btnExport').onclick = exportBackup;
    $('importFile').onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; };

    window.addEventListener('resize', () => output());
  }

  /* ---------- start ---------- */
  async function init() {
    if (location.protocol === 'file:') {
      // Opened by double-clicking index.html. If "Start Lyric Follow.bat" is running, go there (mic permission is remembered, offline voice works).
      try { const r = await fetch('http://localhost:8765/manifest.webmanifest', { mode: 'no-cors', cache: 'no-store' }); if (r) { location.replace('http://localhost:8765/index.html'); return; } } catch (e) {}
    }
    const saved = await Store.get('settings').catch(() => null);
    if (saved) {
      S = Object.assign({}, DEF, saved, { theme: Object.assign({}, DEF.theme, saved.theme) });
      if ((saved.v || 0) < 3) { S.autoSwitch = true; S.net = 'offline'; S.v = 3; saveSettings(); }
      if ((saved.v || 0) < 4) { S.vbLang = 'auto'; S.v = 4; saveSettings(); }
    }
    else { const nl = (navigator.language || '').slice(0, 2); if (nl === 'ml' || nl === 'ta') S.lang = nl; }
    songs = await Store.all('songs').catch(() => []);
    if (!songs.length && !saved) {
      for (const x of SAMPLES) { const s = { id: uid(), bg: '', created: Date.now(), updated: Date.now(), ...x }; songs.push(s); await Store.put('songs', s).catch(() => {}); }
      service = songs.map(s => s.id); saveService();
    } else service = (await Store.get('service').catch(() => null)) || [];
    for (const m of await Store.all('media').catch(() => [])) { try { media.set(m.id, { id: m.id, name: m.name, type: m.type, url: URL.createObjectURL(m.blob) }); } catch (e) {} }

    const css = document.createElement('style'); css.textContent = Stage.CSS; document.head.appendChild(css);
    wire();
    fillLangSelect($('sfLang')); fillLangSelect($('songLangFilter'), true); fillLangSelect($('ocrSongLang'));
    rebuildSongIndex();
    renderAll(); setTab('live');
    if (service[0]) loadSong(service[0]);
    if (!SR) $('supportMsg').innerHTML = `<p class="msg">${t('need_chrome')}</p>`;
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    // Load the chosen Bible versions in the background so the Bible tab opens instantly.
    setTimeout(() => ensureVersions().then(() => { if (tab === 'bible') renderBibleNav(); }), 1500);
  }
  // Test hook: lets automated checks feed recognised text without a microphone.
  window.LF_DEBUG = {
    feed(text, isFinal) { onText(isFinal ? text : '', isFinal ? [] : [text]); },
    mode(m) { Listen.mode = m; Listen.engine = S.net === 'online' ? 'cloud' : 'local'; if (m) Listen.lang = m === 'bible' ? S.vbLang : (song ? song.lang : 'ml-IN'); updateListenUI(); },
    lid: () => ({ votes: LangID.votes, disabled: LangID.disabled, lastAt: LangID.lastAt, ws: LangID.ws && LangID.ws.readyState, busy: LangID.busy, raw: LangID.raw }),
    state: () => ({ cur: follow.cur, song: song && song.title, screen: Object.assign({}, screen), heardRefs: heardRefs.map(h => Bible.refLabel(h.r, 'en')), lang: Listen.lang })
  };
  init();
})();
