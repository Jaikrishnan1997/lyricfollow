# A clip on its way while the operator moves the screen: its words (about the place before) must not move the screen
# back. The recognizer answers 2.5 s late with words of line 9; the operator presses → (next line) meanwhile.
#   python3 tests/stale_result_e2e.py    (ROOT=... PORT=... to test another copy)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, os
from playwright.sync_api import sync_playwright
R=os.environ.get('ROOT', ROOT); PORT=os.environ.get('PORT','8783')
srv = subprocess.Popen([sys.executable,'-m','http.server',PORT,'-d',R],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
ch=json.load(open(R+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா கர்த்தரையே')][0]
L=[l for l in al['lyrics'].split('\n') if l.strip()]
state={'n':0}
def handle(route):
    state['n']+=1
    txt = L[9] if state['n']==3 else ''
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'transcript':txt}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    br=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=br.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.sarvam.ai/**', handle)
    # the 3rd answer reaches the app 2.5 s late (a slow network), so the operator can act while it is on its way
    pg.add_init_script("(()=>{const of=window.fetch; let n=0; window.fetch=async function(u,o){ const r=await of(u,o); if(/sarvam/.test(String(u))&&++n===3){ window.__late=1; await new Promise(z=>setTimeout(z,2500)); window.__late=2; } return r; };})()")
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stSvKey','sv_test_key_123'); go('stSvOn',true);}""")
    pg.click('#btnListen')
    for _ in range(200):
        if pg.evaluate('window.__late||0')==1: break
        pg.wait_for_timeout(50)
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    for _ in range(14): pg.keyboard.press('ArrowRight')       # the operator: to line 14, while the late clip is on its way
    at=pg.evaluate('LF_DEBUG.state().cur'); pg.wait_for_timeout(3500)
    after=pg.evaluate('LF_DEBUG.state().cur')
    print('operator put the screen on', at, '- after the late answer (line 9 words):', after, 'OK' if after==at else 'MOVED BY A STALE CLIP')
    if os.environ.get('ROOT') is None: print('timing', pg.evaluate('JSON.stringify(LF_DEBUG.timing())'))
    print('ERR', errs); br.close()
finally: srv.terminate()
