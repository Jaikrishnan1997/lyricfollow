import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8768','-d',ROOT[:-1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S=SCRATCH+'/sherpa'
T=['ஏதாவது பார்த்துக்கொள்ளுங்கள்', 'ஏனென்றால் நான் கருத்தரையே ஏகமாய்த் துதியுங்கள்', 'ஏற்றுக்கொள்ளும்', 'வல்லோரையாய் கிரியை செய்யும்', 'நான் கர்த்துறையே இயகப் பைத்துவியே', 'வணக்கம்', 'அவன் அடுத்தும் செய்யகளெல்லாம்', 'காட்டுரை குதியுங்கள்', 'நல்ல பயால் திவீர்', 'ஐயா', 'ஐயா', 'ஏன் செல்லுவில்லையோ, ஏன் செல்லுவில்லோ, ஏசா,', 'ஏசோ வெற்றுவியுங்க', 'நாட்டாலி ஆஜேதா பீசு நாட்டு', 'பார்த்துக்கொள்ளுங்கள்', 'அன்றி செய்யுங்கள் அல்லவே உயா', 'அல்லவு யார் அல்லவு யார்', 'தேவாலிக்கும் நியம்க்கல்', 'அல்லேலுயா, அல்லேலுயா', 'அல்லேலுயா தேவான துதியுங்கள்', 'இயேசுராஜன்', 'தீரியை நெய்யும் கத்தரிக்கும்', 'கடந்தையைக் குழியுங்கள்', 'கெட்டத்திடால் பாவன் கிடை', 'பாவங்களை ஓம்பி நாம் துருந்தியுங்கள்', 'சுங்கரே குப்புக்கின் காயமூன்', 'கைந்தாரும் உளைபிலும்', 'பிரியாக விரும்புகிறேன்', 'ஏறு காலதி மாடாது வெள்ளி', 'ஏஸுவைக் குதியுங்கள்', 'நான் சாதிதான் நிலாம் பேசுகிறேன்', 'சிலாகிலாம் பேசுகாது உமியுடாட்சி', 'மின்னாட்சி செய்தார் அடலே', 'அல்லேயுயா அல்லேயுயா', 'ஏவாரிக்கும் நியூங்கள்']
ch=json.load(open(ROOT+'vendor/songs-church.json'))['songs']; al=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]
q=list(T); out=[]
def handle(route):
    txt=q.pop(0) if q else ''
    time.sleep(0.8)
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
    for i in range(int(len(T)*4.2/0.5)+6):
        pg.wait_for_timeout(500); c=pg.evaluate('LF_DEBUG.state().cur')
        if not path or path[-1]!=c: path.append(c)
    print('path', path); print('log', pg.evaluate('LF_DEBUG.state().svcLog')); print('ERR', errs); b.close()
finally: srv.terminate()
