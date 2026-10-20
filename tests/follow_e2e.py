import sys, time, subprocess
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8768','-d','/home/claude/lyricfollow'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8768/index.html'); pg.wait_for_timeout(2000)
    r=pg.evaluate("""(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms)); const out={}; document.querySelector('[data-net=online]').click();
      document.querySelector('.seg [data-lm=bible]').click(); LF_DEBUG.mode('bible'); const cb=document.getElementById('vbAuto2'); if(!cb.checked) cb.click(); await wait(2500);
      LF_DEBUG.setLang('en-IN'); S0=()=>{const b=LF_DEBUG.state().screen.bible; return b?b.book+' '+b.ch+':'+b.v+(b.ve>b.v?'-'+b.ve:''):null};
      const say=async(txt,c)=>{ LF_DEBUG.feed(txt,true,c||0.8); await wait(250); return S0(); };
      const words=(t)=>t.split(' ');
      // read in ~5-word finals, like the recogniser delivers them
      const read=async(t)=>{ const w=words(t); const path=[]; for(let i=0;i<w.length;i+=5){ path.push(await say(w.slice(i,i+5).join(' '))); } return path; };
      out.ref = await say('turn to John chapter 3 verse 16');
      out.r16 = await read('For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.');
      out.r17 = await read('For God sent not his Son into the world to condemn the world; but that the world through him might be saved.');
      out.r18 = await read('He that believeth on him is not condemned: but he that believeth not is condemned already');
      out.chatter = await read('and you know brothers and sisters this is the love of our father who cares for every one of us today');
      // Malayalam reading (Malayalam recogniser output), Psalm 23
      LF_DEBUG.setLang('ml-IN');
      out.mlref = await say('സങ്കീർത്തനം 23 ആം അദ്ധ്യായം 1 ആം വാക്യം');
      out.ml1 = await read('യഹോവ എന്റെ ഇടയനാകുന്നു എനിക്കു മുട്ടുണ്ടാകയില്ല');
      out.ml2 = await read('പച്ചയായ പുല്പുറങ്ങളിൽ അവൻ എന്നെ കിടത്തുന്നു സ്വസ്ഥതയുള്ള വെള്ളത്തിന്നരികത്തേക്കു എന്നെ നടത്തുന്നു');
      out.ml3 = await read('എന്റെ പ്രാണനെ അവൻ തണുപ്പിക്കുന്നു');
      // Tamil, Psalm 23 too
      LF_DEBUG.setLang('ta-IN');
      out.taref = await say('சங்கீதம் 23 ஆம் அதிகாரம் 1 ஆம் வசனம்');
      out.ta2 = await read('அவர் என்னைப் புல்லுள்ள இடங்களில் மேய்த்து, அமர்ந்த தண்ணீர்களண்டையில் என்னைக் கொண்டுபோய் விடுகிறார்');
      // Sermon plan: a badly heard book still lands on the planned passage; chapter-only completes
      LF_DEBUG.setLang('en-IN');
      document.getElementById('planInput').value='Habakkuk 3; Romans 8:28'; document.getElementById('planInput').dispatchEvent(new Event('input'));
      out.planChips = Array.from(document.querySelectorAll('#planChips button')).map(b=>b.textContent);
      out.planFuzzy = await say('Habbakook 3 17',0.6);
      out.planCh = await say('Romance chapter 8 verse 28',0.6);
      out.planPartial = await say('the third chapter verse 18',0.6);
      // Unsure ask bar
      document.getElementById('planInput').value=''; document.getElementById('planInput').dispatchEvent(new Event('input'));
      LF_DEBUG.feed('Mark 4 9',true,0.3); await wait(300); out.askShown = !document.getElementById('refAsk').hidden; out.asked = LF_DEBUG.state().asked; out.beforeEnter=S0();
      document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await wait(300); out.afterEnter=S0(); out.askHidden=document.getElementById('refAsk').hidden;
      // speed
      const t0=performance.now(); for(let i=0;i<200;i++) LF_DEBUG.feed('the lord is my shepherd i shall not want',i%3==0,0.8); out.ms200=Math.round(performance.now()-t0);
      return out;})()""")
    import json; print(json.dumps(r, ensure_ascii=False, indent=0)); print('ERR', errs); b.close()
finally: srv.terminate()
