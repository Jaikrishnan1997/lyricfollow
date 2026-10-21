// node tests/library_live_replay.js live_lib_thudhi.json live_alleluya_sarvam.json
// Replay live Sarvam clips: service = user's 4 songs, Alleluya open; does the library find Thudhi Kanam? does Alleluya-only replay stay?
const R='/home/claude/lyricfollow/';const Core=require(R+'js/core.js');
const all=['songs-ta-fgs','songs-church','songs-ml-wikisource','songs-en-wikisource'].flatMap(f=>require(R+'vendor/'+f+'.json').songs);
function parse(text){const blocks=text.replace(/\r/g,'').split(/\n\s*\n/).map(b=>b.split('\n').map(l=>l.trim()).filter(Boolean)).filter(b=>b.length);const ls=[];blocks.forEach((b,si)=>b.forEach(x=>ls.push({text:x,slide:si})));
 const indic=t=>/[ऀ-෿]/.test(t),latin=t=>/[a-z]/i.test(t)&&!indic(t);for(let i=1;i<ls.length;i++){const a=ls[i-1],b=ls[i];if(a.slide===b.slide&&!a.alt&&(indic(a.text)&&latin(b.text)||latin(a.text)&&indic(b.text)))(indic(a.text)?b:a).alt=true;}
 Core.prepare(ls.map(l=>l.text)).forEach((p,i)=>Object.assign(ls[i],p));return ls;}
const list=all.map((s,i)=>({id:i,title:s.title,grp:(l=>Core.key(l?l.text:s.title).slice(0,40))(parse(s.lyrics).find(l=>!l.alt)),lines:parse(s.lyrics)}));
const L=Core.libIndex(list);
const find=t=>list.findIndex(s=>s.title.startsWith(t));
const SVC=[find('அல்லேலூயா கர்த்தரையே ஏகமாய்'),find('எந்தன் நாவில் புது'),find('அழகாய் நிற்கும்'),find('அழைத்தீரே')];
console.log('svc', SVC.map(i=>list[i].title.slice(0,20)));
for (const f of process.argv.slice(2)) {
 let svc=SVC.slice(); const mk=()=>Core.trackIndex(svc.map(i=>({id:i,lines:list[i].lines})),L); let T=mk();
 const st={song:SVC[0],cur:7},lst={};let out='';
 for(const [t,txt] of require(R+'tests/'+f)){const now=t*1000;const r=Core.trackStep(T,st,txt,now);
  let lr=null;
  if(st.words>=2&&!(r&&r.why==='song')&&st.mineTop<.9&&st.otherTop<.9){const skip=new Set(svc);const ev=Math.max(0,...Object.values(st.ev||{}));lr=Core.libStep(L,lst,txt,skip,now,Math.max(st.mineTop,st.otherTop),ev);
   console.log(String(t).padEnd(6),txt.slice(0,34).padEnd(34),'mine',st.mineTop.toFixed(2),'oth',st.otherTop.toFixed(2),'n',lst.libTop&&lst.libTop.n,'ev',ev.toFixed(2),'| lib',lst.libTop?list[lst.libTop.id].title.slice(0,16)+' '+lst.libTop.s.toFixed(2):'', JSON.stringify(lst.libLev), lr?'FOUND '+list[lr.song].title.slice(0,20):'');}
  if(lr){if(!svc.includes(lr.song)){svc.push(lr.song);T=mk();}st.song=lr.song;st.cur=lr.line;st.ev={};Object.keys(lst).forEach(k=>delete lst[k]);out+=` [${t}: LIB ${list[lr.song].title.slice(0,18)}]`;continue;}
  if(r){if(r.song!==st.song)out+=` [${t}: SW ${list[r.song].title.slice(0,18)}]`;st.song=r.song;st.cur=r.line;}
 }
 console.log(f,'=>',out||'(no switch)');
}
