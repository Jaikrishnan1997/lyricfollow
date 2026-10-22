# Slow song, Sarvam-like sparse words (0-2 words a clip): the screen must never go blank in the middle of the song.
# Seen live: "Blank after 8 s" fired while the line was still being sung (no move for 8 s), and the lyrics came back
# 2-3 lines further on.  python3 tests/blank_sparse_e2e.py
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, random
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8769','-d',ROOT[:-1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
ch=json.load(open(ROOT+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]
L=[l for l in al['lyrics'].split('\n') if l.strip()][:14]
DUR=7.0; rnd=random.Random(5); T0=[None]
def heard(now, clip):
    a=now-clip; out=[]
    for i,l in enumerate(L):
        s=T0[0]+3+i*DUR; e=s+DUR; lo,hi=max(a,s),min(now,e)
        if hi<=lo: continue
        w=l.split(); n=len(w); i0=int((lo-s)/DUR*n); i1=max(i0+1,int(round((hi-s)/DUR*n))); out+=w[i0:i1]
    if 20 < now-T0[0] < 50: return rnd.choice(['', 'அல்லேலூயா', 'துதியுங்கள்'])   # a stretch where only common words come through
    if not out or rnd.random()<.35: return ''
    k=rnd.choice([1,1,2]); j=rnd.randrange(len(out)); return ' '.join(out[j:j+k])
def handle(route):
    now=time.time(); txt=heard(now, 4.5) if T0[0] else ''
    time.sleep(0.7)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'text':txt,'segments':[{'text':txt,'no_speech_prob':0.05,'avg_logprob':-0.2}] if txt else []}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.groq.com/**', handle)
    pg.goto('http://localhost:8769/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stWhKey','gsk_test'); go('stWhOn',true); go('stBlank','8');}""")
    pg.click('#btnListen'); pg.wait_for_timeout(500)
    T0[0]=time.time(); blank=0; samples=0; spans=[]; on=None
    end=3+len(L)*DUR
    while time.time()-T0[0]<end:
        st=pg.evaluate("(()=>[LF_DEBUG.state().cur, document.querySelector('#preview .lf-txt').childElementCount])()"); t=time.time()-T0[0]
        if t>12:
            samples+=1; isb = st[1]==0
            if isb: blank+=1
            if isb and on is None: on=t
            if not isb and on is not None: spans.append((round(on,1),round(t-on,1))); on=None
        time.sleep(0.2)
    print('blank samples', blank, '/', samples, 'blank spans (start s, length s)', spans, 'state', st)
    print('ERR', errs); b.close()
finally: srv.terminate()
