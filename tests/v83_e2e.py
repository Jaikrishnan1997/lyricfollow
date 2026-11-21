# v83 in a real browser (Chromium): Preach mode, the owner's Tamil "Genesis ... Deuteronomy" fed word by word through
# LF_DEBUG.feed exactly as the live stream delivers it (growing partials, then the final): the screen shows Genesis
# 3:4 then Deuteronomy 6:4 and never Deuteronomy 3:4, the heard list has those two; screenshots of the operator page
# and the projector after each reference. Hindi is in the speaker's-language list (1280 and 400 px wide), its hint
# says the read-aloud finder does not work for Hindi, and a Hindi reference shows with its Hindi name in the list.
# No console errors beyond the known ones. Screenshots go to LF_SHOTS (default: SCRATCH/v83).
#   python3 tests/v83_e2e.py
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, os
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get('LF_SHOTS', SCRATCH + '/v83'); os.makedirs(SHOTS, exist_ok=True)
PORT = os.environ.get('PORT', '8784')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', PORT, '-d', ROOT[:-1]], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = f'http://localhost:{PORT}/index.html'
KNOWN = ('fonts.googleapis', 'fonts.gstatic', 'ERR_TUNNEL_CONNECTION_FAILED', '127.0.0.1:6020', 'ERR_CONNECTION_REFUSED', 'Failed to load resource')
fails = []
def ok(c, what):
    print(('ok   ' if c else 'FAIL ') + what)
    if not c: fails.append(what)
GEN = 'ஆதியாகமம் மூன்றாவது அதிகாரம் நான்காவது வசனம்'
DEU = 'உபாகமம் ஆறாவது அதிகாரம் நான்காவது வசனம்'
try:
  with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx = br.new_context(service_workers='block', permissions=['microphone'], viewport={'width': 1280, 'height': 800})
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(3000)
    ev = pg.evaluate
    pg.click('.tabs button[data-tab=live]'); pg.click('.seg [data-lm=preach]'); pg.wait_for_timeout(300)
    with pg.expect_popup() as pop: pg.click('#btnProjector')
    proj = pop.value; proj.set_viewport_size({'width': 1280, 'height': 720}); proj.wait_for_timeout(800)
    ev("LF_DEBUG.mode('bible'); LF_DEBUG.setLang('ta-IN')")
    st = lambda: ev("(()=>{const s=LF_DEBUG.state(); return {screen: s.screen.kind==='bible' && s.screen.bible ? LFBible.refLabel(s.screen.bible,'en') : s.screen.kind, refs: s.heardRefs, asked: s.asked}})()")
    seen, n = [], 0
    def heard_shot(path):   # the heard list ("Heard from the preacher") is on the Bible tab
        vp = pg.viewport_size; pg.set_viewport_size({'width': vp['width'], 'height': 2000})   # (whole list, nothing under the sticky header)
        pg.click('.tabs button[data-tab=bible]'); pg.wait_for_timeout(250); ev("window.scrollTo(0, 0)")
        pg.locator('#heardRefsBox').screenshot(path=path)
        pg.click('.tabs button[data-tab=live]'); pg.set_viewport_size(vp); pg.wait_for_timeout(150)
    def feed(text, final):
        global n
        ev("([t,f]) => LF_DEBUG.feed(t, f, .75)", [text, final]); pg.wait_for_timeout(350)
        s = st()
        if s['screen'] not in ('song', 'blank', None) and (not seen or seen[-1] != s['screen']):
            seen.append(s['screen']); n += 1
            pg.wait_for_timeout(400)
            name = s["screen"].replace(" ", "_").replace(":", "-")
            heard_shot(f'{SHOTS}/preach_ta_{n}_{name}_heard_list.png')
            proj.screenshot(path=f'{SHOTS}/preach_ta_{n}_{name}_screen.png')
        return s
    # one breath: Genesis then Deuteronomy in one utterance, word by word, then the final
    words = (GEN + ' ' + DEU).split(' ')
    for i in range(1, len(words) + 1): feed(' '.join(words[:i]), False)
    s = feed(GEN + ' ' + DEU, True)
    ok(seen == ['Genesis 3:4', 'Deuteronomy 6:4'], f'Tamil, one breath: screen showed {seen}')
    ok('Deuteronomy 3:4' not in seen and len(s['refs']) == 2 and set(s['refs']) == {'Genesis 3:4', 'Deuteronomy 6:4'}, f'heard list {s["refs"]}')
    # with a pause: two utterances (the list cleared; Deuteronomy 6:4 is still on screen from above)
    ev("document.querySelector('#heardRefs2 .clearbtn') && document.querySelector('#heardRefs2 .clearbtn').click()"); seen.clear(); seen.append(st()['screen'])
    for u in (GEN, DEU):
        w = u.split(' ')
        for i in range(1, len(w) + 1): feed(' '.join(w[:i]), False)
        s = feed(u, True); pg.wait_for_timeout(600)
    seen.pop(0)
    ok(seen == ['Genesis 3:4', 'Deuteronomy 6:4'], f'Tamil, with a pause between the two: screen showed {seen}')
    ok(len(s['refs']) == 2, f'heard list {s["refs"]}')
    # Hindi in the speaker's-language list, at 1280 and 400 px
    for W in (1280, 400):
        pg.set_viewport_size({'width': W, 'height': 900}); pg.wait_for_timeout(300)
        opts = ev("[...document.getElementById('vbLang2').options].map(o => o.value + '=' + o.text)")
        pg.select_option('#vbLang2', 'hi-IN'); pg.wait_for_timeout(300)
        hint = ev("document.getElementById('lmHint').textContent")
        over = ev("document.documentElement.scrollWidth > window.innerWidth + 1")
        pg.locator('#vbLang2').scroll_into_view_if_needed(); pg.screenshot(path=f'{SHOTS}/hindi_choice_{W}.png')
        ok('hi-IN=हिन्दी' in opts and 'Hindi' in hint and not over, f'{W}px: Hindi offered ({len(opts)} choices), hint says so, no sideways scroll')
    pg.set_viewport_size({'width': 1280, 'height': 800})
    ev("LF_DEBUG.mode('bible'); LF_DEBUG.setLang('hi-IN')")
    seen.clear(); seen.append(st()['screen']); w = 'यूहन्ना के तीसरे अध्याय का सोलहवाँ पद'.split(' ')
    for i in range(1, len(w) + 1): feed(' '.join(w[:i]), False)
    s = feed(' '.join(w), True); pg.wait_for_timeout(500)
    label = ev("document.querySelector('#heardRefs2 li .rref') ? document.querySelector('#heardRefs2 li .rref').textContent : ''")
    heard_shot(f'{SHOTS}/hindi_reference_heard_list.png'); proj.screenshot(path=f'{SHOTS}/hindi_reference_screen.png')
    ok(seen[1:] == ['John 3:16'] and 'यूहन्ना 3:16' in label, f'Hindi reference: screen {seen[1:]}, heard list label "{label}"')
    bad = [e for e in errs if not any(k in e for k in KNOWN)]
    ok(not bad, f'no console errors beyond the known ones ({len(errs) - len(bad)} known) {bad}')
    br.close()
finally:
  srv.terminate()
print('\nall v83 browser checks passed' if not fails else f'\n{len(fails)} check(s) failed')
sys.exit(1 if fails else 0)
