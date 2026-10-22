# The whole live Alleluya run (tests/live_single_alleluya.json) replayed through the app in real time: the recorded
# Sarvam answers come back at the moments they came live. Measures how often the projector shows the line being sung,
# one behind, or one ahead.  python3 tests/single_song_e2e.py
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
R=ROOT
srv = subprocess.Popen([sys.executable,'-m','http.server','8770','-d',R],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
run=json.load(open(R+'tests/live_single_alleluya.json'))
ch=json.load(open(R+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா கர்த்தரையே')][0]
b=al['lyrics'].split('\n\n'); once='\n\n'.join([b[0],b[1],b[2],b[4],b[6],b[8]])
# when each line (sung order V1 C V2 C V3) starts, in the recording's seconds
starts=[(289,0),(302,1),(307.5,2),(314.5,3),(323,4),(329.5,5),(333,6),(336,7),(347,8),(357.5,9),(366,10),(371.5,11),(385,12),(386.5,13),(391.5,14),(394.5,15),(406.5,16),(415.5,17)]
def truth(r):
    t=-1
    for s,l in starts:
        if r>=s: t=l
    return t
R0=286.0; T0=[None]; used=set()
def handle(route):
    now=time.time(); txt=''
    if T0[0]:
        r=R0+(now-T0[0]); best=None
        for k,(t,x) in enumerate(run['clips']):
            if k in used or not (r-1.3 < t <= r+1.3): continue
            if best is None or abs(t-r)<abs(run['clips'][best][0]-r): best=k
        if best is not None: used.add(best); txt=run['clips'][best][1]
    time.sleep(0.3)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'transcript':txt,'language_code':'ta-IN'}, ensure_ascii=False))
sung = len(sys.argv) > 1 and sys.argv[1] == 'typed'
try:
  with sync_playwright() as p:
    b_=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=b_.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.sarvam.ai/**', handle)
    pg.goto('http://localhost:8770/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.addSong('Alleluya test', 'ta-IN', {json.dumps(once, ensure_ascii=False)})"); pg.wait_for_timeout(1500)
    n=pg.evaluate("LF_DEBUG.lines().length")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stSvKey','sv_test_key_123'); go('stSvOn',true); go('stBlank','8');}""")
    pg.click('#btnListen'); pg.wait_for_timeout(300)
    T0[0]=time.time(); cnt={'exact':0,'behind':0,'ahead':0,'other':0,'blank':0}; tl=[]; last=None
    while time.time()-T0[0] < 423-R0:
        cur=pg.evaluate('LF_DEBUG.state().cur'); r=R0+time.time()-T0[0]; want=truth(r)
        if n < 30:   # the sheet as typed: map sung order to it
            want = want-8 if 12<=want<=15 else want-4 if want>=16 else want
        if want>=0:
            k='blank' if cur<0 else 'exact' if cur==want else 'behind' if cur==want-1 else 'ahead' if cur==want+1 else 'other'
            cnt[k]+=1
        if cur!=last: tl.append((round(r,1),cur,want)); last=cur
        time.sleep(0.2)
    tot=sum(cnt.values()); print('lines', n, {k: f'{100*v/tot:.0f}%' for k,v in cnt.items()})
    print('moves (rec s, screen, sung):', tl)
    print('clips used', len(used), '/', len(run['clips']))
    if len(sys.argv) > 1 and sys.argv[1] == 'v':
        st=pg.evaluate('LF_DEBUG.state()'); t1=pg.evaluate('performance.now()/1000'); off=R0+(time.time()-T0[0])-t1
        for x in st['trk']: print('  trk', round(x[0]+off,1), x[1:])
        for m in st['moves']: print('  move', round(m[0]+off,1), m[1:])
    print('ERR', errs); b_.close()
finally: srv.terminate()
