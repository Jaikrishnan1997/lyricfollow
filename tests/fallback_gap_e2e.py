# Provider handoff: Sarvam answers for 15 s, then fails (MODE=500 server error, MODE=402 no credit, MODE=net cut);
# Groq answers words all along. Measures the gap between the last words from Sarvam and the first from Groq,
# and checks the screen keeps its place across the handoff.
#   MODE=500|402|net python3 tests/fallback_gap_e2e.py      (ROOT=... PORT=... for another copy)
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, os
from playwright.sync_api import sync_playwright
R=os.environ.get('ROOT', ROOT); PORT=os.environ.get('PORT','8785')
MODE=os.environ.get('MODE','500')
srv = subprocess.Popen([sys.executable,'-m','http.server',PORT,'-d',R],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
ch=json.load(open(R+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா கர்த்தரையே')][0]
L=[l for l in al['lyrics'].split('\n') if l.strip()]
T0=[None]; ev=[]
def words(now):   # a line every 5 s from the start, a few words of it
    k=int((now-T0[0])/5) if T0[0] else 0
    w=L[min(k,len(L)-1)].split(); return ' '.join(w[:2])
def sv(route):
    now=time.time()
    if T0[0] and now-T0[0] > 15:
        if MODE=='net': return route.abort()
        return route.fulfill(status=int(MODE), content_type='application/json', headers={'access-control-allow-origin':'*'}, body='{"error":{"message":"test"}}')
    txt=words(now); ev.append((round(now-T0[0],1) if T0[0] else 0,'sv',txt))
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'transcript':txt}, ensure_ascii=False))
def gq(route):
    now=time.time(); txt=words(now); ev.append((round(now-T0[0],1) if T0[0] else 0,'gq',txt))
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'text':txt,'segments':[{'text':txt,'no_speech_prob':0.05,'avg_logprob':-0.2}]}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    br=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=br.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.sarvam.ai/**', sv); pg.route('https://api.groq.com/**', gq)
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click(); try{localStorage.removeItem('lf-wh-block')}catch(e){}}""")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stSvKey','sv_test_key_123'); go('stSvOn',true); go('stWhKey','gsk_test'); go('stWhOn',true);}""")
    pg.click('#btnListen'); T0[0]=time.time()
    pg.wait_for_timeout(40000)
    st=pg.evaluate('LF_DEBUG.state()'); eng=pg.evaluate('LF_DEBUG.whisper()')
    lastSv=max([t for t,k,x in ev if k=='sv' and x] or [0]); firstGq=min([t for t,k,x in ev if k=='gq' and x and t>lastSv] or [99])
    print(f'MODE {MODE}: last Sarvam words at {lastSv}s, first Groq words at {firstGq}s -> gap {firstGq-lastSv:.1f}s; engine {eng["engine"]} provider {eng["provider"]}; line now {st["cur"]} (sung ~{int(40/5)})')
    try: print('handoffs', pg.evaluate('JSON.stringify(LF_DEBUG.handoffs ? LF_DEBUG.handoffs() : null)'))
    except Exception as e: pass
    print('ERR', errs); br.close()
finally: srv.terminate()
