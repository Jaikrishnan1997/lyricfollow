# Bible levels 2 and 3 end to end (Sarvam chat mocked): a verse read out shows; an explanation sharing its words
# does not; a retold story is offered ("Did the preacher say...?"), shown by itself only when in today's plan;
# talk gets nothing.
import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8779','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
calls=[]
def chat(route):
    if route.request.method=='OPTIONS': route.fulfill(status=200, headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'}); return
    b=json.loads(route.request.post_data or '{}'); u=b['messages'][1]['content']; sysm=b['messages'][0]['content']; calls.append((u[-40:], 'plan' in sysm.lower() and 'Luke 15' in sysm))
    ans={'ref':None,'sure':1}
    if 'குமாரர்' in u or 'இளையவன்' in u: ans={'ref':'Luke 15:11-13','sure':0.95}
    elif 'நேசிக்கிறார்' in u: ans={'ref':'John 3:16','sure':0.7}
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps({'choices':[{'message':{'content':json.dumps(ans)}}],'usage':{'prompt_tokens':300,'completion_tokens':20}}))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.sarvam.ai/v1/chat/completions', chat)
    pg.goto('http://localhost:8779/index.html'); pg.wait_for_timeout(6000)
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stSvKey','sk_test_1234567890');}""")
    pg.evaluate("LF_DEBUG.mode('bible'); LF_DEBUG.setLang('ta-IN')")
    st=lambda: pg.evaluate("(()=>{const s=LF_DEBUG.state(); return {screen: s.screen.kind==='bible'? LFBible.refLabel(s.screen.bible,'en'):s.screen.kind, asked:s.asked, refs:s.heardRefs}})()")
    def say(t, wait=2500): pg.evaluate("t=>LF_DEBUG.feed(t,true,.9)", t); pg.wait_for_timeout(wait)
    res={}
    # warm the Tamil quote index
    say('தேவன் நல்லவர் கர்த்தர் நல்லவர் இயேசு நல்லவர் நன்றி', 6000)
    say('தேவன், தம்முடைய ஒரேபேறான குமாரனை விசுவாசிக்கிறவன் எவனோ அவன் கெட்டுப்போகாமல் நித்தியஜீவனை அடையும்படிக்கு, அவரைத் தந்தருளி, இவ்வளவாய் உலகத்தில் அன்புகூர்ந்தார்.', 4000)
    res['A verse read out']=st()
    pg.evaluate("LF_DEBUG.close()"); pg.wait_for_timeout(6500)
    say('அன்பானவர்களே, தேவன் நம்மை நேசிக்கிறார், அதனால் அவர் தம்முடைய குமாரனை நமக்காக அனுப்பினார், நாம் அவரை விசுவாசிக்க வேண்டும், அப்போது நித்திய ஜீவன் உண்டு', 9500)
    res['B explanation (shares words)']=st()
    say('ஒரு மனுஷனுக்கு இரண்டு குமாரர் இருந்தார்கள். இளையவன் தகப்பனை நோக்கி ஆஸ்தியில் எனக்கு வரும் பங்கை எனக்குத் தாரும் என்று கேட்டான், தூர தேசத்துக்குப் போனான்', 9500)
    res['C retold story']=st()
    say('எல்லாருக்கும் வணக்கம், இன்னைக்கு நாம எல்லாரும் சேர்ந்து ஆண்டவரை ஆராதிக்க வந்திருக்கிறோம், அடுத்த வாரம் வாலிபர் கூட்டம் இருக்கு, எல்லாரும் வாங்க', 9500)
    res['E talk']=st()
    pg.evaluate("""()=>{const e=document.getElementById('planInput'); if(e){e.value='Luke 15'; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change'));}}""")
    pg.evaluate("document.getElementById('btnAskNo') && document.getElementById('btnAskNo').click()")
    say('இளையவன் தகப்பனை நோக்கி ஆஸ்தியில் எனக்கு வரும் பங்கை எனக்குத் தாரும் என்று கேட்டான், அவன் எல்லாவற்றையும் அழித்துவிட்டான், பன்றிகளை மேய்த்தான்', 9500)
    res['D story, in plan']=st()
    for k,v in res.items(): print(k.ljust(30), json.dumps(v, ensure_ascii=False))
    print('AI calls', len(calls), calls); print('use', pg.evaluate("LF_DEBUG.whisper().svUse"), pg.evaluate("document.getElementById('svUse').textContent"))
    print('ERR', errs); b.close()
finally: srv.terminate()
