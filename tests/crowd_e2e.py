# The noise test through the whole app in real time (tests/live_crowd.json): each condition's recorded Sarvam
# answers come back when the app asks for them. Right line / one off / wrong / other song / nothing yet.
#   COND=c1_claps100_6dB python3 tests/crowd_e2e.py      (ROOT=... PORT=... to test another copy)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, os
from playwright.sync_api import sync_playwright
R=os.environ.get('ROOT', ROOT); PORT=os.environ.get('PORT','8786'); COND=os.environ.get('COND','c0_clean')
srv = subprocess.Popen([sys.executable,'-m','http.server',PORT,'-d',R],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
run=json.load(open(ROOT+'tests/live_crowd.json')); clips=run['conditions'][COND]
ch=json.load(open(R+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith(run['song'])][0]
T0=[None]; used=set()
def handle(route):
    now=time.time(); txt=''
    if T0[0]:
        r=now-T0[0]; best=None
        for k,(t,x) in enumerate(clips):
            if k in used or not (r-1.3 < t <= r+1.3): continue
            if best is None or abs(t-r)<abs(clips[best][0]-r): best=k
        if best is not None: used.add(best); txt=clips[best][1]
    time.sleep(0.3)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'transcript':txt}, ensure_ascii=False))
def truth(r):
    w=None
    for t,l in run['truth']:
        if r>=t: w=l
    return w
try:
  with sync_playwright() as p:
    br=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=br.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.sarvam.ai/**', handle)
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    L=pg.evaluate("LF_DEBUG.lines().map(x=>x.replace(/^\\d+[~ ] /,''))")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stSvKey','sv_test_key_123'); go('stSvOn',true);}""")
    pg.click('#btnListen'); T0[0]=time.time()
    c={'right':0,'one off':0,'wrong':0,'other song':0,'nothing yet':0}
    while time.time()-T0[0] < 120:
        s=pg.evaluate("(()=>{const s=LF_DEBUG.state(); return [s.song, s.cur]})()"); w=truth(time.time()-T0[0])
        if w is not None:
            if s[0]!=al['title']: k='other song'
            elif s[1]<0: k='nothing yet'
            elif L[s[1]]==L[w]: k='right'
            elif any(0<=i<len(L) and L[i]==L[s[1]] for i in (w-1,w+1)): k='one off'
            else: k='wrong'
            c[k]+=1
        time.sleep(.25)
    n=sum(c.values()); print(COND.ljust(26), ' '.join(f'{k} {100*v/n:.0f}%' for k,v in c.items()))
    print('ERR', errs); br.close()
finally: srv.terminate()
