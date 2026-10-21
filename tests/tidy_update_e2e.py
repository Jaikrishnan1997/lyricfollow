# Pack update to the tidied songs: a browser that has the old (untidy) packs gets the tidy text for every song it
# has not changed, keeps a song the user edited, shows slide labels, and tidies an own song with Undo.
import sys, time, subprocess, json, os
from playwright.sync_api import sync_playwright
OLD = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/75b7af5e-7062-5e5d-a087-c193c46c265e/scratchpad/vendor_before_tidy'
srv = subprocess.Popen([sys.executable,'-m','http.server','8780','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
phase = {'old': True}
def vendor(route):
    name = route.request.url.split('/vendor/')[1].split('?')[0]
    path = os.path.join(OLD if phase['old'] else '/home/claude/lyricfollow/vendor', name)
    if not os.path.exists(path): route.continue_(); return
    route.fulfill(status=200, content_type='application/json', body=open(path,'rb').read())
try:
  with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers='block'); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/vendor/**', vendor)
    pg.goto('http://localhost:8780/index.html'); pg.wait_for_timeout(9000)
    n0 = pg.evaluate("LFStore.all('songs').then(a=>a.length)")
    # the user edits one pack song
    pg.evaluate("""async()=>{const a=await LFStore.all('songs'); const s=a.find(x=>x.title.startsWith('அந்த நாள் வந்திடும்')); s.lyrics='MY OWN EDIT\\n'+s.lyrics; s.updated=Date.now(); await LFStore.put('songs', s); return s.id;}""")
    old_ex = pg.evaluate("LFStore.all('songs').then(a=>a.find(x=>x.title.startsWith('ஆவியானவரே')).lyrics.slice(0,60))")
    phase['old'] = False
    pg.reload(); pg.wait_for_timeout(12000)
    a = pg.evaluate("""LFStore.all('songs').then(a=>({n:a.length,
      avi:(a.find(x=>x.title.startsWith('ஆவியானவரே'))||{}).lyrics, aviParts:(a.find(x=>x.title.startsWith('ஆவியானவரே'))||{}).parts,
      edited:(a.find(x=>(x.lyrics||'').startsWith('MY OWN EDIT'))||{}).title,
      en:(a.find(x=>x.title.startsWith('All Praise to Him Who'))||{}).lyrics}))""")
    print('songs before/after', n0, a['n'])
    print('untouched song updated:', old_ex.replace('\n',' / ')[:50], '=>', (a['avi'] or '')[:80].replace('\n',' / '), '| parts', a['aviParts'])
    print('edited song kept:', a['edited'])
    print('English hymn slides:', len((a['en'] or '').split('\n\n')))
    # slide labels on the Live tab
    pg.evaluate("LF_DEBUG.open('ஆவியானவரே', false)"); pg.wait_for_timeout(800)
    print('slide labels:', pg.evaluate("[...document.querySelectorAll('#slides .slide .n span:first-child')].slice(0,4).map(x=>x.textContent)"))
    # own song tidy + undo
    pg.evaluate("""async()=>{await LF_DEBUG.addSong('Test own song','ta-IN','பல்லவி\\nஇயேசு நல்லவர்\\nஎன்றும் நல்லவர்\\n\\nசரணங்கள்\\n1. அவர் அன்பு பெரியது\\nஅவர் கிருபை பெரியது - இயேசு\\n\\n2. அவர் வார்த்தை உண்மை\\nஅவர் வழி செம்மை - இயேசு\\n\\nMusic##')}"""); pg.wait_for_timeout(800)
    pg.click('[data-tab=songs]') if pg.query_selector('[data-tab=songs]') else None
    pg.evaluate("document.getElementById('btnTidyAll').click()"); pg.wait_for_timeout(1500)
    t1 = pg.evaluate("LFStore.all('songs').then(a=>a.find(x=>x.title==='Test own song'))")
    print('own song tidied:', t1['lyrics'].replace('\n',' / '), '| parts', t1['parts'])
    pg.evaluate("document.getElementById('btnTidyUndo').click()"); pg.wait_for_timeout(1200)
    t2 = pg.evaluate("LFStore.all('songs').then(a=>a.find(x=>x.title==='Test own song').lyrics)")
    print('undo restores original:', t2.startswith('பல்லவி'))
    print('ERR', errs); b.close()
finally: srv.terminate()
