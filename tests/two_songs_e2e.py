# Tonight's live run (tests/live_two_songs.json: Alleluya, then Enthan - the user's own copies) replayed through the
# whole app in real time on the Sarvam path: each clip gets the recorded answer nearest in time. Measures how often the
# projector shows the line being sung (by its text), one off, wrong, and when it changes to the second song.
#   python3 tests/two_songs_e2e.py [v]
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
import os
R=os.environ.get('ROOT', ROOT)
srv = subprocess.Popen([sys.executable,'-m','http.server',os.environ.get('PORT','8771'),'-d',R],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
import os
run=json.load(open(R+'tests/'+os.environ.get('RUN','live_two_songs.json')))
ch=json.load(open(R+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா கர்த்தரையே')][0]
b=al['lyrics'].split('\n\n'); A='\n\n'.join([b[0],b[1],b[2],b[4],b[6],b[8]])
E='\n\n'.join(['எந்தன் நாவில் புதுபாட்டு','எந்தன் நாவில் புதுபாட்டு\nஎந்தன் இயேசு தருகிறார்','ஆனந்தம் கொள்ளுவேன்\nஅவரை நான் பாடுவேன் -உயிருள்ள\nநாள் வரையில் அல்லேலூயா','பாவ இருள் என்னை வந்து\nசூழ்ந்து கொள்கையில் -தேவனவர்\nதீபமாய் என்னை தேற்றினார்','வாதை நோயும் வந்தபோது\nவேண்டல் கேட்டிட்டார் -பாதை காட்டி\nதுன்பமெல்லாம் நீக்கிமீட்டிட்டார்','சேற்றில் வீழ்ந்த என்னையவர்\nதூக்கியெடுத்தார் -நாற்றமெல்லாம்\nஜீவ இரத்தம் கொண்டு மாற்றினார்','தந்தை தாயும் நண்பர் உற்றார்\nயாவுமாயினார் – நிந்தை தாங்கி\nஎங்குமவர் மேன்மை சொல்லுவேன்','இவ்வுலக பாடு என்னை\nஎன்னை செய்திடும் -அவ்வுலக\nவாழ்க்கைக் காண காத்திருக்கிறேன்'])
R0=float(os.environ.get('R0','14.0')); T0=[None]; used=set(); kt=[0]
def handle(route):
    now=time.time(); txt=''
    try:
        if b'keyterms' in (route.request.post_data_buffer or b''): kt[0]+=1
    except Exception: pass
    if T0[0]:
        r=R0+(now-T0[0]); best=None
        for k,(t,x) in enumerate(run['clips']):
            if k in used or not (r-1.3 < t <= r+1.3): continue
            if best is None or abs(t-r)<abs(run['clips'][best][0]-r): best=k
        if best is not None: used.add(best); txt=run['clips'][best][1]
    time.sleep(0.3)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'transcript':txt,'language_code':'ta-IN'}, ensure_ascii=False))
def truth(r):
    t=None
    for x in run['truth']:
        if r>=x[0]: t=x
    return t
