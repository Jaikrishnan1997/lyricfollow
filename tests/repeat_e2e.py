import sys, time, subprocess, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8768','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
ch=json.load(open('/home/claude/lyricfollow/vendor/songs-church.json'))['songs']
AL=[s for s in ch if s['title'].startswith('அல்லேலூயா')][0]; TK=[s for s in ch if s['title'].startswith('துதி')][0]; EN=[s for s in ch if s['title'].startswith('எந்தன்')][0]
def lines(s, tamil=True): 
    import re
    ls=[l for l in s['lyrics'].split('\n') if l.strip()]
    return [l for l in ls if bool(re.search('[஀-௿]',l))==tamil]
try:
  with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers='block'); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8768/index.html'); pg.wait_for_timeout(10000)
    pg.evaluate("document.querySelector('[data-net=online]').click(); document.querySelector('.seg [data-lm=songs]').click()")
    pg.evaluate(f"LF_DEBUG.service({json.dumps([EN['title'],TK['title'],AL['title']],ensure_ascii=False)})")
    def sing(title, ls, interims=True, conf=.8):
        return pg.evaluate("""async ([title, ls, interims])=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));
          if (title) { LF_DEBUG.open(title); LF_DEBUG.mode('songs'); await wait(300); }
          const path=[]; const c0=LF_DEBUG.state().cues;
          for (const l of ls) {
            if (interims) { const w=l.split(' '); LF_DEBUG.feed(w.slice(0, Math.ceil(w.length/2)).join(' '), false); await wait(120); }
            LF_DEBUG.feed(l, true, .8); await wait(220);
            const st=LF_DEBUG.state(); path.push([st.song.slice(0,12), st.cur]);
          }
          return {path, cueDelta: LF_DEBUG.state().cues - c0};
        }""", [title, ls, interims])
    res={}
    a=sing(AL['title'], lines(AL)); songsSeen=set(x[0] for x in a['path']); curs=[x[1] for x in a['path']]
    res['alleluya']={'songs':list(songsSeen),'monotonic':all(curs[i]<=curs[i+1] for i in range(len(curs)-1)),'last':curs[-1],'n':len(curs),'cueDelta':a['cueDelta']}
    if not res['alleluya']['monotonic']: res['alleluya']['path']=curs
    t=sing(TK['title'], lines(TK)); curs=[x[1] for x in t['path']]
    res['thudhi']={'songs':list(set(x[0] for x in t['path'])),'monotonic':all(curs[i]<=curs[i+1] for i in range(len(curs)-1)),'last':curs[-1]}
    t=sing(TK['title'], lines(TK,False)); curs=[x[1] for x in t['path']]
    res['thudhi_tanglish']={'songs':list(set(x[0] for x in t['path'])),'monotonic':all(curs[i]<=curs[i+1] for i in range(len(curs)-1)),'path':curs}
    # genuine change of song: Alleluya -> Enthan Naavil (in service) must switch within 3 lines
    pg.evaluate(f"LF_DEBUG.open({json.dumps(AL['title'],ensure_ascii=False)})")
    sing(None, lines(AL)[:4])
    e=sing(None, lines(EN)[:6]); res['switch']=[x for x in e['path']]
    # chorus sung twice in a row (repeat) stays on the same/next chorus, no restart
    pg.evaluate(f"LF_DEBUG.open({json.dumps(AL['title'],ensure_ascii=False)})")
    r=sing(None, lines(AL)[:8]+lines(AL)[4:8]+lines(AL)[8:12]); res['chorusTwice']=[x[1] for x in r['path']]
    r=sing(None, lines(AL)[12:]); 
    # whole song sung again from the top (no tap): how fast does it come back?
    r=sing(None, lines(AL)[:6]); res['fromTopAgain']=[x[1] for x in r['path']]
    print(json.dumps(res,ensure_ascii=False,indent=0)); print('ERR', errs); b.close()
finally: srv.terminate()
