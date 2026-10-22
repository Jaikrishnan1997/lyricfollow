import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, re
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8768','-d',ROOT[:-1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
ch=json.load(open(ROOT+'vendor/songs-church.json'))['songs']
AL=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]; TK=[s for s in ch if s['title'].startswith('துதி')][0]; EN=[s for s in ch if s['title'].startswith('எந்தன்')][0]
def tl(s): return [l for l in s['lyrics'].split('\n') if l.strip() and re.search('[஀-௿]',l)]
DUR=4.5
# singer: Alleluya lines 8..19, then a 6 s talk gap, then Thudhi Kanam lines 0..9
plan=[(AL['title'],i,l) for i,l in list(enumerate(tl(AL)))[8:20]] + [(None,-1,'இப்போது அடுத்த பாடல் பாடுவோம் எல்லோரும் எழுந்து நில்லுங்கள்')] + [(TK['title'],i,l) for i,l in list(enumerate(tl(TK)))[0:10]]
T0=[None]
def heard(now):
    a=now-4.5; out=[]
    for k,(sg,i,l) in enumerate(plan):
        s=T0[0]+3+k*DUR; e=s+DUR; lo,hi=max(a,s),min(now,e)
        if hi<=lo: continue
        w=l.split(); n=len(w); i0=int((lo-s)/DUR*n); i1=max(i0+1,int(round((hi-s)/DUR*n))); out+=w[i0:i1]
    return ' '.join(out)
def handle(route):
    txt=heard(time.time()) if T0[0] else ''
    time.sleep(0.7)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'text':txt,'segments':[{'text':txt,'no_speech_prob':0.05,'avg_logprob':-0.2}]}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.groq.com/**', handle)
    pg.goto('http://localhost:8768/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.service({json.dumps([EN['title'],TK['title'],AL['title']],ensure_ascii=False)})")
    if 'none' not in sys.argv: pg.evaluate(f"LF_DEBUG.open({json.dumps(EN['title'],ensure_ascii=False)}, false)")   # the WRONG song is open
    else: pg.evaluate("LF_DEBUG.close && LF_DEBUG.close()")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stWhKey','gsk_test'); go('stWhOn',true);}""")
    pg.click('#btnListen'); pg.wait_for_timeout(300)
    T0[0]=time.time(); first={}; flips=[]; lastsong=None; samples=0; behind2=0
    end=3+len(plan)*DUR+3
    while time.time()-T0[0]<end:
        st=pg.evaluate('LF_DEBUG.state()'); t=time.time()-T0[0]; song=st['song']; cur=st['cur']
        if song!=lastsong: flips.append((round(t,1), (song or '')[:12])); lastsong=song
        k=int((t-3)//DUR) if t>=3 else -1
        if 0<=k<len(plan) and plan[k][0]:
            sg,i,_=plan[k]; samples+=1
            # raw index of Tamil line i (pairs in church songs: Tamil only songs => raw=i; Thudhi has Tamil/Latin pairs => raw=2i)
            raw = i*2 if sg==TK['title'] else i
            if song==sg and cur>=0:
                if (sg,raw) not in first: pass
                if cur < raw-2: behind2+=1
            key=(sg,i)
            if song==sg and cur>=raw and key not in first: first[key]=round(t-(3+k*DUR),1)
        time.sleep(0.1)
    print('svc', pg.evaluate('LF_DEBUG.state().svcLog'))
    print('song changes', flips)
    print('line delays', [first.get((sg,i)) for sg,i,_ in plan if sg])
    print('samples 2+ lines behind', behind2, '/', samples)
    print('ERR', errs); b.close()
finally: srv.terminate()