try:
  with sync_playwright() as p:
    br=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=br.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.sarvam.ai/**', handle)
    pg.goto('http://localhost:'+os.environ.get('PORT','8771')+'/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.addSong('Enthan test', 'ta-IN', {json.dumps(E, ensure_ascii=False)})"); pg.wait_for_timeout(800)
    pg.evaluate(f"LF_DEBUG.addSong('Alleluya test', 'ta-IN', {json.dumps(A, ensure_ascii=False)})"); pg.wait_for_timeout(1500)
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stSvKey','sv_test_key_123'); go('stSvOn',true); go('stBlank','8');}""")
    pg.click('#btnListen'); pg.wait_for_timeout(300)
    shown=[]; tl2=[]; refs={}
    T0[0]=time.time(); cnt={'right':0,'one off':0,'wrong':0,'blank':0}; cA={'right':0,'one off':0,'wrong':0,'blank':0}; tl=[]; last=None; sw=None
    while time.time()-T0[0] < float(os.environ.get('END','270'))-R0:
        st=pg.evaluate("(()=>{const s=LF_DEBUG.state(); const L=LF_DEBUG.lines(); return [s.song, s.cur, L.map(x=>x.replace(/^\\d+[~ ] /,''))]})()")
        r=R0+time.time()-T0[0]; tr=truth(r); song, cur, L = st[0], st[1], st[2]
        if song and song.startswith('Enthan') and sw is None: sw=round(r,1)
        if tr:
            want_song='Alleluya' if tr[1]=='A' else 'Enthan'
            # the right line's text, in the song's own sung order (as the app shows it)
            ref = None
            if song and song.startswith(want_song):
                ref = L[tr[2]] if tr[2] < len(L) else None
            k='blank' if cur<0 else 'wrong' if not ref else 'right' if L[cur]==ref else 'one off' if any(L[i]==ref for i in (cur-1,cur+1) if 0<=i<len(L)) else 'wrong'
            cnt[k]+=1
            if tr[1]=='A': cA[k]+=1
        if (song,cur)!=last: tl.append((round(r,1),(song or '')[:4],cur, tr and tr[1]+str(tr[2]))); last=(song,cur)
        if song and 0<=cur<len(L): shown.append((r,song,cur,L[cur],None))
        if tr: tl2.append((r,song,cur,k))
        if song and song.startswith('Alleluya'): refs.update({('A',i):x for i,x in enumerate(L)})
        if song and song.startswith('Enthan'): refs.update({('E',i):x for i,x in enumerate(L)})
        time.sleep(0.25)
    # display delay: for each sung line (truth entry), seconds until the screen shows its text (p50 / p95);
    # longest stretch on a wrong line; lead/timer moves undone by a 'back' to the line before within 4 s (the two
    # paths fighting); two lines advanced within 1.5 s on lead/timer alone
    import statistics as stx
    samp=[]; t_=None
    delays=[]; wrongrun=0; maxwrong=0; prevk=None
    for x in tl2:
        pass
    for i,(r,song,cur,ok) in enumerate(tl2):
        if ok=='wrong': wrongrun = wrongrun + (r - tl2[i-1][0] if i and tl2[i-1][3]=='wrong' else 0); maxwrong=max(maxwrong,wrongrun)
        else: wrongrun=0
    for k,x in enumerate(run['truth']):
        if not (R0 <= x[0] < R0 + (float(os.environ.get('END','270'))-R0) - 3): continue
        want_song='Alleluya' if x[1]=='A' else 'Enthan'; nxt = run['truth'][k+1][0] if k+1 < len(run['truth']) else x[0]+8
        hit=[r for (r,song,cur,L,ok) in shown if r>=x[0]-1 and r<nxt+4 and song.startswith(want_song) and L==refs.get((x[1],x[2]))]
        if hit: delays.append(max(0,hit[0]-x[0]))
    mv=pg.evaluate('LF_DEBUG.state().moves')
    fights=sum(1 for i,m in enumerate(mv) if m[3] in ('lead','timer') and any(n[3]=='back' and n[2]==m[1] and n[1]==m[2] and 0<n[0]-m[0]<4 for n in mv[i+1:i+4]))
    double=sum(1 for i in range(1,len(mv)) if mv[i][3] in ('lead','timer') and mv[i-1][3] in ('lead','timer','fwd') and mv[i][1]==mv[i-1][2] and mv[i][0]-mv[i-1][0]<1.5)
    if delays: print(f'display delay p50 {stx.median(delays):.1f}s p95 {sorted(delays)[int(.95*(len(delays)-1))]:.1f}s (of {len(delays)} sung lines, missed {sum(1 for x in run["truth"] if R0<=x[0])-len(delays)})  longest on a wrong line {maxwrong:.1f}s  lead/timer undone by a back move {fights}  two lines in 1.5 s {double}')
    ta=sum(cA.values()); print('Alleluya only', {k: f'{100*v/ta:.0f}%' for k,v in cA.items()})
    tot=sum(cnt.values()); print('both', {k: f'{100*v/tot:.0f}%' for k,v in cnt.items()}, 'switch to Enthan at', sw, '(sung from', run['switchAt'], ')', 'clips used', len(used), 'with key words', kt[0])
    if len(sys.argv)>1:
        print('screen changes (rec s, song, line, sung):', tl)
        stt=pg.evaluate('LF_DEBUG.state()'); t1=pg.evaluate('performance.now()/1000'); off=R0+(time.time()-T0[0])-t1
        print('  svc', stt['svc'])
        for x in stt['trk']: print('  trk', round(x[0]+off,1), x[1:])
    print('ERR', errs); br.close()
finally: srv.terminate()
