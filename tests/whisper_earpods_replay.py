import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
mode = sys.argv[1] if len(sys.argv)>1 else 'open'
srv = subprocess.Popen([sys.executable,'-m','http.server','8769','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S='/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad/sherpa'
T=json.load(open(''+__import__('os').path.join(__import__('os').path.dirname(__file__),'earpods_alleluya.json')+''))
ch=json.load(open('/home/claude/lyricfollow/vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]
q=list(T); served=[]; prompts=[]
def handle(route):
    body=route.request.post_data_buffer or b''
    prompts.append(b'name="prompt"' in body)
    txt,tr=q.pop(0) if q else ('',None)
    served.append(tr)
    time.sleep(0.8)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'text':txt,'segments':[{'text':txt,'no_speech_prob':0.05,'avg_logprob':-0.4}]}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={S}/real_song3.wav'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.groq.com/**', handle)
    pg.goto('http://localhost:8769/index.html'); pg.wait_for_timeout(8000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate("LF_DEBUG.service(['அல்லேலூயா','Enthan','அழகாய்','அழைத்தீரே'])")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stWhKey','gsk_test'); go('stWhOn',true);}""")
    if mode=='reload':
        pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(8000)
    pg.click('#btnListen'); samples=[]
    t0=time.time()
    while (q or len(served)<len(T)) and time.time()-t0<400:
        pg.wait_for_timeout(250); c=pg.evaluate('LF_DEBUG.state().cur')
        if served and served[-1] is not None: samples.append((len(served)-1, served[-1], c))
        if len(served)>=len(T): pg.wait_for_timeout(1500); break
    # per clip: shown line ~1.5 s after the response (last sample of each clip)
    last={}
    for i,tr,c in samples: last[i]=(tr,c)
    beh=[(i,tr,c) for i,(tr,c) in sorted(last.items()) if tr>=0]
    bad=[x for x in beh if x[1]-x[2]>=2 and not (x[1]>=4 and (x[1]-4)%8<4 and x[2]>=4 and (x[2]-4)%8<4 and (x[1]-x[2])%8==0)]
    print('clips',len(beh),'2+ behind',len(bad),'prompted',sum(prompts),'/',len(prompts))
    print('path',[c for i,(tr,c) in sorted(last.items())])
    print('bad',bad[:40]); print('moves',pg.evaluate('LF_DEBUG.state().moves')); print('ERR',errs); b.close()
finally: srv.terminate()
