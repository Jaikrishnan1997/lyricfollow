# v82 in a real browser (Chromium, fake microphone): the new settings work and survive a reload, the three screen
# modes render without overflow (8-line stanza in Malayalam, Tamil and English at 1280x720 and 1920x1080), the four
# listening modes still switch, the follower follows a jump pattern fed through LF_DEBUG.clip, an operator
# correction holds, the microphone chooser's constraints are what getUserMedia is asked, a recording gives the
# timeline (replayed by tests/timeline_replay.js), and the live stream for singing (mocked WebSocket) feeds the
# tracker only when its setting is on. Screenshots go to LF_SHOTS (default: SCRATCH/v82).
#   python3 tests/v82_e2e.py
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, os
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get('LF_SHOTS', SCRATCH + '/v82'); os.makedirs(SHOTS, exist_ok=True)
PORT = os.environ.get('PORT', '8783')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', PORT, '-d', ROOT[:-1]], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = f'http://localhost:{PORT}/index.html'
fails = []
def ok(c, what):
    print(('ok   ' if c else 'FAIL ') + what)
    if not c: fails.append(what)
KNOWN = ('fonts.googleapis', 'ERR_TUNNEL_CONNECTION_FAILED', '127.0.0.1:6020', 'ERR_CONNECTION_REFUSED', 'Failed to load resource')
# getUserMedia is wrapped to remember what it was asked; WebSocket to Sarvam is a mock that answers with song lines
INIT = r"""
(() => {
  const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  window.__gum = [];
  navigator.mediaDevices.getUserMedia = c => { window.__gum.push(JSON.parse(JSON.stringify(c))); return gum(c); };
  const Real = window.WebSocket;
  window.__ws = { opened: 0, sent: 0, lines: [] };
  window.WebSocket = function (url, proto) {
    if (!/sarvam/.test(String(url))) return new Real(url, proto);
    const me = this; window.__ws.opened++; me.readyState = 0; me.url = url;
    setTimeout(() => { me.readyState = 1; me.onopen && me.onopen({}); }, 50);
    let k = 0;
    me.send = d => { window.__ws.sent++; };
    me.close = () => { me.readyState = 3; };
    // every 1.4 s the next scripted phrase: partials word by word, then the final
    me._t = setInterval(() => {
      const L = window.__ws.lines; if (!L.length || me.readyState !== 1) return;
      const p = L.shift(), w = p.split(' ');
      w.forEach((x, i) => setTimeout(() => me.onmessage && me.onmessage({ data: JSON.stringify({ event: 'transcript.partial', text: w.slice(0, i + 1).join(' ') }) }), i * 150));
      setTimeout(() => me.onmessage && me.onmessage({ data: JSON.stringify({ event: 'transcript.final', text: p }) }), w.length * 150 + 100);
    }, 1400);
  };
  window.WebSocket.OPEN = 1; window.WebSocket.CLOSED = 3;
})();
"""
EN8 = 'Amazing grace how sweet the sound that saved a wretch like me\nI once was lost but now am found was blind but now I see\nTwas grace that taught my heart to fear and grace my fears relieved\nHow precious did that grace appear the hour I first believed\nThrough many dangers toils and snares I have already come\nTis grace has brought me safe thus far and grace will lead me home\nThe Lord has promised good to me his word my hope secures\nHe will my shield and portion be as long as life endures'
ML8 = 'യേശുവേ നീ എൻ രക്ഷകൻ എന്നും എന്റെ ആശ്രയം നീ മാത്രം\nനിൻ സ്നേഹം എന്നും മതിയേ എന്റെ ജീവിത യാത്രയിൽ എന്നും\nഇരുളിൽ നീ എൻ വെളിച്ചം വഴി കാട്ടും നല്ല ഇടയനേ\nഞാൻ നിന്നെ സ്തുതിച്ചിടും എന്റെ ജീവകാലം മുഴുവനും\nഹാലേലൂയാ പാടിടാം നന്ദിയോടെ വാഴ്ത്തിടാം എന്നും\nഎന്നും നിന്റെ കരുണയിൽ ആശ്രയിച്ചു ജീവിക്കാം ഞങ്ങൾ\nകഷ്ട സങ്കടങ്ങൾ വന്നാലും കർത്താവേ നീ കൂടെയുണ്ട്\nസ്വർഗ്ഗ നാട്ടിൽ ചേരുവോളം നിൻ കൃപ മതി എനിക്ക്'
TA8 = 'இயேசுவே நீர் என் மீட்பர் என்றும் என் அடைக்கலம் நீரே\nஉம் அன்பு என்றும் போதுமே என் வாழ்க்கைப் பயணத்தில் எல்லாம்\nஇருளில் நீர் என் வெளிச்சம் வழி காட்டும் நல்ல மேய்ப்பரே\nநான் உம்மை துதிப்பேன் என் ஜீவ காலம் முழுவதும்\nஅல்லேலூயா பாடுவோம் நன்றியோடு போற்றுவோம் என்றும்\nஎன்றும் உம் கிருபையில் நம்பி வாழ்ந்திடுவோம் நாங்கள்\nதுன்பங்கள் வந்தாலும் கர்த்தாவே நீர் கூட இருக்கிறீர்\nபரலோக நாடு சேரும் வரை உம் கிருபை போதுமே'
BI = 'யேசுவே நீர் என் மீட்பர்\nYesuve neer en meetpar\nஉம் அன்பு என்றும் போதுமே\nUm anbu endrum podhume\nஇருளில் நீர் என் வெளிச்சம்\nIrulil neer en velicham'
try:
  with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-audio-capture={AUDIO}', '--autoplay-policy=no-user-gesture-required'])
    ctx = br.new_context(service_workers='block', permissions=['microphone'], viewport={'width': 1280, 'height': 800}, accept_downloads=True)
    ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(2500)
    ev = pg.evaluate
    def listen(on):   # start or stop listening only when it is not so already
        if ev("document.getElementById('btnListen').classList.contains('on')") != on: pg.click('#btnListen')
        pg.wait_for_timeout(1500 if on else 300)
    # ---------- widths: no horizontal scroll on any tab ----------
    for w in (1280, 400):
        pg.set_viewport_size({'width': w, 'height': 800 if w > 500 else 860})
        for tab in ('live', 'songs', 'bible', 'settings'):
            pg.click(f'.tabs button[data-tab={tab}]'); pg.wait_for_timeout(250)
            sw = ev('[document.documentElement.scrollWidth, document.documentElement.clientWidth]')
            ok(sw[0] <= sw[1] + 1, f'{w}px {tab}: no horizontal scroll ({sw[0]} <= {sw[1]})')
        pg.click('.tabs button[data-tab=settings]'); pg.wait_for_timeout(200)
        el = pg.query_selector('#followPanel'); el.scroll_into_view_if_needed(); el.screenshot(path=f'{SHOTS}/settings_follow_{w}.png')
    pg.set_viewport_size({'width': 1280, 'height': 800})
    # ---------- settings survive a reload ----------
    pg.click('.tabs button[data-tab=settings]')
    pg.select_option('#stMode', 'pair'); pg.uncheck('#stLearn'); pg.select_option('#stMicCh', 'left'); pg.check('#stRecord'); pg.check('#stSvStream')
    pg.wait_for_timeout(900); pg.reload(); pg.wait_for_timeout(2500); pg.click('.tabs button[data-tab=settings]')
    got = ev("({mode: document.getElementById('stMode').value, learn: document.getElementById('stLearn').checked, ch: document.getElementById('stMicCh').value, rec: document.getElementById('stRecord').checked, st: document.getElementById('stSvStream').checked})")
    ok(got == {'mode': 'pair', 'learn': False, 'ch': 'left', 'rec': True, 'st': True}, f'new settings survive a reload {got}')
    mics = ev("[...document.getElementById('stMic').options].map(o => [o.value, o.text])")
    ok(len(mics) >= 2, f'microphone chooser lists the microphones ({len(mics) - 1} besides the default)')
    # restore for the next checks
    pg.select_option('#stMode', 'slide'); pg.check('#stLearn'); pg.select_option('#stMicCh', 'both'); pg.uncheck('#stRecord'); pg.uncheck('#stSvStream'); pg.wait_for_timeout(500)
    # ---------- microphone: the chosen device and channel are what getUserMedia is asked ----------
    dev = mics[1][0]
    pg.select_option('#stMic', dev); pg.select_option('#stMicCh', 'right'); pg.wait_for_timeout(300)
    pg.click('.tabs button[data-tab=live]'); pg.click('.seg [data-lm=songs]'); listen(True); pg.wait_for_timeout(300)
    g = ev('window.__gum'); m = ev('LF_DEBUG.mic()')
    ok(any(x.get('audio', {}).get('deviceId', {}).get('exact') == dev and x['audio'].get('channelCount') == 2 for x in g), f'getUserMedia asked for the chosen microphone, both channels for "Right" ({g[-1] if g else None})')
    ok(m['open'], f'microphone open (side taken: {m["side"] or "mono input - nothing to choose"})')
    hp = ev("[...document.querySelectorAll('#micHealth, #micHealth2')].map(e => !e.hidden && e.textContent)")
    pg.wait_for_timeout(4500); hp = ev("[...document.querySelectorAll('#micHealth, #micHealth2')].map(e => e.hidden ? '' : e.className + ':' + e.textContent)")
    ok(any(hp), f'microphone health pill still shows {hp}')
    listen(False)
    # a microphone that is gone: the default is used
    pg.click('.tabs button[data-tab=settings]'); ev("window.__gum = []")
    ev("(() => { const s = document.getElementById('stMic'); s.appendChild(new Option('gone', 'no-such-device')); s.value = 'no-such-device'; s.dispatchEvent(new Event('change')); })()")
    pg.click('.tabs button[data-tab=live]'); listen(True); pg.wait_for_timeout(300)
    g = ev('window.__gum')
    ok(len(g) >= 2 and 'deviceId' not in g[-1]['audio'] and ev('LF_DEBUG.mic().open'), 'a microphone that is gone: the default one is opened instead')
    listen(False)
    pg.click('.tabs button[data-tab=settings]'); pg.select_option('#stMic', ''); pg.select_option('#stMicCh', 'both'); pg.wait_for_timeout(300)
    # ---------- the four listening modes ----------
    pg.click('.tabs button[data-tab=live]')
    for lm in ('preach', 'bible', 'psalm', 'songs'):
        pg.click(f'.seg [data-lm={lm}]'); pg.wait_for_timeout(300)
        sel = ev("[...document.querySelectorAll('.seg button.sel')].map(b => b.dataset.lm)")
        ok(sel == [lm], f'listening mode {lm} selected ({sel})')
    # ---------- songs: three 8-line stanzas and a bilingual song ----------
    ids = {}
    for title, lang, lyr in (('V82 EN', 'en-IN', EN8), ('V82 ML', 'ml-IN', ML8), ('V82 TA', 'ta-IN', TA8), ('V82 BI', 'ta-IN', BI)):
        ids[title] = ev(f"LF_DEBUG.addSong({json.dumps(title)}, {json.dumps(lang)}, {json.dumps(lyr)})")
    pg.wait_for_timeout(500)
    with pg.expect_popup() as pop: pg.click('#btnProjector')
    proj = pop.value; proj.wait_for_timeout(500)
    pg.click('.tabs button[data-tab=settings]')
    for mode in ('line', 'pair', 'slide'):
        pg.select_option('#stMode', mode)
        for title in ('V82 EN', 'V82 ML', 'V82 TA', 'V82 BI'):
            ev(f"LF_DEBUG.open({json.dumps(title)})"); ev("document.querySelectorAll('#slides .ln')[2].click()")
            for (W, H) in ((1280, 720), (1920, 1080)):
                proj.set_viewport_size({'width': W, 'height': H}); proj.evaluate("dispatchEvent(new Event('resize'))"); proj.wait_for_timeout(300)
                o = proj.evaluate("(() => { const t = document.querySelector('.lf-txt'); return { n: t.querySelectorAll('p').length, small: t.querySelectorAll('p.next').length, dim: t.querySelectorAll('p.dim').length, over: t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1, fs: t.style.fontSize }; })()")
                want = {'line': (1, 0), 'pair': (2, 1), 'slide': (8, 7)}[mode] if title != 'V82 BI' else {'line': (2, 0), 'pair': (4, 2), 'slide': (6, 4)}[mode]
                ok(not o['over'] and o['n'] == want[0] and (o['small'] if mode == 'pair' else o['dim']) == want[1], f'{mode} {title} {W}x{H}: {o["n"]} lines, fits (font {o["fs"]})')
                if W == 1280 or title == 'V82 ML': proj.screenshot(path=f'{SHOTS}/screen_{mode}_{title.split()[1]}_{W}x{H}.png')
    pg.select_option('#stMode', 'slide')
    proj.close()
    # ---------- the follower through LF_DEBUG.clip: jump pattern 1 2 3 1 2 3 1 2 4 1 on the English song ----------
    pg.click('.tabs button[data-tab=live]')
    ev("LF_DEBUG.open('V82 EN')"); ev("LF_DEBUG.mode('songs')")
    # (the first two thirds of each line: a clip ends while the line is still being sung; a whole line would mean the
    # singer has finished it, and the line timing then rightly shows the next one)
    L = EN8.split('\n'); pat = [0, 1, 2, 0, 1, 2, 0, 1, 3, 0]; path = []
    for k in pat:
        # sung at about 0.55 s a word: the clip ends two thirds into the line, the screen is read just after it
        w = L[k].split(' '); n2 = max(3, len(w) * 2 // 3); pg.wait_for_timeout(int(n2 * 550))
        r = ev(f"LF_DEBUG.clip({json.dumps(' '.join(w[:n2]))})"); pg.wait_for_timeout(500); path.append(ev('LF_DEBUG.state().cur')); pg.wait_for_timeout(int((len(w) - n2) * 550))
    right = sum(1 for a, b in zip(pat, path) if a == b)
    ok(right >= 8, f'jump pattern {pat} followed: screen {path} ({right}/10 right)')
    pg.screenshot(path=f'{SHOTS}/follow_jump_operator.png')
    # ---------- operator correction holds against a weak clip ----------
    ev("document.querySelectorAll('#slides .ln')[5].click()"); pg.wait_for_timeout(300)
    ev("LF_DEBUG.clip('grace')"); pg.wait_for_timeout(800)
    ok(ev('LF_DEBUG.state().cur') == 5, f'operator correction to line 5 holds against one common word (at {ev("LF_DEBUG.state().cur")})')
    mv = ev('LF_DEBUG.state().moves.slice(-3)')
    ok(any(x[3] == 'manual' for x in mv), f'the correction is logged as manual {mv}')
    # learned: the correction 0 -> 5 is a trusted move
    lr = ev('LF_DEBUG.learned()')
    ok(ids['V82 EN'] in lr, f'the operator move was learned for the song ({len(lr.get(ids["V82 EN"], {}))} from-lines)')
    ev("LF_DEBUG.mode(null)")
    # ---------- recording: timeline (and audio) saved as files, replayed ----------
    pg.click('.tabs button[data-tab=settings]'); pg.check('#stRecord')
    pg.click('.tabs button[data-tab=live]'); pg.click('.seg [data-lm=songs]'); listen(True)
    ev("LF_DEBUG.open('V82 TA')")
    T = TA8.split('\n')
    for k in [0, 1, 2, 0, 1, 2, 3]:
        ev(f"LF_DEBUG.clip({json.dumps(T[k])})"); pg.wait_for_timeout(1500)
    ev("document.querySelectorAll('#slides .ln')[6].click()"); pg.wait_for_timeout(500)
    ev(f"LF_DEBUG.clip({json.dumps(T[7])})"); pg.wait_for_timeout(5500)
    pg.click('.tabs button[data-tab=settings]'); size = ev("document.getElementById('recSize').textContent")
    ok('KB' in size or 'MB' in size, f'recording size shown: {size}')
    pg.query_selector('#followPanel').screenshot(path=f'{SHOTS}/settings_recording.png')
    files = []
    pg.on('download', lambda d: files.append(d))
    pg.click('#stRecSave'); pg.wait_for_timeout(3000)
    names = [d.suggested_filename for d in files]
    ok(any(n.endswith('.json') for n in names) and any(n.endswith(('.webm', '.ogg', '.m4a')) for n in names), f'Save recording downloads the audio and the timeline {names}')
    for d in files:
        d.save_as(f'{SHOTS}/{d.suggested_filename}')
    js = [n for n in names if n.endswith('.json')]
    if js:
        tl = json.load(open(f'{SHOTS}/{js[0]}'))
        ok(len(tl['clips']) >= 8 and len(tl['manual']) >= 1 and len(tl['shown']) >= 3, f'timeline: {len(tl["clips"])} clips, {len(tl["shown"])} lines shown, {len(tl["manual"])} operator moves')
        out = subprocess.run(['node', ROOT + 'tests/timeline_replay.js', f'{SHOTS}/{js[0]}'], capture_output=True, text=True).stdout.strip()
        ok('operator corrections' in out, 'timeline_replay reads it: ' + out)
        aud = sorted([n for n in names if not n.endswith('.json')], key=lambda n: -os.path.getsize(f'{SHOTS}/{n}'))
        ok(aud and os.path.getsize(f'{SHOTS}/{aud[0]}') > 10000, f'audio saved ({os.path.getsize(f"{SHOTS}/{aud[0]}") if aud else 0} bytes, compressed)')
    print('     recording parts', tl['audio'] if js else None, [os.path.getsize(f'{SHOTS}/{n}') for n in names])
    pg.click('.tabs button[data-tab=settings]'); pg.uncheck('#stRecord')
    pg.click('.tabs button[data-tab=live]'); listen(False)
    # ---------- live stream for singing: off -> clips path; on -> the mocked stream feeds the tracker ----------
    pg.click('.tabs button[data-tab=settings]')
    pg.click('.netmode button[data-net=online]') if ev("!!document.querySelector('.netmode button[data-net=online]:not(.sel)')") else None
    pg.fill('#stSvKey', 'sk_test_0000000000000000'); pg.press('#stSvKey', 'Tab'); pg.wait_for_timeout(400)
    pg.route('https://api.sarvam.ai/**', lambda route: route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps({'transcript': '', 'language_code': 'en-IN'})))
    pg.click('.tabs button[data-tab=live]'); ev("LF_DEBUG.open('V82 EN')"); listen(True)
    w0 = ev('LF_DEBUG.whisper().engine'); o0 = ev('window.__ws.opened')
    ok(w0 == 'whisper' and o0 == 0, f'setting off: singing uses clips (engine {w0}, stream opened {o0} times)')
    listen(False)
    pg.click('.tabs button[data-tab=settings]'); pg.check('#stSvStream'); pg.click('.tabs button[data-tab=live]')
    ev("document.querySelectorAll('#slides .ln')[0].click()")
    ev(f"window.__ws.lines = {json.dumps([L[1], L[2], L[3], L[4]])}")
    listen(True); pg.wait_for_timeout(7500)
    w1 = ev('LF_DEBUG.whisper().engine'); cur = ev('LF_DEBUG.state().cur'); wsd = ev('window.__ws')
    ok(w1 == 'sarvam' and wsd['opened'] >= 1 and wsd['sent'] > 0, f'setting on: the live stream is used (engine {w1}, opened {wsd["opened"]}, audio frames sent {wsd["sent"]})')
    ok(cur >= 3, f'the stream\'s partial and final text move the screen (line {cur} after lines 1-4 were sung)')
    st = ev("document.getElementById('statusText').textContent"); ok('experimental' in st or 'Sarvam' in st, f'status says it: {st}')
    pg.screenshot(path=f'{SHOTS}/stream_experimental.png')
    listen(False)
    pg.click('.tabs button[data-tab=settings]'); pg.uncheck('#stSvStream'); pg.fill('#stSvKey', ''); pg.press('#stSvKey', 'Tab')
    bad = [e for e in errs if not any(k in e for k in KNOWN)]
    ok(not bad, f'no console errors beyond the known ones ({len(errs)} known: fonts / offline engine) {bad[:3]}')
    br.close()
finally:
    srv.terminate()
print(f'\n{len(fails)} check(s) failed' if fails else '\nall v82 browser checks passed')
sys.exit(1 if fails else 0)
