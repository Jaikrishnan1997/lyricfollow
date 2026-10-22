import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8768','-d',ROOT[:-1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
T=["ஏனென்னால் நான் பார்க்கலாம்","ஏனென்னால் நான் கருத்தரையே ஏகமாய்த் துதியுங்கள்","இயேசுராஜன்","ஏற்றுக்கொள்ளும் இயேசுராஜன்","அல்லவா ஏற்றுக்கொள்ளுங்கள்","இயேசுவைத் துதியுங்கள்","விரும்பும் பாதுகாப்புகள்","சில் கெள்ளாம் மாற்கோரிக்குதி","தேவனைத் துதியுங்கள்","அல்லது யார் என்னிடிய செய்யும்","நையிலுரைக் குதியுங்கள்","நெல்லாரியா, பீஞ்சில்","விரைசாரை பார்வேயால்"]
ch=json.load(open(ROOT+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]
q=list(T); out=[]
def handle(route):
    txt=q.pop(0) if q else ''
    time.sleep(0.5)
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'text':txt,'segments':[{'text':txt,'no_speech_prob':0.05,'avg_logprob':-0.3}]}, ensure_ascii=False))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={AUDIO}'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.groq.com/**', handle)
    pg.goto('http://localhost:8768/index.html'); pg.wait_for_timeout(9000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click();}""")
    pg.evaluate(f"LF_DEBUG.open({json.dumps(al['title'],ensure_ascii=False)})")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stWhKey','gsk_test'); go('stWhOn',true);}""")
    pg.click('#btnListen'); path=[]
    for i in range(int(len(T)*3.4/0.5)+6):
        pg.wait_for_timeout(500); c=pg.evaluate('LF_DEBUG.state().cur')
        if not path or path[-1]!=c: path.append(c)
    print('path', path); print('ERR', errs); b.close()
finally: srv.terminate()
