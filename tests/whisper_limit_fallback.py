import sys, time, subprocess, json, threading
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8775','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S='/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad/sherpa'
ch=json.load(open('/home/claude/lyricfollow/vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]
L=[l for l in al['lyrics'].split('\n') if l.strip()][:16]
DUR=float(sys.argv[1]) if len(sys.argv)>1 else 4.5
sched=[]; T0=[None]
calls=[]; groqN=[0]; localN=[0]
def heard(now, clip):
    a=now-clip; out=[]
    for i,l in enumerate(L):
        s=T0[0]+3+i*DUR; e=s+DUR
        lo,hi=max(a,s),min(now,e)
        if hi<=lo: continue
        w=l.split(); n=len(w); i0=int((lo-s)/DUR*n); i1=max(i0+1,int(round((hi-s)/DUR*n)))
        out+=w[i0:i1]
    return ' '.join(out)
def handle(route):
    now=time.time(); clip=float(route.request.headers.get('x-clip','5'))
    txt=heard(now, 5.0) if T0[0] else ''
    calls.append(round(now-(T0[0] or now),1))
    time.sleep(0.7)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'text':txt,'segments':[{'text':txt,'no_speech_prob':0.05,'avg_logprob':-0.2}]}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={S}/real_song3.wav'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    def groq(route):
        groqN[0]+=1
        if groqN[0]>5:
            route.fulfill(status=429, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'error':{'message':'Rate limit reached for model whisper-large-v3 on requests per day (RPD): Limit 2000, Used 2000'}})); return
        handle(route)
    def local(route):
        localN[0]+=1; handle(route)
    def health(route):
        route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body='{"status":"ok"}')
    pg.route('https://api.groq.com/**', groq)
    pg.route('http://127.0.0.1:6020/health', health)
    pg.route('http://127.0.0.1:6020/inference', local)
    pg.goto('http://localhost:8775/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stWhKey','gsk_test'); go('stWhOn',true);}""")
    pg.click('#btnListen'); pg.wait_for_timeout(500)
    T0[0]=time.time(); seen={}; wrong=0; samples=0
    end=3+len(L)*DUR+3
    while time.time()-T0[0]<end:
        cur=pg.evaluate('LF_DEBUG.state().cur'); t=time.time()-T0[0]
        sung=int((t-3)//DUR) if t>=3 else -1
        if cur>=0 and cur not in seen: seen[cur]=t
        if sung>=0 and sung<len(L): samples+=1; wrong+= (cur>sung+1)
        time.sleep(0.1)
    d=[round(seen[i]-(3+i*DUR),1) for i in range(len(L)) if i in seen]
    miss=[i for i in range(len(L)) if i not in seen]
    import statistics as st
    print(f'line={DUR}s delays', d)
    print('median', st.median(d) if d else None, 'max', max(d) if d else None, 'missed', miss, 'far-ahead samples', wrong, '/', samples, 'requests', len(calls), 'per min', round(len(calls)/((end)/60),1))
    print('groq', groqN[0], 'local', localN[0]); print('ERR', errs); b.close()
finally: srv.terminate()
