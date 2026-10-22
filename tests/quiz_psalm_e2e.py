# Psalm reading and the Bible quiz end to end (recogniser text fed directly, nothing sent anywhere).
# Psalm 23 read verse by verse in Malayalam: each verse moves one on; a repeated verse stays; one skipped verse
# moves only when it is clearly being read; talk moves nothing; "Psalm 91" changes the Psalm.
# Quiz: "who is the son of Abraham" (en/ta/ml) shows the question, then the answer; sermon talk shows nothing.
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); from lfpaths import ROOT, AUDIO, SCRATCH
import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
PORT = int(_os.environ.get('PORT', '8781'))
srv = subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d',ROOT[:-1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
fails = []
def check(name, got, want):
    ok = got == want; print(('ok  ' if ok else 'FAIL'), name.ljust(44), json.dumps(got, ensure_ascii=False), '' if ok else '(want %s)' % json.dumps(want, ensure_ascii=False))
    if not ok: fails.append(name)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
    ctx=b.new_context(service_workers='block', permissions=['microphone']); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:%d/index.html' % PORT); pg.wait_for_timeout(5000)
    scr = lambda: pg.evaluate("(()=>{const s=LF_DEBUG.state().screen; return s.kind==='bible'? s.bible.ch+':'+s.bible.v : s.kind})()")
    def say(t, wait=600): pg.evaluate("t=>LF_DEBUG.feed(t,true,.9)", t); pg.wait_for_timeout(wait)
    # ---- Psalm reading ----
    pg.evaluate("document.querySelector('[data-lm=psalm]').click()"); pg.wait_for_timeout(2500)
    pg.evaluate("LF_DEBUG.mode('bible'); LF_DEBUG.setLang('ml-IN')")
    check('psalm starts at 23:1', scr(), '23:1')
    V = pg.evaluate("[...Array(7)].map((_,i)=>LFBible.verse('mal1910',18,23,i+1))")
    halves = lambda t: [' '.join(t.split()[:len(t.split())//2]), ' '.join(t.split()[len(t.split())//2:])]
    for h in halves(V[0]): say(h)
    check('verse 1 read: stays 1', scr(), '23:1')
    for h in halves(V[1]): say(h)
    check('verse 2 read: 2', scr(), '23:2')
    for h in halves(V[1]): say(h)
    check('verse 2 read again: stays 2', scr(), '23:2')
    say('ആമേൻ ഹല്ലേലൂയ്യാ സ്തോത്രം', 400)
    check('talk: stays 2', scr(), '23:2')
    for h in halves(V[2]): say(h)
    check('verse 3: 3', scr(), '23:3')
    a, c = halves(V[4])     # verse 4 skipped
    say(a)
    check('verse 5 first half (4 skipped): not yet', scr(), '23:3')
    say(c)
    check('verse 5 second half: 5', scr(), '23:5')
    for h in halves(V[5]): say(h)
    check('verse 6: 6', scr(), '23:6')
    # three verses ahead, even heard twice, never moves
    pg.evaluate("LF_DEBUG.psalm(23, 1)"); pg.wait_for_timeout(800)
    for h in halves(V[3]) + halves(V[3]): say(h)
    check('3 verses ahead (twice): stays 1', scr(), '23:1')
    # Tamil congregation, recogniser drops some words
    pg.evaluate("LF_DEBUG.setLang('ta-IN'); LF_DEBUG.psalm(23, 1)"); pg.wait_for_timeout(800)
    T = pg.evaluate("[...Array(6)].map((_,i)=>LFBible.verse('tamov',18,23,i+1))")
    drop = lambda t: ' '.join(w for k, w in enumerate(t.split()) if k % 5 != 3)
    for i in range(6):
        for h in halves(drop(T[i])): say(h)
    check('Tamil, words dropped: verse by verse to 6', scr(), '23:6')
    pg.evaluate("LF_DEBUG.setLang('ml-IN')")
    say('സങ്കീർത്തനം 91', 2500)
    check('"Psalm 91": 91:1', scr(), '91:1')
    say('യോഹന്നാൻ 3:16', 1500)
    check('another book is ignored in Psalm mode', scr(), '91:1')
    # ---- quiz ----
    pg.evaluate("document.querySelector('[data-lm=bible]').click()"); pg.wait_for_timeout(500)
    pg.evaluate("LF_DEBUG.setLang('en-IN')"); pg.wait_for_timeout(500)
    check('quiz list loaded', pg.evaluate("LF_DEBUG.quiz().n") > 100, True)
    say('Brothers and sisters, who is the son of Abraham?', 800)
    check('quiz question up, answer waits', pg.evaluate("LF_DEBUG.quiz().screen"), {'a': 'Isaac', 'shown': False})
    pg.wait_for_timeout(4200)
    check('answer shown after 4 s', pg.evaluate("LF_DEBUG.quiz().screen"), {'a': 'Isaac', 'shown': True})
    check('projector text has the answer', 'യിസ്ഹാക്ക്' in pg.evaluate("document.getElementById('preview').innerText"), True)
    say('ஏசாயா ஐம்பத்து மூன்று', 300); say('யோவான் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்', 2500)
    check('a reference replaces the quiz', scr(), '3:16')
    say('இயேசுவைக் காட்டிக்கொடுத்த சீஷன் யார்', 800)
    check('Tamil question', pg.evaluate("LF_DEBUG.quiz().screen.a"), 'Judas Iscariot')
    say('യേശുവിനെ മൂന്നു പ്രാവശ്യം തള്ളിപ്പറഞ്ഞത് ആര്', 800)
    check('Malayalam question', pg.evaluate("LF_DEBUG.quiz().screen.a"), 'Peter')
    pg.evaluate("LF_DEBUG.close()"); say('യോഹന്നാൻ 3:16', 2500)
    for t in ['Abraham believed God and it was counted to him for righteousness', 'what a mighty God we serve', 'who is like our God, nobody', 'ஆபிரகாம் தேவனை விசுவாசித்தான்', 'how many of you are blessed today, praise the Lord']:
        say(t, 500)
    check('sermon talk: no quiz', scr(), '3:16')
    pg.evaluate("()=>{const e=document.getElementById('quizMode'); e.value='suggest'; e.dispatchEvent(new Event('change'))}")
    say('who killed Abel', 800)
    check('suggest mode: asked, screen unchanged', [pg.evaluate("LF_DEBUG.quiz().asked"), scr()], ['Cain', '3:16'])
    pg.evaluate("document.getElementById('btnQuizShow').click()"); pg.wait_for_timeout(300)
    check('Show: answer at once', pg.evaluate("LF_DEBUG.quiz().screen"), {'a': 'Cain', 'shown': True})
    print('ERR', errs); b.close()
finally: srv.terminate()
print('quiz_psalm_e2e:', 'all ok' if not fails else 'FAILED %s' % fails)
sys.exit(1 if fails else 0)
