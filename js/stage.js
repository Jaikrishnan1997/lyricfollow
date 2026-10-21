/* Lyric Follow — what appears on the projector (also used for the small preview). */
(function () {
  'use strict';
  const CROSS = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect x="76" y="14" width="8" height="62" rx="1" fill="#fff" opacity=".07"/><rect x="62" y="30" width="36" height="8" rx="1" fill="#fff" opacity=".07"/></svg>');

  // Built-in backgrounds. ink = text colour that reads well on it.
  const BUILTIN = [
    { id: 'black', name: 'Black', css: '#000', ink: '#fff' },
    { id: 'navy', name: 'Night blue', css: 'radial-gradient(ellipse at 50% 30%, #1f3c6d 0%, #0a1630 55%, #040915 100%)', ink: '#fff' },
    { id: 'cross', name: 'Cross', css: `url("${CROSS}") center/cover no-repeat, radial-gradient(ellipse at 50% 40%, #203a63 0%, #08132a 70%)`, ink: '#fff' },
    { id: 'purple', name: 'Royal purple', css: 'radial-gradient(ellipse at 30% 20%, #4d2c7c 0%, #1d0f38 55%, #0b0617 100%)', ink: '#fff' },
    { id: 'maroon', name: 'Maroon', css: 'radial-gradient(ellipse at 50% 45%, #6a1f2c 0%, #2a0b12 60%, #120407 100%)', ink: '#fff' },
    { id: 'forest', name: 'Olive grove', css: 'radial-gradient(ellipse at 70% 80%, #2f5a3f 0%, #10261a 55%, #06110b 100%)', ink: '#fff' },
    { id: 'dawn', name: 'Dawn', css: 'linear-gradient(170deg, #1d1530 0%, #5b2c3b 45%, #c46a3a 80%, #e8a35a 100%)', ink: '#fff' },
    { id: 'slate', name: 'Slate', css: 'linear-gradient(180deg, #2b313d 0%, #12151c 100%)', ink: '#fff' },
    { id: 'teal', name: 'Sea of Galilee', css: 'radial-gradient(ellipse at 40% 70%, #1c5d66 0%, #0b2a33 55%, #051318 100%)', ink: '#fff' },
    { id: 'parchment', name: 'Parchment', css: 'radial-gradient(ellipse at 50% 40%, #fbf3e2 0%, #eadbbd 70%, #d9c59c 100%)', ink: '#2a1d0e' },
    { id: 'white', name: 'White', css: '#ffffff', ink: '#111' },
    { id: 'green', name: 'Green screen', css: '#00b140', ink: '#fff' }
  ];

  const CSS = `
  .lf-stage{position:relative;overflow:hidden;background:#000;container-type:inline-size;font-family:"Anek Malayalam","Anek Tamil","Anek Latin","Nirmala UI","Noto Sans Malayalam","Noto Sans Tamil","Kartika","Latha",system-ui,sans-serif}
  .lf-bg,.lf-bg>img,.lf-bg>video,.lf-shade{position:absolute;inset:0;width:100%;height:100%}
  .lf-bg>img,.lf-bg>video{object-fit:cover}
  .lf-shade{background:rgba(0,0,0,.28);pointer-events:none}
  .lf-txt{position:absolute;inset:6% 6%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:.22em;font-weight:700;line-height:1.28;transition:opacity .1s ease}
  .lf-txt.bottom{justify-content:flex-end;inset:auto 5% 5% 5%;height:42%}
  .lf-txt p{margin:0;transition:opacity .08s ease;text-wrap:balance}
  .lf-txt p.dim{opacity:.45}
  .lf-txt.shadow{text-shadow:0 .04em .12em rgba(0,0,0,.75),0 0 .5em rgba(0,0,0,.35)}
  .lf-txt .vblock{display:flex;flex-direction:column;gap:.15em;width:100%}
  .lf-txt .vtext{font-weight:600;line-height:1.32;text-align:center}
  .lf-txt .vlabel{font-size:.42em;font-weight:500;opacity:.75;letter-spacing:.06em}
  .lf-txt .vref{font-size:.5em;font-weight:600;opacity:.85;margin-top:.35em;letter-spacing:.03em}
  .lf-txt .sep{width:12%;height:2px;background:currentColor;opacity:.3;margin:.25em auto}
  .lf-txt.idle{font-weight:600;opacity:.9}
  .lf-low .lf-txt,.lf-low .lf-txt p{transition:none}
  .lf-black{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .25s;pointer-events:none}
  .lf-black.on{opacity:1}
  .lf-low .lf-black{transition:none}`;

  function bgInfo(ref, media) {
    if (ref && ref.startsWith('m:')) { const m = media.get(ref.slice(2)); if (m) return { kind: m.type, url: m.url, ink: '#fff', key: ref, shade: true }; }
    const id = ref && ref.startsWith('b:') ? ref.slice(2) : 'navy';
    const b = BUILTIN.find(x => x.id === id) || BUILTIN[1];
    return { kind: 'css', css: b.css, ink: b.ink, key: 'b:' + b.id, shade: false };
  }

  function ensure(stage) {
    if (stage._lf) return stage._lf;
    const doc = stage.ownerDocument;
    stage.classList.add('lf-stage');
    stage.innerHTML = '<div class="lf-bg"></div><div class="lf-shade" hidden></div><div class="lf-txt"></div><div class="lf-black"></div>';
    stage._lf = { doc, bg: stage.children[0], shade: stage.children[1], txt: stage.children[2], black: stage.children[3], bgKey: null };
    return stage._lf;
  }

  /**
   * payload: {black, bg, kind:'lyrics'|'bible'|'blank'|'idle', lines:[{t,on}], items:[{text,label}], ref, idle}
   * opts: {media: Map, theme: {textScale,pos,shadow,color}, low}
   */
  function render(stage, payload, opts) {
    const s = ensure(stage), doc = s.doc, theme = opts.theme || {};
    stage.classList.toggle('lf-low', !!opts.low);
    s.black.classList.toggle('on', !!payload.black);
    const bi = bgInfo(payload.bg, opts.media);
    if (s.bgKey !== bi.key) {
      s.bgKey = bi.key; s.bg.innerHTML = ''; s.bg.style.background = '';
      if (bi.kind === 'css') s.bg.style.background = bi.css;
      else if (bi.kind === 'image') { const im = doc.createElement('img'); im.src = bi.url; im.alt = ''; s.bg.appendChild(im); }
      else if (bi.kind === 'video') {
        const v = doc.createElement('video'); v.src = bi.url; v.muted = true; v.loop = true; v.playsInline = true;
        if (!opts.low && !opts.preview) { v.autoplay = true; v.play().catch(() => {}); }
        s.bg.appendChild(v);
      }
      s.shade.hidden = !bi.shade;
    }
    const txt = s.txt;
    txt.className = 'lf-txt' + (theme.pos === 'bottom' && payload.kind === 'lyrics' ? ' bottom' : '') + (theme.shadow !== false ? ' shadow' : '');
    txt.style.color = theme.color && theme.color !== 'auto' ? theme.color : bi.ink;
    txt.innerHTML = '';
    const W = stage.clientWidth || 800, H = stage.clientHeight || 450;
    const scale = theme.textScale || 1;
    let size;
    if (payload.kind === 'lyrics' && payload.lines && payload.lines.length) {
      for (const l of payload.lines) { const p = doc.createElement('p'); p.textContent = l.t; if (!l.on) p.className = 'dim'; txt.appendChild(p); }
      size = Math.min(W / 13, H / (payload.lines.length * 1.45 + .6)) * scale;
    } else if (payload.kind === 'bible' && payload.items && payload.items.length) {
      payload.items.forEach((it, i) => {
        if (i) { const sp = doc.createElement('div'); sp.className = 'sep'; txt.appendChild(sp); }
        const blk = doc.createElement('div'); blk.className = 'vblock';
        const t = doc.createElement('div'); t.className = 'vtext'; t.textContent = it.text; blk.appendChild(t);
        if (payload.items.length > 1) { const lb = doc.createElement('div'); lb.className = 'vlabel'; lb.textContent = it.label; blk.appendChild(lb); }
        txt.appendChild(blk);
      });
      const r = doc.createElement('div'); r.className = 'vref'; r.textContent = payload.ref || ''; txt.appendChild(r);
      size = Math.min(W / 18, H / 7) * scale;
    } else if (payload.kind === 'idle' && payload.idle) {
      const p = doc.createElement('p'); p.textContent = payload.idle; txt.appendChild(p); txt.classList.add('idle');
      size = Math.min(W / 16, H / 4);
    } else return;
    txt.style.fontSize = size + 'px';
    for (let k = 0; k < 45 && (txt.scrollHeight > txt.clientHeight + 1 || txt.scrollWidth > txt.clientWidth + 1); k++) { size *= .93; txt.style.fontSize = size + 'px'; }
  }

  window.LFStage = { BUILTIN, CSS, render, bgInfo };
})();
