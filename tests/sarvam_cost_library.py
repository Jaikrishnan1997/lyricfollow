# Sarvam cost + whole-library search, end to end in Chromium with Sarvam/Groq mocked.
#  - today's service holds only "Enthan Naavil"; the singer starts "Alleluya Kartharaiye" (in the library only):
#    the app must find it in the library, open it, add it to today's list and follow it.
#  - seconds of audio sent per second of time while singing, during a 16 s music break, and during talk
#  - the daily limit: with a 1-minute limit Sarvam stops and Groq takes over
import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8778','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S='/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad/sherpa'
ch=json.load(open('/home/claude/lyricfollow/vendor/songs-church.json'))['songs']
al=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]; en=[s for s in ch if s['title'].startswith('எந்தன்')][0]
L=[l for l in al['lyrics'].split('\n') if l.strip()][:16]
DUR=4.5; BREAK_AT=8; BREAK=16.0; TALK=30.0
def t_line(i): return 3+i*DUR+(BREAK if i>=BREAK_AT else 0)
SING_END=t_line(len(L))
TALKTXT='இப்பொழுது நாம் எல்லாரும் ஜெபிப்போம் ஆண்டவர் நம்மை ஆசீர்வதிப்பாராக நன்றி செலுத்துவோம்'.split()
T0=[None]; reqs=[]
def heard(now, clip):
    a=now-clip; out=[]
    for i,l in enumerate(L):
        s=t_line(i); e=s+DUR; lo,hi=max(a,s),min(now,e)
        if hi<=lo: continue
        w=l.split(); n=len(w); i0=int((lo-s)/DUR*n); i1=max(i0+1,int(round((hi-s)/DUR*n))); out+=w[i0:i1]
    if now>SING_END+2 and now<SING_END+TALK: out=TALKTXT[int(now)%5:int(now)%5+6]
    return ' '.join(out)
def reply(route, who):
    body=route.request.post_data_buffer or b''
    now=time.time()-T0[0] if T0[0] else -1
    sec=max(0,(len(body)-900)/32000)
    reqs.append((round(now,1), who, round(sec,2)))
    txt=heard(now, sec) if T0[0] else ''
    time.sleep(0.6)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'transcript':txt,'text':txt}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={S}/real_song3.wav'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    def sv(route):
        if route.request.method=='OPTIONS': route.fulfill(status=200, headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'}); return
        reply(route,'sv')
    pg.route('https://api.sarvam.ai/**', sv)
    pg.route('https://api.groq.com/**', lambda r: reply(r,'groq'))
    pg.goto('http://localhost:8778/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(en['title'],ensure_ascii=False)})")
    pg.evaluate(f"LF_DEBUG.service([{json.dumps(en['title'],ensure_ascii=False)}])")
    cap = sys.argv[1] if len(sys.argv)>1 else '0'
    pg.evaluate("""(cap)=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stWhKey','gsk_test'); go('stWhOn',true); go('stSvKey','sk_test_1234567890'); go('stSvCap', cap);}""", cap)
    pg.wait_for_timeout(1500)
    w0=pg.evaluate('LF_DEBUG.whisper()'); print('library at start: songs', w0['songsN'], 'lib lines', w0['libN'])
    pg.click('#btnListen'); pg.wait_for_timeout(300)
    T0[0]=time.time(); seen={}; found=None; trace=[]
    while time.time()-T0[0]<SING_END+TALK:
        st=pg.evaluate('LF_DEBUG.state()'); t=time.time()-T0[0]
        if st['song'] and st['song'].startswith('அல்லேலூயா'):
            if found is None: found=(round(t,1), st['cur'], st['svc']); print('trk at find', json.dumps(st['trk'], ensure_ascii=False)[:1500])
            c=st['cur']
            if c>=0 and c not in seen: seen[c]=round(t,1)
        if int(t*2)%10==0: trace.append((round(t,1), pg.evaluate('LF_DEBUG.whisper()')['plan']))
        time.sleep(0.25)
    print('found in library at', found and found[0], 's, line', found and found[1], 'service now', found and found[2])
    print('line delays', [round(seen[i]-t_line(i),1) for i in range(len(L)) if i in seen], 'missed', [i for i in range(len(L)) if i not in seen])
    def rate(a,b):
        rr=[r for r in reqs if a<=r[0]<b]; return round(sum(r[2] for r in rr)/(b-a),2), len(rr)
    print('audio sec sent per sec - singing:', rate(3, t_line(BREAK_AT)), ' music break:', rate(t_line(BREAK_AT)-BREAK+3, t_line(BREAK_AT)), ' singing2:', rate(t_line(BREAK_AT), SING_END), ' talk:', rate(SING_END+5, SING_END+TALK))
    print('providers', ''.join(r[1][0] for r in reqs)); w=pg.evaluate('LF_DEBUG.whisper()'); print('svUse', w['svUse'], 'blocked', w['blocked'])
    print('usage text', pg.evaluate("document.getElementById('svUse').textContent"))
    print('trk', json.dumps(pg.evaluate('LF_DEBUG.state().trk.slice(-14)'), ensure_ascii=False)); print('reqs', reqs)
    print('ERR', errs); b.close()
finally: srv.terminate()
