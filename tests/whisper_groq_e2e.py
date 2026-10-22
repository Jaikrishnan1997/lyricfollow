import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json, asyncio, re, websockets, numpy as np, io, soundfile as sf
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8768','-d',ROOT[:-1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
calls=[]
def asr(wav_bytes):
    a,sr=sf.read(io.BytesIO(wav_bytes),dtype='float32')
    from websockets.sync.client import connect
    with connect('ws://127.0.0.1:6109', max_size=None) as ws:
        ws.send(sr.to_bytes(4,'little')+(a.size*4).to_bytes(4,'little')+a.tobytes()); r=json.loads(ws.recv()); ws.send('Done'); return r.get('text','')
def handle(route):
    req=route.request; body=req.post_data_buffer; ct=req.headers.get('content-type','')
    b=ct.split('boundary=')[1].encode(); parts=body.split(b'--'+b); fields={}; wav=None
    for p in parts:
        if b'name="' not in p: continue
        head,_,val=p.partition(b'\r\n\r\n'); val=val.rstrip(b'\r\n-')
        name=re.search(rb'name="([^"]+)"',head).group(1).decode()
        if name=='file': wav=val
        else: fields[name]=val.decode('utf-8','replace')
    txt=asr(wav) if wav else ''
    calls.append({'lang':fields.get('language'),'model':fields.get('model'),'prompt':fields.get('prompt','')[:50],'text':txt[:50]})
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'text':txt,'segments':[{'text':txt,'no_speech_prob':0.1,'avg_logprob':-0.5}]}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}','--autoplay-policy=no-user-gesture-required'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.groq.com/**', handle)
    pg.goto('http://localhost:8768/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    ch=json.load(open(ROOT+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stWhKey','gsk_test'); go('stWhOn',true);}""")
    pg.click('#btnListen'); path=[]
    for i in range(15):
        pg.wait_for_timeout(2000); st=pg.evaluate('LF_DEBUG.state()'); path.append(st['cur'])
    print('whisper', pg.evaluate('LF_DEBUG.whisper()'))
    print('path', path)
    print('calls', len(calls)); [print(c) for c in calls[:12]]
    print('badge', pg.inner_text('.engine-badge'), '| status', pg.inner_text('#statusText'))
    print('ERR', errs); b.close()
finally: srv.terminate()
