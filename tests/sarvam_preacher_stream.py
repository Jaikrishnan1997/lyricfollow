import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8778','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
S='/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad/sherpa'
info={'url':None,'msgs':0,'proto':None}
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-audio-capture={S}/ml_ref.wav'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    def ws_handler(ws):
        info['url']=ws.url
        def on_msg(m):
            info['msgs']+=1
            d=json.loads(m)
            if info['msgs']==8: ws.send(json.dumps({'event':'transcript.partial','utterance_idx':0,'text':'യോഹന്നാൻ മൂന്നാം'}))
            if info['msgs']==12: ws.send(json.dumps({'event':'transcript.final','utterance_idx':0,'text':'യോഹന്നാൻ മൂന്നാം അധ്യായം പതിനാറാം വാക്യം'}))
        ws.on_message(on_msg)
    pg.route_web_socket('wss://api.sarvam.ai/**', ws_handler)
    pg.goto('http://localhost:8778/index.html'); pg.wait_for_timeout(8000)
    pg.evaluate("""()=>{document.querySelector('[data-net=online]').click();}""")
    pg.evaluate("""()=>{const go=(id,v)=>{const e=document.getElementById(id); if(e.type==='checkbox'){e.checked=v} else e.value=v; e.dispatchEvent(new Event('change'));}; go('stSvKey','sk_test_1234567890');}""")
    pg.evaluate("""()=>{document.querySelector('.seg [data-lm=bible]').click();}""")
    pg.wait_for_timeout(500)
    if not pg.evaluate("document.body.innerText.includes('Stop listening')"): pg.click('#btnListen')
    pg.wait_for_timeout(9000)
    print('url', info['url']); print('msgs', info['msgs'])
    print('state', pg.evaluate("JSON.stringify({engine:LF_DEBUG.whisper().engine, refs:LF_DEBUG.state().heardRefs, screen:LF_DEBUG.state().screen.kind})"))
    print('ERR', errs); b.close()
finally: srv.terminate()
